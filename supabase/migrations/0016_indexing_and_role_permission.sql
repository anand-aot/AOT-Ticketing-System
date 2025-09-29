-- Add CHECK constraint to chat_messages.sender_role
ALTER TABLE chat_messages
ADD CONSTRAINT check_sender_role
CHECK (sender_role IN ('employee', 'it_owner', 'hr_owner', 'admin_owner', 'accounts_owner', 'owner'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_employee_email ON tickets(employee_email);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
CREATE INDEX IF NOT EXISTS idx_chat_messages_ticket_id ON chat_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_email ON role_permissions(email);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Restrict role_permissions RLS
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'select_role_permissions' AND tablename = 'role_permissions') THEN
        DROP POLICY select_role_permissions ON role_permissions;
    END IF;
END $$;

CREATE POLICY select_role_permissions ON role_permissions
  FOR SELECT
  USING (true);

-- Allow admin inserts for notifications
DROP POLICY IF EXISTS access_notifications ON notifications;
CREATE POLICY select_notifications ON notifications
  FOR SELECT
  USING (auth.email() = user_id);
CREATE POLICY insert_notifications_admin ON notifications
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('hr_owner', 'owner', 'admin_owner'));