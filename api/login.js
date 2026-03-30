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

    const supabaseUrl = 'https://bolt-native-database-64671878.supabase.co';
    const supabaseKey = 'sb_publishable_2x4TkloQxM1TN_LuCjf5pQ_IgSz34jH';

    console.log('Calling Supabase...');
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
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
