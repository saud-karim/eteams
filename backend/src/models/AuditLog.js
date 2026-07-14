const { db } = require('../db/connection');

async function log(actorId, action, entityType, entityId = null, metadata = null, ipAddress = null) {
  await db.query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata, ip_address)
     VALUES (:actorId, :action, :entityType, :entityId, :metadata, :ipAddress)`,
    { actorId, action, entityType, entityId, metadata: metadata ? JSON.stringify(metadata) : null, ipAddress }
  );
}

async function list({ limit = 100, offset = 0 } = {}) {
  const [rows] = await db.query(
    `SELECT a.*, u.name AS actor_name FROM audit_log a JOIN users u ON u.id = a.actor_id
     ORDER BY a.created_at DESC LIMIT :limit OFFSET :offset`,
    { limit, offset }
  );
  return rows;
}

module.exports = { log, list };
