-- Create tickets table
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('IT Infrastructure', 'HR', 'Administration', 'Accounts', 'Others')),
  priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  status TEXT NOT NULL CHECK (status IN ('Open', 'In Progress', 'Escalated', 'Closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  employee_id TEXT NOT NULL REFERENCES users(employee_id),
  employee_name TEXT NOT NULL,
  employee_email TEXT NOT NULL REFERENCES users(email),
  department TEXT,
  sub_department TEXT,
  assigned_to TEXT REFERENCES users(email),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  response_time INTEGER,
  resolution_time INTEGER,
  escalation_reason TEXT,
  escalation_date TIMESTAMP WITH TIME ZONE,
  sla_violated BOOLEAN DEFAULT FALSE,
  sla_due_date TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Allow employees to read their own tickets
CREATE POLICY select_own_tickets ON tickets
  FOR SELECT
  USING (auth.email() = employee_email);

-- Allow category owners to read tickets in their category
CREATE POLICY select_category_tickets ON tickets
  FOR SELECT
  USING (
    (auth.jwt() ->> 'role' = 'it_owner' AND category = 'IT Infrastructure') OR
    (auth.jwt() ->> 'role' = 'hr_owner' AND category = 'HR') OR
    (auth.jwt() ->> 'role' = 'admin_owner' AND category = 'Administration') OR
    (auth.jwt() ->> 'role' = 'accounts_owner' AND category = 'Accounts') OR
    auth.jwt() ->> 'role' = 'owner'
  );

-- Allow employees to create tickets
CREATE POLICY insert_tickets ON tickets
  FOR INSERT
  WITH CHECK (auth.email() = employee_email);

-- Allow category owners to update tickets in their category
CREATE POLICY update_category_tickets ON tickets
  FOR UPDATE
  USING (
    (auth.jwt() ->> 'role' = 'it_owner' AND category = 'IT Infrastructure') OR
    (auth.jwt() ->> 'role' = 'hr_owner' AND category = 'HR') OR
    (auth.jwt() ->> 'role' = 'admin_owner' AND category = 'Administration') OR
    (auth.jwt() ->> 'role' = 'accounts_owner' AND category = 'Accounts') OR
    auth.jwt() ->> 'role' = 'owner'
  );

-- Trigger to update timestamp
CREATE TRIGGER update_tickets_timestamp
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();