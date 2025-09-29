-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id),
  sender_id UUID, -- References users(id)
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS select_messages ON messages;

-- Create policy for selecting messages
CREATE POLICY select_messages ON messages
  FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('hr_owner', 'owner', 'admin_owner', 'employee'));

-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create trigger function for message notifications
CREATE OR REPLACE FUNCTION notify_message_added()
RETURNS TRIGGER AS $$
DECLARE
  v_edge_function_url TEXT;
  v_employee_email TEXT;
  v_category TEXT;
BEGIN
  -- Fetch EDGE_FUNCTION_URL
  SELECT value INTO v_edge_function_url
  FROM secrets
  WHERE key = 'EDGE_FUNCTION_URL'
  LIMIT 1;

  IF v_edge_function_url IS NULL THEN
    v_edge_function_url = 'edge_function_url';
  END IF;

  -- Fetch employee_email and category
  SELECT employee_email, category INTO v_employee_email, v_category
  FROM tickets
  WHERE id = NEW.ticket_id;

  -- Send notification
  PERFORM http((
    'POST',
    v_edge_function_url,
    ARRAY[http_header('Authorization', 'Bearer ' || (SELECT value FROM secrets WHERE key = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1))],
    'application/json',
    json_build_object(
      'ticket_id', NEW.ticket_id,
      'employee_email', v_employee_email,
      'hr_emails', NULL,
      'subject', 'New Message',
      'status', 'Notification',
      'escalation_reason', NULL,
      'employee_name', NULL,
      'employee_id', NULL,
      'department', NULL,
      'category', v_category,
      'message_content', NEW.content,
      'sender_role', NEW.sender_role
    )::text
  )::http_request);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS notify_message_added_trigger ON messages;
CREATE TRIGGER notify_message_added_trigger
  AFTER INSERT
  ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_message_added();