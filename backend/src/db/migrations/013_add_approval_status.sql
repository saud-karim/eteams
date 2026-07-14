ALTER TABLE users ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved';
