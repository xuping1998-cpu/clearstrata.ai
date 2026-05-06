import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/** Handles magic-link / OTP callback from Supabase Auth emails.
 *
 *  Two possible URL shapes:
 *  1. PKCE flow: /auth/callback?code=xxx&redirect=<originalPath>
 *     → must call exchangeCodeForSession(code) explicitly.
 *  2. Implicit / session already established:
 *     → fall back to polling getSession().
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code') ?? '';
      const raw = params.get('redirect') ?? '';

      // Resolve redirect target — only accept safe same-origin paths
      let redirectTo = '/';
      if (raw) {
        try {
          const decoded = decodeURIComponent(raw);
          if (decoded.startsWith('/') && !decoded.startsWith('//') && !decoded.includes('://')) {
            redirectTo = decoded;
          }
        } catch { /* ignore malformed redirect */ }
      }

      // ── Path 1: PKCE code present — exchange it for a session ──────────────
      if (code) {
        console.log('[AuthCallback] exchangeCodeForSession', code.slice(0, 8) + '…');
        const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;

        if (exchangeErr) {
          console.error('[AuthCallback] exchange failed', exchangeErr);
          setError('exchange_failed');
          return;
        }

        // Verify session was established after exchange
        const { data: afterExchange } = await supabase.auth.getSession();
        if (cancelled) return;

        if (!afterExchange.session) {
          console.error('[AuthCallback] no session after exchange');
          setError('exchange_failed');
          return;
        }

        console.log('[AuthCallback] exchange ok, redirect to', redirectTo);
        navigate(redirectTo, { replace: true });
        return;
      }

      // ── Path 2: No code — poll for an already-established session ──────────
      console.log('[AuthCallback] no code, polling getSession…');
      for (let i = 0; i < 15; i++) {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          console.log('[AuthCallback] session found via polling, redirect to', redirectTo);
          navigate(redirectTo, { replace: true });
          return;
        }
        await new Promise((r) => setTimeout(r, 400));
      }

      if (!cancelled) {
        console.error('[AuthCallback] timed out waiting for session');
        setError('no_session');
      }
    };

    void run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    const msg =
      error === 'exchange_failed'
        ? '登录验证失败，请返回入楼页面重新发送链接。'
        : '登录超时或链接已过期，请重新发送登录链接。';

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-xl p-8 text-center space-y-5">
          <div className="flex justify-center">
            <img src="/clearstrata-hero-logo.png" alt="ClearStrata" className="w-20 h-auto" />
          </div>
          <p className="text-base font-semibold text-red-700">{msg}</p>
          <p className="text-sm text-gray-500">
            请返回入楼页面，重新填写房号并发送登录邮件。
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-700 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 flex flex-col items-center justify-center p-6 gap-4">
      <img src="/clearstrata-hero-logo.png" alt="ClearStrata" className="w-20 h-auto" />
      <Loader2 className="w-8 h-8 text-[#1D9E75] animate-spin" />
      <p className="text-sm text-gray-600">正在登录，请稍候...</p>
    </div>
  );
}
