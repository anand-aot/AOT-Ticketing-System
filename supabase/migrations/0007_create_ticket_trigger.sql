-- Create trigger function for ticket changes
CREATE OR REPLACE FUNCTION notify_ticket_changes()
RETURNS TRIGGER AS $$
DECLARE
  hr_emails TEXT[];
  employee_email TEXT := NEW.employee_email;
  ticket_subject TEXT := NEW.subject;
  old_status TEXT := COALESCE(OLD.status, 'N/A');
  new_status TEXT := NEW.status;
  escalation_reason TEXT := NEW.escalation_reason;
  ticket_url TEXT := 'https://your-app.com/ticket/' || NEW.id;
  employee_name TEXT := NEW.employee_name;
  employee_id TEXT := NEW.employee_id;
  department TEXT := NEW.department;
  category TEXT := NEW.category;
BEGIN
  -- For ticket creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      ticket_id, action, details, performed_by, performed_at
    ) VALUES (
      NEW.id, 'created', 'Ticket created: ' || ticket_subject, employee_email, NOW()
    );

    PERFORM http((
      SELECT json_build_object(
        'method', 'POST',
        'url', 'https://your-supabase-project.functions.supabase.co/send-chat-notification',
        'headers', json_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM secrets WHERE key = 'SUPABASE_SERVICE_ROLE_KEY')
        ),
        'body', json_build_object(
          'ticket_id', NEW.id,
          'employee_email', employee_email,
          'hr_emails', NULL,
          'subject', ticket_subject,
          'status', NEW.status,
          'escalation_reason', NULL,
          'employee_name', employee_name,
          'employee_id', employee_id,
          'department', department,
          'category', category
        )
      )
    )::json);
  END IF;

  -- For status updates
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO audit_logs (
      ticket_id, action, details, performed_by, performed_at, old_value, new_value
    ) VALUES (
      NEW.id, 'updated', 'Status changed', NEW.employee_email, NOW(), OLD.status, NEW.status
    );

    INSERT INTO notifications (
      user_id, title, message, type, ticket_id, created_at
    ) VALUES (
      employee_email, 'Ticket Status Updated', 'Ticket ' || NEW.id || ': ' || ticket_subject || ' status changed to ' || new_status, 'info', NEW.id, NOW()
    );

    PERFORM http((
      SELECT json_build_object(
        'method', 'POST',
        'url', 'https://your-supabase-project.functions.supabase.co/send-chat-notification',
        'headers', json_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM secrets WHERE key = 'SUPABASE_SERVICE_ROLE_KEY')
        ),
        'body', json_build_object(
          'ticket_id', NEW.id,
          'employee_email', employee_email,
          'hr_emails', NULL,
          'subject', ticket_subject,
          'status', new_status,
          'escalation_reason', NULL,
          'employee_name', employee_name,
          'employee_id', employee_id,
          'department', department,
          'category', category
        )
      )
    )::json);
  END IF;

  -- For escalations
  IF TG_OP = 'UPDATE' AND NEW.status = 'Escalated' THEN
    SELECT array_agg(email) INTO hr_emails FROM users WHERE role = 'hr_owner';
    FOREACH employee_email IN ARRAY hr_emails LOOP
      INSERT INTO notifications (
        user_id, title, message, type, ticket_id, created_at
      ) VALUES (
        employee_email, 'Ticket Escalated', 'Ticket ' || NEW.id || ': ' || ticket_subject || ' escalated. Reason: ' || escalation_reason, 'warning', NEW.id, NOW()
      );
    END LOOP;

    PERFORM http((
      SELECT json_build_object(
        'method', 'POST',
        'url', 'https://your-supabase-project.functions.supabase.co/send-chat-notification',
        'headers', json_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM secrets WHERE key = 'SUPABASE_SERVICE_ROLE_KEY')
        ),
        'body', json_build_object(
          'ticket_id', NEW.id,
          'employee_email', NEW.employee_email,
          'hr_emails', hr_emails,
          'subject', ticket_subject,
          'status', new_status,
          'escalation_reason', escalation_reason,
          'employee_name', employee_name,
          'employee_id', employee_id,
          'department', department,
          'category', category
        )
      )
    )::json);
  END IF;

  -- For assignments
  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO audit_logs (
      ticket_id, action, details, performed_by, performed_at, old_value, new_value
    ) VALUES (
      NEW.id, 'assigned', 'Ticket assigned to ' || NEW.assigned_to, NEW.employee_email, NOW(), OLD.assigned_to, NEW.assigned_to
    );

    PERFORM http((
      SELECT json_build_object(
        'method', 'POST',
        'url', 'https://your-supabase-project.functions.supabase.co/send-chat-notification',
        'headers', json_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM secrets WHERE key = 'SUPABASE_SERVICE_ROLE_KEY')
        ),
        'body', json_build_object(
          'ticket_id', NEW.id,
          'employee_email', NULL,
          'hr_emails', NULL,
          'subject', ticket_subject,
          'status', new_status,
          'escalation_reason', NULL,
          'employee_name', employee_name,
          'employee_id', employee_id,
          'department', department,
          'category', category
        )
      )
    )::json);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER ticket_changes_trigger
  AFTER INSERT OR UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_changes();