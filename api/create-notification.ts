/**
 * Vercel serverless: POST /api/create-notification
 * Creates a row in public.community_notifications (公告). Service role bypasses RLS.
 * JWT must be admin, council, or manager.
 */
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const PRIORITIES = new Set(['normal', 'important', 'urgent']);

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('create-notification: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const accessToken = authHeader.slice('Bearer '.length).trim();
  if (!accessToken) {
    return res.status(401).json({ error: 'Missing access token' });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userErr,
  } = await admin.auth.getUser(accessToken);

  if (userErr || !user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  let body: Record<string, unknown> = {};
  try {
    const raw = req.body;
    body =
      typeof raw === 'string' ? (JSON.parse(raw) as Record<string, unknown>) : (raw as Record<string, unknown>) || {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const rawPriority = typeof body.priority === 'string' ? body.priority.trim() : 'normal';
  const priority = PRIORITIES.has(rawPriority) ? rawPriority : 'normal';

  const propertyId = typeof body.property_id === 'string' ? body.property_id.trim() : '';
  if (!propertyId) {
    return res.status(400).json({ error: 'property_id is required' });
  }

  if (!title || !content) {
    return res.status(400).json({ error: 'title and content are required' });
  }

  const { data: pu, error: puErr } = await admin
    .from('property_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('property_id', propertyId)
    .eq('status', 'active')
    .maybeSingle();

  if (puErr || !pu) {
    return res.status(403).json({ error: 'No access to this property' });
  }

  const pr = typeof pu.role === 'string' ? pu.role : '';
  if (
    pr !== 'council' &&
    pr !== 'manager' &&
    pr !== 'admin' &&
    pr !== 'property_admin'
  ) {
    return res.status(403).json({ error: 'Only admin, council, or property manager can publish' });
  }

  const { data: inserted, error: insertErr } = await admin
    .from('community_notifications')
    .insert({
      property_id: propertyId,
      title,
      content,
      priority,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error('create-notification insert', insertErr);
    return res.status(500).json({ error: insertErr.message || 'Insert failed' });
  }

  return res.status(200).json({ id: inserted.id });
}
