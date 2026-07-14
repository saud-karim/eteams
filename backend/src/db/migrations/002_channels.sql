CREATE TABLE IF NOT EXISTS channels (
  id            CHAR(36) PRIMARY KEY,
  slug          VARCHAR(100) NOT NULL UNIQUE,
  name          VARCHAR(100) NOT NULL,
  description   VARCHAR(500),
  type          ENUM('public', 'private', 'announcement', 'dm', 'group_dm') NOT NULL DEFAULT 'public',
  is_mandatory  TINYINT(1) NOT NULL DEFAULT 0,
  is_readonly   TINYINT(1) NOT NULL DEFAULT 0,
  retention_days INT DEFAULT NULL,
  created_by    CHAR(36) NOT NULL,
  archived_at   DATETIME DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (slug),
  INDEX idx_type (type),
  INDEX idx_created_by (created_by),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
