-- 0011_update_users_rls.sql
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS select_own_user ON users;
DROP POLICY IF EXISTS select_all_users ON users;
DROP POLICY IF EXISTS manage_users ON users;
DROP POLICY IF EXISTS insert_own_user ON users;
DROP POLICY IF EXISTS insert_users_admin ON users;
DROP POLICY IF EXISTS update_own_user ON users;
DROP POLICY IF EXISTS update_users_admin ON users;
DROP POLICY IF EXISTS delete_users_admin ON users;

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own user data
CREATE POLICY select_own_user ON users
  FOR SELECT
  USING (auth.email() = email);

-- Allow hr_owner, owner, admin_owner to read all users
CREATE POLICY select_all_users ON users
  FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('hr_owner', 'owner', 'admin_owner'));

-- Allow authenticated users to insert their own user record
CREATE POLICY insert_own_user ON users
  FOR INSERT
  WITH CHECK (auth.email() = email);

-- Allow hr_owner, owner, admin_owner to insert any user record
CREATE POLICY insert_users_admin ON users
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('hr_owner', 'owner', 'admin_owner'));

-- Allow authenticated users to update their own user record
CREATE POLICY update_own_user ON users
  FOR UPDATE
  USING (auth.email() = email)
  WITH CHECK (auth.email() = email);

-- Allow hr_owner, owner, admin_owner to update any user record
CREATE POLICY update_users_admin ON users
  FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('hr_owner', 'owner', 'admin_owner'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('hr_owner', 'owner', 'admin_owner'));

-- Allow hr_owner, owner, admin_owner to delete any user record
CREATE POLICY delete_users_admin ON users
  FOR DELETE
  USING (auth.jwt() ->> 'role' IN ('hr_owner', 'owner', 'admin_owner'));

-- Create trigger to prevent non-admin users from changing role
CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.jwt() ->> 'role' NOT IN ('hr_owner', 'owner', 'admin_owner') AND NEW.role != OLD.role THEN
    RAISE EXCEPTION 'Only hr_owner, owner, or admin_owner can change the role field';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS prevent_role_change_trigger ON users;

-- Create trigger
CREATE TRIGGER prevent_role_change_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_change();