const { db } = require('../db/connection');

const PUBLIC_FIELDS = 'id, email, name, avatar_initials, avatar_color, role, department, job_title, presence, status_text, last_seen_at, is_active, reports_to, employment_type, role_preset, permissions, approval_status';

async function findById(id) {
  const [rows] = await db.query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = :id AND is_active = 1`, { id });
  return rows[0] || null;
}

async function findByEmail(email) {
  const [rows] = await db.query(`SELECT id, email, name, password_hash, avatar_initials, avatar_color, role, department, job_title, presence, is_active, reports_to, employment_type, role_preset, permissions, approval_status FROM users WHERE email = :email`, { email });
  return rows[0] || null;
}

async function findAll() {
  const [rows] = await db.query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE is_active = 1 ORDER BY name ASC`);
  return rows;
}

async function findByIdAnyStatus(id) {
  const [rows] = await db.query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = :id`, { id });
  return rows[0] || null;
}

async function findPending() {
  const [rows] = await db.query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE approval_status = 'pending' ORDER BY name ASC`);
  return rows;
}

async function create(data) {
  const approval_status = data.approval_status || 'approved';
  const is_active = data.is_active !== undefined ? data.is_active : 1;
  await db.query(
    `INSERT INTO users (id, email, password_hash, name, avatar_initials, avatar_color, role, department, job_title, reports_to, employment_type, role_preset, permissions, approval_status, is_active)
     VALUES (:id, :email, :password_hash, :name, :avatar_initials, :avatar_color, :role, :department, :job_title, :reports_to, :employment_type, :role_preset, :permissions, :approval_status, :is_active)`,
    { ...data, permissions: data.permissions ? JSON.stringify(data.permissions) : null, approval_status, is_active }
  );
  return findByIdAnyStatus(data.id);
}

async function updatePresence(id, presence, statusText = null) {
  await db.query(
    `UPDATE users SET presence = :presence, status_text = :statusText, last_seen_at = NOW() WHERE id = :id`,
    { id, presence, statusText }
  );
}

async function deactivate(id) {
  await db.query(`UPDATE users SET is_active = 0 WHERE id = :id`, { id });
}

async function update(id, data) {
  let perms = data.permissions;
  if (typeof perms === 'string') {
    try { perms = JSON.parse(perms); } catch(e) {}
  }
  await db.query(
    `UPDATE users SET name = :name, email = :email, department = :department, role = :role, job_title = :job_title, reports_to = :reports_to, employment_type = :employment_type, role_preset = :role_preset, permissions = :permissions WHERE id = :id`,
    { id, ...data, permissions: perms ? JSON.stringify(perms) : null }
  );
  return findByIdAnyStatus(id);
}

async function updatePassword(id, passwordHash) {
  await db.query(`UPDATE users SET password_hash = :passwordHash WHERE id = :id`, { id, passwordHash });
}

async function updateApproval(id, status, isActive) {
  await db.query(`UPDATE users SET approval_status = :status, is_active = :isActive WHERE id = :id`, { id, status, isActive });
}

module.exports = { findById, findByIdAnyStatus, findByEmail, findAll, findPending, create, updatePresence, deactivate, update, updatePassword, updateApproval };
