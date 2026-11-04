const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildSite, swapInto } = require('../catalog/build');
const { emptyCatalog, defaultItem } = require('../catalog/store');

const LOGO = path.join(__dirname, '..', 'public', 'logo.png');

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cat-build-'));
  const mediaDir = path.join(root, 'media');
  fs.mkdirSync(mediaDir);
  for (const id of ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb', 'cccccccccccccccc']) {
    fs.writeFileSync(path.join(mediaDir, `${id}-lg.webp`), 'lg');
    fs.writeFileSync(path.join(mediaDir, `${id}-sm.webp`), 'sm');
  }
  const catalog = emptyCatalog();
  catalog.company.whatsapp = '201001234567';
  catalog.brands = [{ id: 'b1', nameAr: 'أكتروس', nameEn: 'Actros', order: 0 }];
  catalog.sections = [{ id: 's1', nameAr: 'تبريد', nameEn: 'Cooling', order: 0 }];
  catalog.items['1'] = { ...defaultItem(1), published: true, nameAr: 'مروحة', images: ['aaaaaaaaaaaaaaaa'], brandId: 'b1', sectionId: 's1', partNumber: 'PN-VISIBLE' };
  catalog.items['2'] = { ...defaultItem(2), published: true, nameEn: 'Pump EN', images: ['bbbbbbbbbbbbbbbb'], sectionId: 's1', partNumber: 'SECRET-PN', showPartNumber: false, showAvailability: false, originAr: 'سري', showOrigin: false };
  catalog.items['3'] = { ...defaultItem(3), published: false, nameAr: 'مخفي', images: ['cccccccccccccccc'] };
  const products = new Map([[1, { name: 'اسم برنامج 1', code: 'C1', salePrice: 98765 }], [2, { name: 'طلمبة', code: 'C2' }], [3, { name: 'x', code: 'C3' }]]);
  const availability = new Map([[1, true], [2, false], [3, true]]);
  const siteDir = path.join(root, 'site');
  return { root, mediaDir, siteDir, catalog, products, availability };
}

function allFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? allFiles(full) : [full];
  });
}

