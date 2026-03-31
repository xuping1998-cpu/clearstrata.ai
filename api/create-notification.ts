/**
 * Vercel Serverless: create owner bulletin row in `notifications` using service role
 * (bypasses RLS). Caller must send a valid Supabase user JWT; only council/manager.
 */
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

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

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
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

  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr || !profile) {
    return res.status(403).json({ error: 'Profile not found' });
  }

  if (profile.role !== 'council' && profile.role !== 'manager') {
    return res.status(403).json({ error: 'Only council or property manager can publish' });
  }

  let body: Record<string, unknown> = {};
  try {
    const raw = req.body;
    body =
      typeof raw === 'string' ? (JSON.parse(raw) as Record<string, unknown>) : (raw as Record<string, unknown>) || {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  const file_url =
    body?.file_url === null || body?.file_url === undefined || body?.file_url === ''
      ? null
      : String(body.file_url).trim() || null;
  const file_name =
    body?.file_name === null || body?.file_name === undefined || body?.file_name === ''
      ? null
      : String(body.file_name).trim() || null;

  if (!title || !content) {
    return res.status(400).json({ error: 'title and content are required' });
  }

  const { data: inserted, error: insertErr } = await admin
    .from('notifications')
    .insert({
      title,
      content,
      file_url,
      file_name,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error('create-notification insert', insertErr);
    return res.status(400).json({ error: insertErr.message });
  }

  return res.status(200).json({ id: inserted.id });
}
