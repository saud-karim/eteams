ALTER TABLE users 
DROP INDEX email,
DROP INDEX idx_email,
CHANGE COLUMN email username VARCHAR(191) NOT NULL,
ADD UNIQUE INDEX username (username),
ADD INDEX idx_username (username);
