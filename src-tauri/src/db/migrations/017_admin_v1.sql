-- Update the default admin user with a proper bcrypt hash for 'adminpassword'
-- We only update it if it is still using the placeholder.
UPDATE users 
SET password_hash = '$2b$12$vipg8AEOltP28fqSB1QyB.CpZrau1yiE6ZLalgzEhfiQqsUQ4Sb6m' 
WHERE username = 'admin' 
AND password_hash = 'hashed_password_placeholder';
