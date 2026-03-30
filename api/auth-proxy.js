export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const supabaseUrl = 'https://bolt-native-database-64671878.supabase.co';
  const supabaseKey = 'sb_publishable_2x4TkloQxM1TN_LuCjf5pQ_IgSz34jH';

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { email, password } = await request.json();

    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
