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
    // 解析请求体
    let body;
    if (typeof req.body === 'object' && req.body !== null && !Buffer.isBuffer(req.body)) {
      body = req.body;
    } else if (typeof req.body === 'string') {
      const raw = req.body.trim();
      body = raw ? JSON.parse(raw) : {};
    } else {
      // 如果 req.body 是空的，手动解析
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

    const baseUrl = supabaseUrl.replace(/\/$/, '');

    // 诊断：Vercel 出站能否访问该 Supabase 主机（与 SUPABASE_URL 对比用）
    const SUPABASE_CONNECTIVITY_PROBE =
      'https://bolt-native-database-64671878.supabase.co';
    console.log('=== Supabase connectivity probe (diagnostic) ===');
    console.log('Probe URL (fixed):', SUPABASE_CONNECTIVITY_PROBE);
    console.log('Configured SUPABASE_URL:', supabaseUrl);
    const probeStarted = Date.now();
    try {
      const probeRes = await fetch(SUPABASE_CONNECTIVITY_PROBE, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(15000),
      });
      const probeMs = Date.now() - probeStarted;
      console.log('Probe: success (TCP/TLS + HTTP response received)');
      console.log('Probe status:', probeRes.status, probeRes.statusText);
      console.log('Probe elapsed ms:', probeMs);
    } catch (probeErr) {
      const probeMs = Date.now() - probeStarted;
      console.error('Probe: FETCH FAILED (Vercel may not reach this host)');
      console.error('Probe elapsed ms:', probeMs);
      console.error('Probe error:', probeErr);
      if (probeErr && typeof probeErr === 'object' && 'cause' in probeErr) {
        console.error('Probe error.cause:', probeErr.cause);
      }
    }

    console.log('Calling Supabase (auth token)...');
    const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    console.log('Supabase status:', response.status);
    const data = await response.json();
    console.log('Supabase response:', data);

    return res.status(response.status).json(data);
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
