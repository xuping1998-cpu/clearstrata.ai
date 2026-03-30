import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  console.log('=== /api/login called ===');
  console.log('Method:', req.method);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body;
    if (typeof req.body === 'object' && req.body !== null && !Buffer.isBuffer(req.body)) {
      body = req.body;
    } else if (typeof req.body === 'string') {
      const raw = req.body.trim();
      body = raw ? JSON.parse(raw) : {};
    } else {
      body = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
          try {
            const raw = Buffer.concat(chunks).toString('utf8').trim();
            resolve(raw ? JSON.parse(raw) : {});
          } catch (e) {
            reject(e);
          }
        });
        req.on('error', reject);
      });
    }

    const { email, password } = body || {};
    console.log('Received email:', email);

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
      return res.status(500).json({
        error: 'Server misconfiguration',
        message: 'SUPABASE_URL and SUPABASE_ANON_KEY must be set',
      });
    }

    const supabase = createClient(supabaseUrl.trim().replace(/\/$/, ''), supabaseKey.trim(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    console.log('Calling supabase.auth.signInWithPassword...');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.log('Supabase auth error:', error.message, 'status:', error.status);
      const status =
        typeof error.status === 'number' && error.status >= 400 && error.status < 600
          ? error.status
          : 400;
      return res.status(status).json({
        error: error.message,
        error_description: error.message,
      });
    }

    const session = data.session;
    if (!session) {
      console.error('signInWithPassword succeeded but session is null');
      return res.status(500).json({ error: 'No session returned' });
    }

    console.log('Login OK, returning tokens to client');
    // 与 GoTrue token 响应字段对齐，便于前端 setSession
    return res.status(200).json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      token_type: session.token_type,
      expires_in: session.expires_in,
      expires_at: session.expires_at,
      user: session.user,
    });
  } catch (err) {
    console.error('=== /api/login error ===');
    console.error(err);
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      error: 'Server error',
      message: message || 'Unknown error',
    });
  }
}
