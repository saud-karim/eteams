ALTER TABLE refresh_tokens 
ADD COLUMN token_family CHAR(36) NOT NULL AFTER user_id,
ADD COLUMN replaced_by CHAR(36) DEFAULT NULL AFTER revoked_at,
ADD INDEX idx_family (token_family);
