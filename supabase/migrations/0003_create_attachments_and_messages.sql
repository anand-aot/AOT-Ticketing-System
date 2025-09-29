-- Create attachments table
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image/jpeg', 'image/png', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain')),
  uploaded_by TEXT NOT NULL REFERENCES users(email),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_url TEXT NOT NULL
);

-- Create chat_messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(email),
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for attachments
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Allow access to attachments for ticket owners and category owners
CREATE POLICY access_attachments ON attachments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = attachments.ticket_id
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

-- Enable RLS for chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow access to messages for ticket owners and category owners
CREATE POLICY access_chat_messages ON chat_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = chat_messages.ticket_id
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