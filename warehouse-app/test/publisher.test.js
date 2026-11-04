const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createStore, defaultItem } = require('../catalog/store');
const { createPublisher } = require('../catalog/publisher');

function setup(availability) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cat-pub-'));
  const store = createStore(path.join(dir, 'catalog.json'));
  store.update((data) => {
    data.items['1'] = { ...defaultItem(1), published: true, nameAr: 'منشور' };
    data.items['2'] = { ...defaultItem(2), published: false };
  });
  const builds = [];
  const state = { availability: new Map(availability) };
  const publisher = createPublisher({
    store,
    snapshotFile: path.join(dir, 'catalog-published.json'),
    mediaDir: dir, siteDir: path.join(dir, 'site'), baseUrl: 'https://c.test', logoFallback: 'logo.png',
    loadProducts: async (ids) => new Map(ids.map((id) => [id, { name: `p${id}`, code: '' }])),
    loadAvailability: async (ids) => new Map(ids.map((id) => [id, Boolean(state.availability.get(id))])),
    build: async (args) => { builds.push(args); return { buildId: 'x', products: 1, pages: 3 }; }
  });
  return { dir, store, builds, state, publisher };
}

test('publish builds only published ids and records the publish time', async () => {
  const s = setup([[1, true]]);
  const result = await s.publisher.publish();
  assert.equal(s.builds.length, 1);
  assert.deepEqual([...s.builds[0].products.keys()], [1]);
  assert.ok(result.publishedAt);
  assert.equal(s.store.load().publishedAt, result.publishedAt);
  assert.equal(JSON.parse(fs.readFileSync(path.join(s.dir, 'catalog-published.json'), 'utf8')).items['1'].nameAr, 'منشور');
});

test('concurrent publish calls share one build', async () => {
  const s = setup([[1, true]]);
  await Promise.all([s.publisher.publish(), s.publisher.publish()]);
  assert.equal(s.builds.length, 1);
});

test('refreshAvailability rebuilds from the snapshot only when stock changes', async () => {
  const s = setup([[1, true]]);
  assert.equal(await s.publisher.refreshAvailability(), false);
  await s.publisher.publish();
  s.store.update((data) => { data.items['1'].nameAr = 'تعديل غير منشور'; });
  assert.equal(await s.publisher.refreshAvailability(), false);
  s.state.availability.set(1, false);
  assert.equal(await s.publisher.refreshAvailability(), true);
  assert.equal(s.builds.length, 2);
  assert.equal(s.builds[1].catalog.items['1'].nameAr, 'منشور');
  assert.equal(s.builds[1].availability.get(1), false);
});

test('a failed publish stores the error and rethrows', async () => {
  const s = setup([[1, true]]);
  const failing = createPublisher({
    store: s.store, snapshotFile: path.join(s.dir, 'snap.json'), mediaDir: s.dir, siteDir: s.dir, baseUrl: '', logoFallback: '',
    loadProducts: async () => new Map(), loadAvailability: async () => new Map(),
    build: async () => { throw new Error('boom'); }
  });
  await assert.rejects(failing.publish(), /boom/);
  assert.equal(s.store.load().lastError, 'boom');
});
