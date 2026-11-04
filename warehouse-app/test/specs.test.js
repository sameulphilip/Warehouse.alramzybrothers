const test = require('node:test');
const assert = require('node:assert/strict');
const { parseSpecs } = require('../catalog/specs');

test('parseSpecs groups repeated labels in first-seen order', () => {
  const groups = parseSpecs('OEM: 003 420 7718\nFTE: R 4192B1\nOEM: 002 420 5218\n\nDIA: 41.27 mm');
  assert.deepEqual(groups, [
    { label: 'OEM', values: ['003 420 7718', '002 420 5218'] },
    { label: 'FTE', values: ['R 4192B1'] },
    { label: 'DIA', values: ['41.27 mm'] }
  ]);
});

test('parseSpecs keeps lines without a label as notes and accepts Arabic colons', () => {
  assert.deepEqual(parseSpecs('WITHOUT PRESSURE PIN\nالقطر\uff1a 44 مم'), [
    { label: '', values: ['WITHOUT PRESSURE PIN'] },
    { label: 'القطر', values: ['44 مم'] }
  ]);
});

test('parseSpecs ignores empty input and caps sizes', () => {
  assert.deepEqual(parseSpecs(''), []);
  assert.deepEqual(parseSpecs(null), []);
  const long = parseSpecs(`${'L'.repeat(60)}: ${'v'.repeat(200)}`);
  assert.equal(long[0].label.length, 40);
  assert.equal(long[0].values[0].length, 120);
  const many = Array.from({ length: 60 }, (_, i) => `K${i}: ${i}`).join('\n');
  assert.equal(parseSpecs(many).length, 40);
});
