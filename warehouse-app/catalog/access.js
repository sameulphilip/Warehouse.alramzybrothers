const PERMS = ['catalog'];

function cleanPerms(value) {
  return Array.isArray(value) ? PERMS.filter((perm) => value.includes(perm)) : [];
}

function canEditCatalog(user) {
  return Boolean(user) && (user.role === 'superadmin' || cleanPerms(user.perms).includes('catalog'));
}

module.exports = { cleanPerms, canEditCatalog };
