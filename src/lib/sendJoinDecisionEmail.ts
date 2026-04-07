import { supabase } from './supabase';

/**
 * Fire-and-forget: does not throw; logs on failure. Approval RPC success is never rolled back.
 */
export async function sendJoinDecisionEmail(opts: {
  joinRequestId: string;
  decision: 'approved' | 'rejected';
  locale: 'zh' | 'en';
}): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      console.warn('sendJoinDecisionEmail: no session');
      return;
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
      console.error('send approval email failed:', error);
      return;
    }
    if (data && typeof data === 'object' && data !== null && 'error' in data) {
      console.error('send approval email failed:', data);
    }
  } catch (err) {
    console.error('send approval email failed:', err);
  }
}
