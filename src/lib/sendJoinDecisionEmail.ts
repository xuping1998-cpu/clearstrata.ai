import { supabase } from './supabase';

/**
 * Attempts to send a join-decision email. Does NOT throw.
 * Returns `{ sent: true }` on success, `{ sent: false }` on any failure.
 * The caller must NOT treat a failed email as a failed approval/rejection.
 */
export async function sendJoinDecisionEmail(opts: {
  joinRequestId: string;
  decision: 'approved' | 'rejected';
  locale: 'zh' | 'en';
}): Promise<{ sent: boolean }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      console.warn('[sendJoinDecisionEmail] no session, skipping email');
      return { sent: false };
    }

    const { data, error } = await supabase.functions.invoke('send-join-decision-email', {
      body: {
        join_request_id: opts.joinRequestId,
        decision: opts.decision,
        locale: opts.locale,
      },
      headers: { Authorization: `Bearer ${token}` },
    });

    if (error) {
      console.warn('[sendJoinDecisionEmail] send join decision email failed — edge function error:', error?.message ?? error);
      return { sent: false };
    }
    if (data && typeof data === 'object' && data !== null && 'error' in data) {
      console.warn('[sendJoinDecisionEmail] send join decision email failed — response error:', data);
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    console.warn('[sendJoinDecisionEmail] send join decision email failed — unexpected error:', err);
    return { sent: false };
  }
}
