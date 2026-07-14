CREATE TABLE IF NOT EXISTS attachments (
  id          CHAR(36) PRIMARY KEY,
  message_id  CHAR(36) NOT NULL,
  filename    VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type   VARCHAR(100) NOT NULL,
  size_bytes  BIGINT UNSIGNED NOT NULL,
  storage_key VARCHAR(500) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_message (message_id),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
