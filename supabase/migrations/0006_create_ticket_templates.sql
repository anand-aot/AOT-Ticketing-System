-- Create ticket_templates table
CREATE TABLE ticket_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('IT Infrastructure', 'HR', 'Administration', 'Accounts', 'Others')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  created_by TEXT NOT NULL REFERENCES users(email),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ticket_templates ENABLE ROW LEVEL SECURITY;

-- Allow hr_owner, owner, admin_owner to manage ticket templates
CREATE POLICY manage_ticket_templates ON ticket_templates
  FOR ALL
  USING (auth.jwt() ->> 'role' IN ('hr_owner', 'owner', 'admin_owner'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('hr_owner', 'owner', 'admin_owner'));

-- Allow all authenticated users to read ticket templates
CREATE POLICY select_ticket_templates ON ticket_templates
  FOR SELECT
  USING (true);