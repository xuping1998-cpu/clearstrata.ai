import { supabase } from './supabase';

export type CreateOwnerNotificationPayload = {
  title: string;
  content: string;
  file_url: string | null;
  file_name: string | null;
};

/**
 * POST /api/create-notification (Vercel serverless). Uses caller JWT + service role on server.
 */
export async function createOwnerNotificationViaApi(payload: CreateOwnerNotificationPayload): Promise<{ id: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('NOT_SIGNED_IN');
  }

  const res = await fetch('/api/create-notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      title: payload.title,
      content: payload.content,
      file_url: payload.file_url,
      file_name: payload.file_name,
    }),
  });

  const json = (await res.json().catch(() => ({}))) as { id?: string; error?: string };

  if (!res.ok) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }

  if (!json.id) {
    throw new Error('Invalid response from server');
  }

  return { id: json.id };
}
