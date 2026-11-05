const test = require('node:test');
const assert = require('node:assert');
const { parseOpDay, businessDay, OP_DAY, OP_STAMP } = require('../op_date');

test('empty date falls back to the given default or today', () => {
  assert.strictEqual(parseOpDay('', '2026-01-15'), '2026-01-15');
  assert.strictEqual(parseOpDay(undefined), businessDay());
  assert.strictEqual(parseOpDay(null), businessDay());
});

test('valid past dates and today are accepted', () => {
  assert.strictEqual(parseOpDay('2025-03-09'), '2025-03-09');
  assert.strictEqual(parseOpDay(` ${businessDay()} `), businessDay());
});

test('future, malformed and impossible dates are rejected', () => {
  const tomorrow = new Date(`${businessDay()}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  assert.throws(() => parseOpDay(tomorrow.toISOString().slice(0, 10)), /المستقبل/);
  assert.throws(() => parseOpDay('2025-02-30'), /التاريخ غير صحيح/);
  assert.throws(() => parseOpDay('09/03/2025'), /التاريخ غير صحيح/);
  assert.throws(() => parseOpDay('1999-12-31'), /التاريخ غير صحيح/);
});

test('SQL fragments read the chosen day from @opDay', () => {
  assert.match(OP_DAY, /@opDay/);
  assert.match(OP_STAMP, /@opDay/);
  assert.match(OP_STAMP, /GETDATE\(\)/);
});
