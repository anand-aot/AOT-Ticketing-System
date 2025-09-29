-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(email),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ticket_id UUID REFERENCES tickets(id)
);

-- Create audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id),
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'assigned', 'escalated', 'closed', 'message_added')),
  details TEXT NOT NULL,
  performed_by TEXT NOT NULL REFERENCES users(email),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  old_value TEXT,
  new_value TEXT
);

-- Enable RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to access their own notifications
CREATE POLICY access_notifications ON notifications
  FOR ALL
  USING (auth.email() = user_id);

-- Enable RLS for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow hr_owner, owner, admin_owner to access audit logs
CREATE POLICY access_audit_logs ON audit_logs
  FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('hr_owner', 'owner', 'admin_owner'));