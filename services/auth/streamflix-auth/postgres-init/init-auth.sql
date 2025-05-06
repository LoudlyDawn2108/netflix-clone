-- Set password authentication to MD5 for all host connections
ALTER SYSTEM SET password_encryption = 'md5';

-- Restart the authentication system to apply changes
SELECT pg_reload_conf();

-- Alter the postgres user to use MD5
ALTER USER postgres WITH PASSWORD 'postgres';

-- Create the database if it doesn't exist
CREATE DATABASE streamflix_auth WITH OWNER postgres;

-- Additional command to copy the pg_hba.conf file (this is handled by our docker-compose mount)