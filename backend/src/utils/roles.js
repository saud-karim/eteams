function isAdmin(user) {
  if (!user) return false;
  let permissions = user.permissions;
  if (typeof permissions === 'string') {
    try { permissions = JSON.parse(permissions); }
    catch (e) { permissions = {}; }
  }
  return user.role === 'superadmin' || (permissions && permissions['admin-access'] === true);
}

function isSuperAdmin(user) {
  if (!user) return false;
  return user.role === 'superadmin';
}

module.exports = {
  isAdmin,
  isSuperAdmin
};
