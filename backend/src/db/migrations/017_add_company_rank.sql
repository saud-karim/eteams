-- Add company_rank to users table
ALTER TABLE users ADD COLUMN company_rank VARCHAR(50) DEFAULT 'employee';
