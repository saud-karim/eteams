CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          CHAR(36) PRIMARY KEY,
  user_id     CHAR(36) NOT NULL,
  token_hash  VARCHAR(255) NOT NULL,
  device_info VARCHAR(255) DEFAULT NULL,
  expires_at  DATETIME NOT NULL,
  revoked_at  DATETIME DEFAULT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_token (token_hash),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
