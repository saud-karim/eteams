ALTER TABLE users
ADD COLUMN reports_to CHAR(36) NULL,
ADD COLUMN employment_type VARCHAR(50) DEFAULT 'Full-time employee',
ADD COLUMN role_preset VARCHAR(50) DEFAULT 'standard',
ADD COLUMN permissions JSON NULL;

ALTER TABLE users
ADD CONSTRAINT fk_reports_to FOREIGN KEY (reports_to) REFERENCES users(id) ON DELETE SET NULL;
