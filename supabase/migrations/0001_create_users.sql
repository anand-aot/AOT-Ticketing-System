-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'it_owner', 'hr_owner', 'admin_owner', 'accounts_owner', 'owner')),
  employee_id TEXT UNIQUE NOT NULL,
  department TEXT,
  sub_department TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own user data
CREATE POLICY select_own_user ON users
  FOR SELECT
  USING (auth.email() = email);

-- Allow hr_owner, owner, admin_owner to read all users
CREATE POLICY select_all_users ON users
  FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('hr_owner', 'owner', 'admin_owner'));

-- Allow hr_owner, owner, admin_owner to insert/update users
CREATE POLICY manage_users ON users
  FOR ALL
  USING (auth.jwt() ->> 'role' IN ('hr_owner', 'owner', 'admin_owner'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('hr_owner', 'owner', 'admin_owner'));

-- Trigger to update timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();