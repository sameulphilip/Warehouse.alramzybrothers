const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const sharp = require('sharp');
const { createStore } = require('../catalog/store');
const { createCatalogRouter } = require('../catalog/routes');

async function start(overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cat-routes-'));
  const store = overrides.store || createStore(path.join(dir, 'catalog.json'));
  const mediaDir = path.join(dir, 'media');
  const records = [];
  const app = express();
  app.use(express.json());
  app.use(createCatalogRouter({
    store,
    mediaDir,
    publisher: { publish: async () => ({ buildId: 'b', products: 1, pages: 9, publishedAt: '2026-11-04T10:00:00.000Z' }) },
    loadProducts: overrides.loadProducts || (async (ids) => new Map(ids.filter((id) => id === 7212).map((id) => [id, { name: 'انبوبه', code: '70.3' }]))),
    requireCatalog: (req, res, next) => (req.get('x-deny') ? res.status(403).json({ error: 'ممنوع' }) : next()),
    actorName: () => 'سامح',
    record: (req, entry) => records.push(entry),
    siteUrl: 'https://catalog.test'
  }));
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, url, body, headers = {}) => {
    const isJson = body !== undefined && !Buffer.isBuffer(body);
    const res = await fetch(base + url, {
      method,
      headers: { ...(isJson ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: isJson ? JSON.stringify(body) : body
    });
    const type = res.headers.get('content-type') || '';
    return { status: res.status, body: type.includes('json') ? await res.json() : await res.arrayBuffer() };
  };
  return { dir, store, mediaDir, records, server, call };
}

const png = () => sharp({ create: { width: 64, height: 64, channels: 3, background: '#c4161c' } }).png().toBuffer();

test('catalog routes save items, images, lists, company and publish', async (t) => {
  const s = await start();
  t.after(() => s.server.close());

  let r = await s.call('GET', '/api/catalog/items/7212');
  assert.equal(r.status, 200);
  assert.equal(r.body.saved, false);
  assert.equal(r.body.product.name, 'انبوبه');

  r = await s.call('PUT', '/api/catalog/items/999', { nameAr: 'x' });
  assert.equal(r.status, 400);

  r = await s.call('PUT', '/api/catalog/taxonomy/brands', { list: [{ nameAr: 'أكتروس', nameEn: 'Actros' }] });
  assert.equal(r.status, 200);
  const brandId = r.body.list[0].id;

  r = await s.call('PUT', '/api/catalog/items/7212', { nameAr: 'انبوبه سليكون', brandId, published: true, showPartNumber: true });
  assert.equal(r.status, 200);
  assert.equal(r.body.item.brandId, brandId);
  assert.equal(s.records.at(-1).action, 'catalog');

  r = await s.call('POST', '/api/catalog/items/7212/images', await png(), { 'Content-Type': 'image/png' });
  assert.equal(r.status, 200);
  const first = r.body.item.images[0];
  assert.equal(fs.existsSync(path.join(s.mediaDir, `${first}-lg.webp`)), true);
  r = await s.call('POST', '/api/catalog/items/7212/images', await png(), { 'Content-Type': 'image/png' });
  const second = r.body.item.images[1];

  r = await s.call('PUT', '/api/catalog/items/7212', { ...r.body.item, images: [second, first] });
  assert.deepEqual(r.body.item.images, [second, first]);

  r = await s.call('GET', `/api/catalog/media/${first}-sm.webp`);
  assert.equal(r.status, 200);
  r = await s.call('GET', '/api/catalog/media/..%2Fcatalog.json');
  assert.equal(r.status, 404);

  r = await s.call('DELETE', `/api/catalog/items/7212/images/${first}`);
  assert.deepEqual(r.body.item.images, [second]);
  assert.equal(fs.existsSync(path.join(s.mediaDir, `${first}-lg.webp`)), false);

  r = await s.call('PUT', '/api/catalog/company', { whatsapp: '01001234567', aboutAr: 'نبذة' });
  assert.equal(r.body.company.whatsapp, '201001234567');
  r = await s.call('POST', '/api/catalog/company/logo', await png(), { 'Content-Type': 'image/png' });
  assert.match(r.body.company.logoId, /^[a-f0-9]{16}$/);

  r = await s.call('GET', '/api/catalog');
  assert.equal(r.body.items.length, 1);
  assert.equal(r.body.items[0].name, 'انبوبه سليكون');
  assert.equal(r.body.siteUrl, 'https://catalog.test');

  r = await s.call('POST', '/api/catalog/publish');
  assert.equal(r.status, 200);
  assert.equal(r.body.pages, 9);

  r = await s.call('DELETE', '/api/catalog/items/7212');
  assert.equal(r.status, 200);
  assert.equal(fs.existsSync(path.join(s.mediaDir, `${second}-lg.webp`)), false);
  assert.deepEqual(s.store.load().items, {});
});

test('catalog routes enforce the image limit, image type and permission', async (t) => {
  const s = await start();
  t.after(() => s.server.close());
  await s.call('PUT', '/api/catalog/items/7212', { nameAr: 'x' });
  for (let i = 0; i < 5; i += 1) {
    const ok = await s.call('POST', '/api/catalog/items/7212/images', await png(), { 'Content-Type': 'image/png' });
    assert.equal(ok.status, 200);
  }
  let r = await s.call('POST', '/api/catalog/items/7212/images', await png(), { 'Content-Type': 'image/png' });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /5/);
  r = await s.call('POST', '/api/catalog/items/7212/images', Buffer.from('GIF89a'), { 'Content-Type': 'image/gif' });
  assert.equal(r.status, 400);
  r = await s.call('GET', '/api/catalog', undefined, { 'x-deny': '1' });
  assert.equal(r.status, 403);
});

test('unexpected errors return a generic Arabic 500', async (t) => {
  const prevError = console.error;
  console.error = () => {};
  t.after(() => { console.error = prevError; });

  const s = await start({
    loadProducts: async () => { throw new Error('Connection lost to SQL server'); }
  });
  t.after(() => s.server.close());

  let r = await s.call('GET', '/api/catalog/items/7212');
  assert.equal(r.status, 500);
  assert.equal(r.body.error, 'تعذر تنفيذ الطلب');
  assert.doesNotMatch(JSON.stringify(r.body), /SQL/i);

  r = await s.call('PUT', '/api/catalog/taxonomy/colors', { list: [] });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /نوع/);
});

test('a failed logo save removes the uploaded image', async (t) => {
  const prevError = console.error;
  console.error = () => {};
  t.after(() => { console.error = prevError; });

  const baseStore = createStore(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cat-logo-')), 'catalog.json'));
  let failNextUpdate = false;
  const store = {
    load: (...args) => baseStore.load(...args),
    update(fn) {
      if (failNextUpdate) {
        failNextUpdate = false;
        throw new Error('disk full');
      }
      return baseStore.update(fn);
    }
  };
  const s = await start({ store });
  t.after(() => s.server.close());

  failNextUpdate = true;
  const r = await s.call('POST', '/api/catalog/company/logo', await png(), { 'Content-Type': 'image/png' });
  assert.equal(r.status, 500);
  assert.equal(r.body.error, 'تعذر تنفيذ الطلب');
  const webps = fs.existsSync(s.mediaDir)
    ? fs.readdirSync(s.mediaDir).filter((file) => file.endsWith('.webp'))
    : [];
  assert.equal(webps.length, 0);
});
