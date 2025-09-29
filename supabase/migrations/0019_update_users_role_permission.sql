-- Add verify_role_updater column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS verify_role_updater BOOLEAN DEFAULT FALSE;

-- Create trigger to sync verify_role_updater
CREATE OR REPLACE FUNCTION sync_verify_role_updater()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE users
    SET verify_role_updater = TRUE
    WHERE email = NEW.email;
  END IF;
  IF TG_OP = 'DELETE' THEN
    UPDATE users
    SET verify_role_updater = FALSE
    WHERE email = OLD.email;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_verify_role_updater_trigger ON role_permissions;
CREATE TRIGGER sync_verify_role_updater_trigger
  AFTER INSERT OR UPDATE OR DELETE
  ON role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION sync_verify_role_updater();

-- Initialize existing users
UPDATE users
SET verify_role_updater = EXISTS (
  SELECT 1 FROM role_permissions WHERE role_permissions.email = users.email
);

-- Drop existing policy
DROP POLICY IF EXISTS select_users ON users;

-- Create updated policy
CREATE POLICY select_users ON users
  FOR SELECT
  TO public
  USING (
    (auth.jwt() ->> 'role') IN ('hr_owner', 'owner', 'admin_owner')
    OR (auth.jwt() ->> 'email') = email
  );