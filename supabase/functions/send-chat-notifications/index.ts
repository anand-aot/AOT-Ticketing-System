import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://aot-ticketing-system.vercel.app', // Explicitly allow your frontend origin
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400', // Cache preflight response for 24 hours
};

// Required environment variables
const requiredEnv = [
  'GOOGLE_CHAT_API_KEY',
  'GOOGLE_CHAT_TOKEN',
  'GOOGLE_CHAT_HR_WEBHOOK',
  'GOOGLE_CHAT_IT_WEBHOOK',
  'GOOGLE_CHAT_ADMIN_WEBHOOK',
  'GOOGLE_CHAT_ACCOUNTS_WEBHOOK',
  'APP_BASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];
const missingEnv = requiredEnv.filter((key) => !Deno.env.get(key));
if (missingEnv.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnv.join(', ')}`);
}

// Valid ticket categories
const validCategories = ['HR', 'IT Infrastructure', 'Administration', 'Accounts', 'Others'];

interface Payload {
  ticket_id?: string;
  employee_email?: string;
  hr_emails?: string[] | null;
  subject?: string;
  status?: string;
  escalation_reason?: string | null;
  employee_name?: string | null;
  employee_id?: string | null;
  department?: string | null;
  category?: string | null;
  message_content?: string;
  sender_role?: string;
}

async function logError(errorMessage: string, context: string) {
  const { error } = await supabase.from('error_logs').insert({
    error_message: errorMessage,
    context: `send-chat-notification: ${context}`,
    created_at: new Date().toISOString(),
  });
  if (error) {
    console.error('Failed to log error to error_logs:', error.message);
  }
}

async function sendDirectMessage(email: string, text: string, retries = 3): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const spaceResponse = await fetch(
        `https://chat.googleapis.com/v1/spaces/findDirectMessage?key=${Deno.env.get('GOOGLE_CHAT_API_KEY')}&token=${Deno.env.get('GOOGLE_CHAT_TOKEN')}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: `users/${email}` }),
        },
      );
      if (!spaceResponse.ok) {
        throw new Error(`Failed to find DM space for ${email}: ${spaceResponse.statusText}`);
      }
      const { name: spaceName } = await spaceResponse.json();
      const messageResponse = await fetch(
        `https://chat.googleapis.com/v1/${spaceName}/messages?key=${Deno.env.get('GOOGLE_CHAT_API_KEY')}&token=${Deno.env.get('GOOGLE_CHAT_TOKEN')}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        },
      );
      if (!messageResponse.ok) {
        if (messageResponse.status === 429 && attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt * 2));
          continue;
        }
        throw new Error(`Failed to send message to ${email}: ${messageResponse.statusText}`);
      }
      return;
    } catch (error) {
      if (attempt === retries) {
        await logError(error.message, `sendDirectMessage, email=${email}`);
        throw error;
      }
    }
  }
}

async function sendWebhook(category: string, message: string): Promise<void> {
  const webhookUrls: { [key: string]: string } = {
    HR: Deno.env.get('GOOGLE_CHAT_HR_WEBHOOK') || '',
    'IT Infrastructure': Deno.env.get('GOOGLE_CHAT_IT_WEBHOOK') || '',
    Administration: Deno.env.get('GOOGLE_CHAT_ADMIN_WEBHOOK') || '',
    Accounts: Deno.env.get('GOOGLE_CHAT_ACCOUNTS_WEBHOOK') || '',
    Others: Deno.env.get('GOOGLE_CHAT_HR_WEBHOOK') || '',
  };
  const webhookUrl = webhookUrls[category];
  if (!webhookUrl) {
    throw new Error(`No webhook URL configured for category: ${category}`);
  }
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });
  if (!response.ok) {
    throw new Error(`Failed to send webhook to ${category} channel: ${response.statusText}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204, // No Content for OPTIONS
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader !== `Bearer ${supabaseServiceRoleKey}`) {
      await logError('Unauthorized request', 'validate auth');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload: Payload = await req.json();
    const { ticket_id, employee_email, hr_emails, subject, status, escalation_reason, employee_name, employee_id, department, category, message_content, sender_role } = payload;

    if (!ticket_id || !subject || !status) {
      await logError('Missing required fields: ticket_id, subject, status', `payload=${JSON.stringify(payload)}`);
      return new Response(JSON.stringify({ error: 'Missing required fields: ticket_id, subject, status' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (employee_email && !emailRegex.test(employee_email)) {
      await logError('Invalid employee_email format', `employee_email=${employee_email}`);
      return new Response(JSON.stringify({ error: 'Invalid employee_email format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (hr_emails && (!Array.isArray(hr_emails) || hr_emails.some((email) => !emailRegex.test(email)))) {
      await logError('Invalid hr_emails format', `hr_emails=${JSON.stringify(hr_emails)}`);
      return new Response(JSON.stringify({ error: 'Invalid hr_emails format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (category && !validCategories.includes(category)) {
      await logError(`Invalid category: ${category}`, `payload=${JSON.stringify(payload)}`);
      return new Response(JSON.stringify({ error: `Invalid category. Must be one of: ${validCategories.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ticketUrl = `${Deno.env.get('APP_BASE_URL')}/ticket/${ticket_id}`;
    const results = { dmSent: [] as string[], webhookSent: false };

    // Handle ticket updates
    if (status !== 'Notification') {
      if (employee_email) {
        const message = `Ticket ${ticket_id}: ${subject} updated to ${status}.${escalation_reason ? ` Reason: ${escalation_reason}` : ''}\nView: ${ticketUrl}`;
        await sendDirectMessage(employee_email, message);
        results.dmSent.push(employee_email);
      }
      if (status === 'Escalated' && hr_emails?.length) {
        const message = `Ticket ${ticket_id}: ${subject} escalated. Reason: ${escalation_reason || 'N/A'}\nView: ${ticketUrl}`;
        for (const hrEmail of hr_emails) {
          await sendDirectMessage(hrEmail, message);
          results.dmSent.push(hrEmail);
        }
      }
      if (category) {
        const message =
          status === 'Escalated'
            ? `🚨 Escalated: ${employee_name || 'Unknown'} (ID: ${employee_id || 'N/A'}, Dept: ${department || 'N/A'}). Reason: ${escalation_reason || 'N/A'}\nView: ${ticketUrl}`
            : `ℹ️ Update: ${employee_name || 'Unknown'} (ID: ${employee_id || 'N/A'}, Dept: ${department || 'N/A'}). Status: ${status}\nView: ${ticketUrl}`;
        await sendWebhook(category, message);
        results.webhookSent = true;
      }
    }
    // Handle message notifications
    else if (message_content && sender_role) {
      if (employee_email) {
        const message = `New message on ticket ${ticket_id}: ${message_content.substring(0, 100)}...\nView: ${ticketUrl}`;
        await sendDirectMessage(employee_email, message);
        results.dmSent.push(employee_email);
      }
      if (category) {
        const message = `💬 New message from ${sender_role} on ticket ${ticket_id}: ${message_content.substring(0, 100)}...\nView: ${ticketUrl}`;
        await sendWebhook(category, message);
        results.webhookSent = true;
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    await logError(error.message, `payload=${JSON.stringify(req.body)}`);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});