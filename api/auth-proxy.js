function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

export default async (req, res) => {
  const supabaseUrl = 'https://bolt-native-database-64671878.supabase.co';
  const supabaseKey = 'sb_publishable_2x4TkloQxM1TN_LuCjf5pQ_IgSz34jH';

  // 设置 CORS 头，避免跨域问题
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (body == null || body === '') {
      body = await readJsonBody(req);
    } else if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    const { email, password } = body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : String(error),
    });
  }
};
