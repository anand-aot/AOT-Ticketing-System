CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message TEXT,
  context TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE POLICY select_error_logs ON error_logs
  FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('hr_owner', 'owner', 'admin_owner'));