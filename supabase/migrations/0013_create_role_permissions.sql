CREATE TABLE IF NOT EXISTS role_permissions (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('employee', 'it_owner', 'hr_owner', 'admin_owner', 'accounts_owner', 'owner')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_role_permissions ON role_permissions
  FOR SELECT
  USING (true);

CREATE POLICY manage_role_permissions ON role_permissions
  FOR ALL
  USING (auth.jwt() ->> 'role' IN ('hr_owner', 'owner', 'admin_owner'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('hr_owner', 'owner', 'admin_owner'));

CREATE OR REPLACE FUNCTION update_role_permissions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_role_permissions_timestamp
  BEFORE UPDATE ON role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_role_permissions_timestamp();