// api/send-chat-notification.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', 'https://aot-ticketing-system.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', 'https://aot-ticketing-system.vercel.app');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const EDGE_FUNCTION_URL = process.env.VITE_SUPABASE_EDGE_FUNCTION_URL!;
  const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

  try {
    const payload = req.body;

    // Validate payload
    if (!payload.ticket_id || !payload.subject || !payload.status) {
      res.setHeader('Access-Control-Allow-Origin', 'https://aot-ticketing-system.vercel.app');
      return res.status(400).json({ error: 'Missing required fields: ticket_id, subject, status' });
    }

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge function failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    res.setHeader('Access-Control-Allow-Origin', 'https://aot-ticketing-system.vercel.app');
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error in send-chat-notification:', error.message);
    res.setHeader('Access-Control-Allow-Origin', 'https://aot-ticketing-system.vercel.app');
    return res.status(500).json({ error: error.message });
  }
}