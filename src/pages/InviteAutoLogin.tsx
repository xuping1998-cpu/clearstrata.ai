import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProperty } from '@/contexts/PropertyContext';

type ConsumeOk = {
  ok: true;
  access_token: string;
  refresh_token: string;
  meetingId: string;
  propertyId: string;
};

type ConsumeResponse = {
  ok?: boolean;
  message?: string;
  access_token?: string;
  refresh_token?: string;
  meetingId?: string;
  propertyId?: string;
};

/** Dedupes React Strict Mode double-mount so the token is only consumed once per page load. */
const consumeInvitePromises = new Map<string, Promise<ConsumeOk>>();

function consumeInviteOnce(token: string): Promise<ConsumeOk> {
  const hit = consumeInvitePromises.get(token);
  if (hit) return hit;

  const p = (async (): Promise<ConsumeOk> => {
    const { data, error } = await supabase.functions.invoke<ConsumeResponse>('consume-invite-token', {
      body: { token },
    });

    if (error) {
      throw new Error(error.message || 'Network error');
    }

    const d = data;
    if (
      !d ||
      d.ok !== true ||
      !d.access_token ||
      !d.refresh_token ||
      !d.meetingId ||
      !d.propertyId
    ) {
      throw new Error(typeof d?.message === 'string' ? d.message : 'Invalid or expired invite link');
    }

    return {
      ok: true,
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      meetingId: d.meetingId,
      propertyId: d.propertyId,
    };
  })();

  consumeInvitePromises.set(token, p);
  return p;
}

/**
 * Meeting invite magic link: `/invite?token=…` → session → `/meetings/:id?entry=invite`.
 * Staff property invites use `/invite?code=…` (handled by JoinWithCode when `token` is absent).
 */
export function InviteAutoLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language, toggleLanguage } = useLanguage();
  const { setCurrentPropertyId } = useProperty();
  const zh = language === 'zh';

  const token = (searchParams.get('token') || '').trim();
  const [error, setError] = useState<string | null>(null);
  const didNavigate = useRef(false);

  useEffect(() => {
    if (!token) {
      setError(zh ? '链接无效：缺少 token。' : 'Invalid link: missing token.');
      return;
    }

    let cancelled = false;

    void consumeInviteOnce(token)
      .then(async (payload) => {
        if (cancelled) return;

        const { error: sessionErr } = await supabase.auth.setSession({
          access_token: payload.access_token,
          refresh_token: payload.refresh_token,
        });

        if (cancelled) return;
        if (sessionErr) {
          setError(sessionErr.message || (zh ? '无法建立登录会话。' : 'Could not establish session.'));
          return;
        }

        setCurrentPropertyId(payload.propertyId);

        if (didNavigate.current) return;
        didNavigate.current = true;
        navigate(`/meetings/${payload.meetingId}?entry=invite`, { replace: true });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg || (zh ? '邀请无效或已使用。' : 'This invite is invalid or has already been used.'));
      });

    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <Link to="/" className="flex items-center gap-2 text-slate-800 font-semibold">
          <Building2 className="h-6 w-6 text-emerald-600" />
          ClearStrata
        </Link>
        <button
          type="button"
          onClick={toggleLanguage}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          {zh ? 'English' : '中文'}
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          {!token || error ? (
            <>
              <p className="text-red-600 text-sm mb-4">{error || (zh ? '链接无效。' : 'Invalid link.')}</p>
              <Link to="/login" className="text-emerald-700 text-sm font-medium hover:underline">
                {zh ? '前往登录' : 'Go to sign in'}
              </Link>
            </>
          ) : (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mx-auto mb-4" />
              <p className="text-slate-700 text-sm">
                {zh ? '正在验证邀请并进入会议…' : 'Verifying your invite and opening the meeting…'}
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
