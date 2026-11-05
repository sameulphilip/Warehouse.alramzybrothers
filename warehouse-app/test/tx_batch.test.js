const test = require('node:test');
const assert = require('node:assert');
const { combineBatch } = require('../tx_batch');

const p = (name, value) => ({ name, type: 'T', value });

test('without queued statements the query is sent unchanged', () => {
  const batch = combineBatch([], { text: 'SELECT @id', inputs: [p('id', 1)] });
  assert.strictEqual(batch.text, 'SELECT @id');
  assert.deepStrictEqual(batch.inputs, [p('id', 1)]);
});

test('queued statements get their own parameter names and run first without row counts', () => {
  const batch = combineBatch([
    { text: 'INSERT INTO a VALUES (@id, @idx, @actor);', inputs: [p('id', 1), p('idx', 2), p('actor', 'x')] },
    { text: 'INSERT INTO a VALUES (@id, @actor)', inputs: [p('id', 3), p('actor', 'x')] }
  ], { text: 'SELECT @id AS id', inputs: [p('id', 9)] });
  assert.strictEqual(batch.text, [
    'SET NOCOUNT ON',
    'INSERT INTO a VALUES (@id__q0, @idx__q0, @actor__q0)',
    'INSERT INTO a VALUES (@id__q1, @actor__q1)',
    'SET NOCOUNT OFF',
    'SELECT @id AS id'
  ].join(';\n'));
  assert.deepStrictEqual(batch.inputs.map((i) => [i.name, i.value]), [
    ['id__q0', 1], ['idx__q0', 2], ['actor__q0', 'x'], ['id__q1', 3], ['actor__q1', 'x'], ['id', 9]
  ]);
});

test('system variables and longer names that share a prefix are left alone', () => {
  const batch = combineBatch([
    { text: 'UPDATE t SET a = @p WHERE b = @pid AND @@ROWCOUNT = 0', inputs: [p('p', 1)] }
  ], { text: 'SELECT 1', inputs: [] });
  assert.match(batch.text, /SET a = @p__q0 WHERE b = @pid AND @@ROWCOUNT = 0/);
});
