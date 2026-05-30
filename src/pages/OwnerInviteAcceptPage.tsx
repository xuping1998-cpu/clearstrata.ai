import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * Owner Invite — two-step DIRECT acceptance.
 *
 * The owner clicks /owner-invite?token=... and is taken straight into the
 * property. This page:
 *   1. Reads token from the URL.
 *   2. Auto-calls `accept-owner-invite` (no password / no OTP / no form).
 *   3. On success with action_link → window.location.href = action_link
 *      (Supabase magic link establishes the session, then redirects into the app).
 *   4. On success without action_link → "invitation accepted, please log in".
 *   5. On error → friendly bilingual message.
 *
 * STRICT: never reuses StaffInviteAcceptPage / staff_invites / /entry; no inputs.
 */

interface AcceptPayload {
  ok?: boolean;
  code?: string;
  message?: string;
  property_id?: string;
  property_name?: string;
  action_link?: string | null;
  fallback_login?: string | null;
}

type Phase = 'accepting' | 'redirecting' | 'accepted_login' | 'error';

function resolveErrorMessage(code: string | undefined): { zh: string; en: string } {
  switch (code) {
    case 'invite_already_used':
      return { zh: '邀请已使用，请登录。', en: 'Invitation already used. Please log in.' };
    case 'conflict_existing_member':
      return {
        zh: '该邮箱已是其他身份成员，请联系管理员。',
        en: 'This email is already a member with another role. Please contact your administrator.',
      };
    case 'invalid_or_expired':
    default:
      return { zh: '邀请无效或已过期。', en: 'Invitation is invalid or has expired.' };
  }
}

export function OwnerInviteAcceptPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token')?.trim() ?? '';

  const [phase, setPhase] = useState<Phase>('accepting');
  const [errorMsg, setErrorMsg] = useState<{ zh: string; en: string } | null>(null);
  const [loginUrl, setLoginUrl] = useState<string>('/login');

  const inflightRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setPhase('error');
      setErrorMsg({ zh: '链接无效：缺少邀请 token。', en: 'Invalid link: missing invitation token.' });
      return;
    }
    if (inflightRef.current) return;
    inflightRef.current = true;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('accept-owner-invite', {
          body: { token },
        });
        const p = (data ?? null) as AcceptPayload | null;

        if (error && !p) {
          setPhase('error');
          setErrorMsg({ zh: '网络异常，请稍后重试。', en: 'Network error. Please try again later.' });
          return;
        }

        if (p?.ok === true) {
          if (typeof p.action_link === 'string' && p.action_link) {
            setPhase('redirecting');
            window.location.href = p.action_link;
            return;
          }
          if (typeof p.fallback_login === 'string' && p.fallback_login) {
            setLoginUrl(p.fallback_login);
          }
          setPhase('accepted_login');
          return;
        }

        setPhase('error');
        setErrorMsg(resolveErrorMessage(p?.code));
      } catch {
        setPhase('error');
        setErrorMsg({ zh: '网络异常，请稍后重试。', en: 'Network error. Please try again later.' });
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/40 to-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-4 text-center">
        <img src="/clearstrata-hero-logo.png" alt="ClearStrata" className="h-10 w-auto mx-auto" />

        {phase === 'accepting' || phase === 'redirecting' ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="w-8 h-8 text-clearstrata-ui-primary animate-spin" />
            <p className="text-sm text-gray-700 font-medium">正在接受业主邀请…</p>
            <p className="text-xs text-gray-400">Accepting owner invitation…</p>
          </div>
        ) : null}

        {phase === 'accepted_login' ? (
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-900 font-medium">邀请已接受，请登录。</p>
            <p className="text-xs text-gray-500">Invitation accepted. Please log in.</p>
            <button
              type="button"
              onClick={() => navigate(loginUrl, { replace: true })}
              className="w-full mt-2 py-3 rounded-xl bg-[#35C3D6] text-white font-semibold text-sm hover:bg-[#2bb0c2]"
            >
              前往登录 / Go to login
            </button>
          </div>
        ) : null}

        {phase === 'error' ? (
          <div className="space-y-3 py-2">
            <div className="rounded-xl px-3 py-2 text-sm bg-red-50 text-red-900 border border-red-200">
              <p>{errorMsg?.zh ?? '无法接受邀请。'}</p>
              <p className="text-xs text-red-700 mt-1">{errorMsg?.en ?? 'Unable to accept the invitation.'}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="text-sm text-gray-500 hover:text-gray-800 underline"
            >
              前往登录 / Go to login
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
