const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  createStore, emptyCatalog, defaultItem, cleanItem, cleanTaxonomy, cleanCompany, normalizeWhatsapp
} = require('../catalog/store');

function tempFile() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cat-store-')), 'catalog.json');
}

test('load returns an empty catalog when the file is missing', () => {
  assert.deepEqual(createStore(tempFile()).load(), emptyCatalog());
});

test('update persists changes and leaves no temp file', () => {
  const file = tempFile();
  createStore(file).update((data) => { data.company.phone = '0100'; });
  assert.equal(createStore(file).load().company.phone, '0100');
  assert.equal(fs.existsSync(`${file}.tmp`), false);
});

test('cleanItem keeps known fields, trims text and records the editor', () => {
  const catalog = emptyCatalog();
  catalog.brands.push({ id: 'b1', nameAr: 'أكتروس', nameEn: 'Actros', order: 0 });
  const item = cleanItem(catalog, 7212, {
    nameAr: '  انبوبه  ', brandId: 'b1', published: true, price: 99, showAvailability: false
  }, 'سامح', new Date('2026-11-04T10:00:00Z'));
  assert.equal(item.productId, 7212);
  assert.equal(item.nameAr, 'انبوبه');
  assert.equal(item.brandId, 'b1');
  assert.equal(item.published, true);
  assert.equal(item.showAvailability, false);
  assert.equal('price' in item, false);
  assert.equal(item.updatedBy, 'سامح');
  assert.equal(item.updatedAt, '2026-11-04T10:00:00.000Z');
});

test('cleanItem rejects an unknown brand or section and a bad product id', () => {
  const catalog = emptyCatalog();
  assert.throws(() => cleanItem(catalog, 1, { brandId: 'x' }, 'a'), /الماركة/);
  assert.throws(() => cleanItem(catalog, 1, { sectionId: 'x' }, 'a'), /القسم/);
  assert.throws(() => cleanItem(catalog, 'abc', {}, 'a'), /رقم الصنف/);
});

test('cleanItem only accepts a reorder of the existing images', () => {
  const catalog = emptyCatalog();
  catalog.items['5'] = { ...defaultItem(5), images: ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb'] };
  const item = cleanItem(catalog, 5, { images: ['bbbbbbbbbbbbbbbb', 'aaaaaaaaaaaaaaaa'] }, 'a');
  assert.deepEqual(item.images, ['bbbbbbbbbbbbbbbb', 'aaaaaaaaaaaaaaaa']);
  assert.throws(() => cleanItem(catalog, 5, { images: ['cccccccccccccccc'] }, 'a'), /الصور/);
  assert.deepEqual(cleanItem(catalog, 5, {}, 'a').images, ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb']);
});

test('cleanTaxonomy assigns safe ids, keeps order and blocks removing a used entry', () => {
  const catalog = emptyCatalog();
  const list = cleanTaxonomy(catalog, 'brands', [{ nameAr: 'فولفو', nameEn: 'Volvo' }, { id: '../x', nameAr: 'مان' }]);
  assert.equal(list.length, 2);
  assert.match(list[0].id, /^[a-z0-9]{12}$/);
  assert.match(list[1].id, /^[a-z0-9]{12}$/);
  assert.deepEqual(list.map((x) => x.order), [0, 1]);
  catalog.brands = list;
  catalog.items['9'] = { ...defaultItem(9), brandId: list[0].id };
  assert.throws(() => cleanTaxonomy(catalog, 'brands', [list[1]]), /مستخدم/);
  assert.throws(() => cleanTaxonomy(catalog, 'brands', [{ nameAr: '' }]), /الاسم/);
  assert.throws(() => cleanTaxonomy(catalog, 'colors', []), /نوع/);
});

test('normalizeWhatsapp converts local Egyptian numbers to international digits', () => {
  assert.equal(normalizeWhatsapp('0100 123 4567'), '201001234567');
  assert.equal(normalizeWhatsapp('+20 100 123 4567'), '201001234567');
  assert.equal(normalizeWhatsapp('00201001234567'), '201001234567');
  assert.equal(normalizeWhatsapp(''), '');
  assert.throws(() => normalizeWhatsapp('123'), /الواتساب/);
});

test('cleanCompany keeps the logo id and normalizes the WhatsApp number', () => {
  const company = cleanCompany({ logoId: 'abcdabcdabcdabcd' }, { whatsapp: '01001234567', aboutAr: ' نبذة ', logoId: 'hack' });
  assert.equal(company.logoId, 'abcdabcdabcdabcd');
  assert.equal(company.whatsapp, '201001234567');
  assert.equal(company.aboutAr, 'نبذة');
});
