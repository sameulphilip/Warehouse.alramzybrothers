const test = require('node:test');
const assert = require('node:assert/strict');
const client = require('../catalog/assets/catalog.js');

test('normalize folds Arabic letter variants and spacing', () => {
  assert.equal(client.normalize('  أنبوبة   إكتروس '), 'انبوبه اكتروس');
  assert.equal(client.normalize('ABC'), 'abc');
});

test('matches filters by text, part number, brand and section', () => {
  const entry = { name: 'مروحة أكتروس', part: '51.06630-0193', brand: 'b1', section: 's1' };
  assert.equal(client.matches(entry, { q: 'مروحه' }), true);
  assert.equal(client.matches(entry, { q: '5106630' }), true);
  assert.equal(client.matches(entry, { q: 'فولفو' }), false);
  assert.equal(client.matches(entry, { brand: 'b2' }), false);
  assert.equal(client.matches(entry, { section: 's1', q: '' }), true);
});

test('productMessage includes the part number only when present', () => {
  assert.equal(
    client.productMessage({ name: 'مروحة', part: 'X1' }, 'ar', 'https://c/ar/p/1/'),
    'السلام عليكم، عايز أسأل عن: مروحة (رقم القطعة: X1)\nhttps://c/ar/p/1/'
  );
  assert.equal(
    client.productMessage({ name: 'Fan', part: '' }, 'en', 'https://c/en/p/1/'),
    'Hello, I would like to ask about: Fan\nhttps://c/en/p/1/'
  );
});

test('requestMessage lists every item with quantity', () => {
  const text = client.requestMessage([{ name: 'أ', part: 'P1', qty: 2 }, { name: 'ب', part: '', qty: 1 }], 'ar');
  assert.equal(text, 'السلام عليكم، عايز أسأل عن الأصناف دي:\n1) أ — رقم القطعة: P1 — الكمية: 2\n2) ب — الكمية: 1');
});

test('waLink encodes the message', () => {
  assert.equal(client.waLink('201001234567', 'a b\nc'), 'https://wa.me/201001234567?text=a%20b%0Ac');
});

test('sanitizeList keeps only well-formed request entries', () => {
  assert.deepEqual(client.sanitizeList(null), []);
  assert.deepEqual(client.sanitizeList('x'), []);
  const malicious = client.sanitizeList([
    { id: 'a', name: 'n', part: 'p', qty: '"><img src=x onerror=alert(1)>' },
  ]);
  assert.equal(malicious[0].qty, 1);
  const highQty = client.sanitizeList([{ id: 'b', name: 'n', part: '', qty: 5000 }]);
  assert.equal(highQty[0].qty, 999);
  assert.deepEqual(client.sanitizeList([{ name: 'no id', qty: 1 }]), []);
  const numericId = client.sanitizeList([{ id: 7, name: 'seven', part: '', qty: 2 }]);
  assert.equal(numericId[0].id, '7');
  const dupes = client.sanitizeList([
    { id: 'd', name: 'first', part: '', qty: 1 },
    { id: 'd', name: 'second', part: '', qty: 3 },
  ]);
  assert.equal(dupes.length, 1);
  assert.equal(dupes[0].name, 'first');
  const longName = 'x'.repeat(250);
  const truncated = client.sanitizeList([{ id: 'l', name: longName, part: '', qty: 1 }]);
  assert.equal(truncated[0].name.length, 200);
});

test('request list helpers add, change and remove items', () => {
  let list = client.addItem([], { id: '7', name: 'أ', part: 'P' });
  list = client.addItem(list, { id: '7', name: 'أ', part: 'P' });
  assert.deepEqual(list, [{ id: '7', name: 'أ', part: 'P', qty: 2 }]);
  assert.equal(client.setQty(list, '7', '0')[0].qty, 1);
  assert.equal(client.setQty(list, '7', '5000')[0].qty, 999);
  assert.deepEqual(client.removeItem(list, '7'), []);
});
