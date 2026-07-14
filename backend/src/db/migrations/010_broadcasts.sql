-- Migration: Create broadcasts table
-- Up
CREATE TABLE IF NOT EXISTS broadcasts (
  id CHAR(36) PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- informational, important, emergency
  recipients VARCHAR(100) NOT NULL, -- all, directors, hr_ops
  message_body TEXT NOT NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

