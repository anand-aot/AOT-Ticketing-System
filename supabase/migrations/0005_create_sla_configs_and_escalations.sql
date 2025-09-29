-- Create sla_configs table
CREATE TABLE sla_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('IT Infrastructure', 'HR', 'Administration', 'Accounts', 'Others')),
  priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  response_time_hours INTEGER NOT NULL,
  resolution_time_hours INTEGER NOT NULL
);

-- Create escalations table
CREATE TABLE escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  timeline TEXT,
  escalated_by TEXT NOT NULL REFERENCES users(email),
  escalated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE
);

-- Enable RLS for sla_configs
ALTER TABLE sla_configs ENABLE ROW LEVEL SECURITY;

-- Allow hr_owner, owner, admin_owner to manage SLA configs
CREATE POLICY manage_sla_configs ON sla_configs
  FOR ALL
  USING (auth.jwt() ->> 'role' IN ('hr_owner', 'owner', 'admin_owner'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('hr_owner', 'owner', 'admin_owner'));

-- Enable RLS for escalations
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;

-- Allow access to escalations for ticket owners and category owners
CREATE POLICY access_escalations ON escalations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = escalations.ticket_id
      AND (
        tickets.employee_email = auth.email() OR
        (
          (auth.jwt() ->> 'role' = 'it_owner' AND tickets.category = 'IT Infrastructure') OR
          (auth.jwt() ->> 'role' = 'hr_owner' AND tickets.category = 'HR') OR
          (auth.jwt() ->> 'role' = 'admin_owner' AND tickets.category = 'Administration') OR
          (auth.jwt() ->> 'role' = 'accounts_owner' AND tickets.category = 'Accounts') OR
          auth.jwt() ->> 'role' = 'owner'
        )
      )
    )
  );

-- Seed initial SLA configs
INSERT INTO sla_configs (category, priority, response_time_hours, resolution_time_hours)
VALUES
  ('IT Infrastructure', 'Critical', 1, 4),
  ('IT Infrastructure', 'High', 2, 8),
  ('IT Infrastructure', 'Medium', 4, 24),
  ('IT Infrastructure', 'Low', 8, 72),
  ('HR', 'Critical', 2, 8),
  ('HR', 'High', 4, 24),
  ('HR', 'Medium', 8, 48),
  ('HR', 'Low', 24, 120),
  ('Administration', 'Critical', 2, 8),
  ('Administration', 'High', 4, 24),
  ('Administration', 'Medium', 8, 48),
  ('Administration', 'Low', 24, 120),
  ('Accounts', 'Critical', 1, 4),
  ('Accounts', 'High', 2, 8),
  ('Accounts', 'Medium', 4, 24),
  ('Accounts', 'Low', 8, 72),
  ('Others', 'Critical', 2, 8),
  ('Others', 'High', 4, 24),
  ('Others', 'Medium', 8, 48),
  ('Others', 'Low', 24, 120);