test('buildSite writes pages for published products in both languages', async () => {
  const s = setup();
  const result = await buildSite({ ...s, baseUrl: 'https://c.test', logoFallback: LOGO });
  assert.equal(result.products, 2);
  for (const rel of ['index.html', '404.html', 'robots.txt', 'sitemap.xml', 'ar/index.html', 'en/index.html',
    'ar/products/index.html', 'ar/p/1/index.html', 'en/p/2/index.html', 'ar/brand/b1/index.html', 'en/section/s1/index.html',
    'assets/catalog.css', 'assets/catalog.js', 'assets/logo.png', 'media/aaaaaaaaaaaaaaaa-lg.webp', 'media/bbbbbbbbbbbbbbbb-sm.webp']) {
    assert.equal(fs.existsSync(path.join(s.siteDir, rel)), true, rel);
  }
  assert.equal(fs.existsSync(path.join(s.siteDir, 'ar/p/3/index.html')), false);
  assert.equal(fs.existsSync(path.join(s.siteDir, 'media/cccccccccccccccc-lg.webp')), false);
  assert.match(fs.readFileSync(path.join(s.siteDir, 'en/p/2/index.html'), 'utf8'), /Pump EN/);
  assert.match(fs.readFileSync(path.join(s.siteDir, 'en/p/1/index.html'), 'utf8'), /مروحة/);
  assert.match(fs.readFileSync(path.join(s.siteDir, 'sitemap.xml'), 'utf8'), /https:\/\/c\.test\/en\/p\/2\//);
});

test('no generated file leaks hidden fields, unpublished products or prices', async () => {
  const s = setup();
  await buildSite({ ...s, baseUrl: 'https://c.test', logoFallback: LOGO });
  const text = allFiles(s.siteDir).filter((f) => /\.(html|xml|txt|js|css)$/.test(f)).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  assert.doesNotMatch(text, /SECRET-PN/);
  assert.doesNotMatch(text, /سري/);
  assert.doesNotMatch(text, /مخفي/);
  assert.doesNotMatch(text, /98765/);
  assert.match(text, /PN-VISIBLE/);
  const pump = fs.readFileSync(path.join(s.siteDir, 'ar/p/2/index.html'), 'utf8');
  const info = pump.slice(pump.indexOf('<div class="info">'), pump.indexOf('<div class="actions">'));
  assert.ok(info.length > 0);
  assert.doesNotMatch(info, /class="badge/);
  assert.match(pump, /class="card" href="\/ar\/p\/1\/"/);
  const afterActions = pump.slice(pump.indexOf('<div class="actions">'));
  assert.match(afterActions, /class="badge in"/);
});

test('rebuilding replaces the old site and leaves no temporary folders', async () => {
  const s = setup();
  await buildSite({ ...s, baseUrl: 'https://c.test', logoFallback: LOGO, now: new Date('2026-11-04T10:00:00Z') });
  fs.writeFileSync(path.join(s.siteDir, 'stale.txt'), 'old');
  s.catalog.items['1'].published = false;
  await buildSite({ ...s, baseUrl: 'https://c.test', logoFallback: LOGO, now: new Date('2026-11-04T10:05:00Z') });
  assert.equal(fs.existsSync(path.join(s.siteDir, 'stale.txt')), false);
  assert.equal(fs.existsSync(path.join(s.siteDir, 'ar/p/1/index.html')), false);
  assert.deepEqual(fs.readdirSync(s.root).sort(), ['media', 'site']);
});

test('a failed swap keeps the old site', async () => {
  const s = setup();
  await buildSite({ ...s, baseUrl: 'https://c.test', logoFallback: LOGO });
  fs.writeFileSync(path.join(s.siteDir, 'marker.txt'), 'keep');
  const tempDir = fs.mkdtempSync(path.join(s.root, 'swap-temp-'));
  const fakeRename = (from, to) => {
    if (from === tempDir) throw new Error('swap failed');
    fs.renameSync(from, to);
  };
  assert.throws(() => swapInto(tempDir, s.siteDir, fakeRename), /swap failed/);
  assert.equal(fs.readFileSync(path.join(s.siteDir, 'marker.txt'), 'utf8'), 'keep');
  assert.deepEqual(
    fs.readdirSync(s.root).filter((name) => name.startsWith('site.old')),
    []
  );
});

test('unsafe ids from persisted data are ignored', async () => {
  const s = setup();
  s.catalog.brands.push({ id: '../evil', nameAr: 'evil', nameEn: 'evil', order: 99 });
  s.catalog.items['1'].brandId = '../evil';
  s.catalog.items['1'].images = ['../../x', 'aaaaaaaaaaaaaaaa'];
  s.catalog.items['1/../2'] = {
    ...defaultItem('1/../2'),
    published: true,
    nameAr: 'path traversal',
    images: ['aaaaaaaaaaaaaaaa'],
    brandId: 'b1',
    sectionId: 's1'
  };
  await buildSite({ ...s, baseUrl: 'https://c.test', logoFallback: LOGO });
  assert.deepEqual(fs.readdirSync(s.root).sort(), ['media', 'site']);
  const siteFiles = allFiles(s.siteDir);
  assert.ok(!siteFiles.some((f) => f.includes('evil')));
  const html = siteFiles.filter((f) => f.endsWith('.html')).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  assert.doesNotMatch(html, /brand\/\.\./);
  assert.doesNotMatch(html, /evil/);
  assert.equal(fs.existsSync(path.join(s.siteDir, 'ar/p/1/index.html')), true);
  assert.equal(fs.existsSync(path.join(s.siteDir, 'ar/p/2/index.html')), true);
  assert.deepEqual(fs.readdirSync(path.join(s.siteDir, 'ar/p')).sort(), ['1', '2']);
  assert.match(fs.readFileSync(path.join(s.siteDir, 'ar/p/1/index.html'), 'utf8'), /مروحة/);
});
