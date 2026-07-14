CREATE TABLE IF NOT EXISTS reactions (
  id         CHAR(36) PRIMARY KEY,
  message_id CHAR(36) NOT NULL,
  user_id    CHAR(36) NOT NULL,
  emoji      VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_reaction (message_id, user_id, emoji),
  INDEX idx_message (message_id),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
