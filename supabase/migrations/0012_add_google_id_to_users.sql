-- 0012_add_google_id_to_users.sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;

-- Update existing users to set google_id = id (if applicable)
UPDATE users
SET google_id = id
WHERE google_id IS NULL AND id IS NOT NULL;

-- Ensure id column uses gen_random_uuid() for new records
ALTER TABLE users
  ALTER COLUMN id SET DEFAULT gen_random_uuid();