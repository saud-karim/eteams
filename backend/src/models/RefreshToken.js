const { db } = require('../db/connection');

async function create(id, userId, tokenHash, tokenFamily, expiresAt, deviceInfo = null) {
  await db.query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, token_family, device_info, expires_at)
     VALUES (:id, :userId, :tokenHash, :tokenFamily, :deviceInfo, :expiresAt)`,
    { id, userId, tokenHash, tokenFamily, deviceInfo, expiresAt }
  );
}

async function findByHash(tokenHash) {
  const [rows] = await db.query(
    `SELECT * FROM refresh_tokens WHERE token_hash = :tokenHash`,
    { tokenHash }
  );
  return rows[0] || null;
}

async function revoke(id) {
  await db.query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = :id`,
    { id }
  );
}

async function markReplaced(id, replacedById) {
  await db.query(
    `UPDATE refresh_tokens SET revoked_at = NOW(), replaced_by = :replacedById WHERE id = :id`,
    { id, replacedById }
  );
}

async function markReplacedAtomic(id, replacedById) {
  const [result] = await db.query(
    `UPDATE refresh_tokens SET revoked_at = NOW(), replaced_by = :replacedById WHERE id = :id AND revoked_at IS NULL`,
    { id, replacedById }
  );
  return result.affectedRows > 0;
}

async function revokeFamily(tokenFamily) {
  await db.query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_family = :tokenFamily AND revoked_at IS NULL`,
    { tokenFamily }
  );
}

async function revokeUserSessions(userId) {
  await db.query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = :userId AND revoked_at IS NULL`,
    { userId }
  );
}

module.exports = {
  create,
  findByHash,
  revoke,
  markReplaced,
  markReplacedAtomic,
  revokeFamily,
  revokeUserSessions
};
