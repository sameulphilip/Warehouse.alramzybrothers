const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanPerms, canEditCatalog } = require('../catalog/access');

test('cleanPerms keeps only known permissions', () => {
  assert.deepEqual(cleanPerms(['catalog', 'admin', 'catalog']), ['catalog']);
  assert.deepEqual(cleanPerms('catalog'), []);
  assert.deepEqual(cleanPerms(undefined), []);
});

test('canEditCatalog allows superadmins and users with the catalog permission', () => {
  assert.equal(canEditCatalog({ role: 'superadmin' }), true);
  assert.equal(canEditCatalog({ role: 'manager', perms: ['catalog'] }), true);
  assert.equal(canEditCatalog({ role: 'manager', perms: [] }), false);
  assert.equal(canEditCatalog(null), false);
});
