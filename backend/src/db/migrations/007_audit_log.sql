CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  actor_id    CHAR(36) NOT NULL,
  action      VARCHAR(60) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id   CHAR(36) DEFAULT NULL,
  metadata    JSON DEFAULT NULL,
  ip_address  VARCHAR(45) DEFAULT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_actor (actor_id, created_at DESC),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_action (action),
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
