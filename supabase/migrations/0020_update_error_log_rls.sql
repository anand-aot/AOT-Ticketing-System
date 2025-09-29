-- migrations/009_error_logs.sql
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message TEXT NOT NULL,
  context TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS insert_error_logs ON error_logs;
CREATE POLICY insert_error_logs ON error_logs
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Drop and recreate select_error_logs policy
DROP POLICY IF EXISTS select_error_logs ON error_logs;
CREATE POLICY select_error_logs ON error_logs
  FOR SELECT
  TO public
  USING ((auth.jwt() ->> 'role') IN ('owner', 'admin_owner'));