export function isAdmin(user) {
  if (!user) return false;
  return user.role === 'superadmin' || user.permissions?.['admin-access'] === true;
}

export function isSuperAdmin(user) {
  if (!user) return false;
  return user.role === 'superadmin';
}
