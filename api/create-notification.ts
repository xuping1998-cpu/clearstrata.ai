/**
 * Vercel serverless: POST /api/create-notification
 * Uses Supabase service role for INSERT (bypasses RLS). Validates JWT + council/manager,
 * derives author_name / author_role from profiles (same rules as DB trigger).
 *
 * This repo is Vite + Vercel: handlers live under root `api/`, not Next.js `pages/api/`.
 */
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

function displayAuthorRole(role: string): string {
  if (role === 'council') return '业委会';
  if (role === 'manager') return '物业经理';
  return role;
}

function authorDisplayName(fullNameZh: string | null | undefined, fullNameEn: string | null | undefined): string {
  const zh = typeof fullNameZh === 'string' ? fullNameZh.trim() : '';
  if (zh !== '') return zh;
  const en = typeof fullNameEn === 'string' ? fullNameEn.trim() : '';
  if (en !== '') return en;
  return '—';
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

  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('role, full_name_en, full_name_zh')
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr || !profile) {
    return res.status(403).json({ error: 'Profile not found' });
  }

  const role = typeof profile.role === 'string' ? profile.role : '';
  if (role !== 'council' && role !== 'manager') {
    return res.status(403).json({ error: 'Only council or property manager can publish' });
  }

  const author_name = authorDisplayName(profile.full_name_zh, profile.full_name_en);
  const author_role = displayAuthorRole(role);

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

  const rawUrl = body.fileUrl ?? body.file_url;
  const rawName = body.fileName ?? body.file_name;
  const file_url =
    rawUrl === null || rawUrl === undefined || rawUrl === '' ? null : String(rawUrl).trim() || null;
  const file_name =
    rawName === null || rawName === undefined || rawName === '' ? null : String(rawName).trim() || null;

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
      author_name,
      author_role,
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error('create-notification insert', insertErr);
    return res.status(500).json({ error: insertErr.message || 'Insert failed' });
  }

  return res.status(200).json({ id: inserted.id });
}
