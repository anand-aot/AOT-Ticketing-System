-- Drop the existing constraint
ALTER TABLE audit_logs DROP CONSTRAINT audit_logs_action_check;

-- Add a new constraint with the updated allowed values
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check
CHECK (action IN ('created', 'updated', 'escalated', 'chat_message_added'));