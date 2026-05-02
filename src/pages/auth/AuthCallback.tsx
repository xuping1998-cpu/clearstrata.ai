import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/** Handles the magic-link / OTP callback from Supabase Auth emails.
 *  Supabase redirects to /auth/callback?redirect=<originalPath> after verifying the token.
 *  This page waits for the session to be established, then forwards the user to `redirect`. */
export function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const tryGetSession = async () => {
      // Supabase automatically exchanges the token from the URL hash/query params
      // when the page loads. We poll briefly to wait for the session.
      let attempt = 0;
      const maxAttempts = 10;

      while (attempt < maxAttempts) {
        const { data, error: sessionErr } = await supabase.auth.getSession();
        if (cancelled) return;

        if (sessionErr) {
          setError('登录失败或链接已过期');
          return;
        }

        if (data.session?.user) {
          const raw = searchParams.get('redirect');
          let target = '/';
          if (raw) {
            try {
              const decoded = decodeURIComponent(raw);
              if (decoded.startsWith('/') && !decoded.startsWith('//') && !decoded.includes('://')) {
                target = decoded;
              }
            } catch { /* ignore malformed redirect */ }
          }
          navigate(target, { replace: true });
          return;
        }

        // Session not ready yet — wait 300ms before retrying
        await new Promise((res) => setTimeout(res, 300));
        attempt++;
      }

      if (!cancelled) {
        setError('登录失败或链接已过期');
      }
    };

    void tryGetSession();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-xl p-8 text-center space-y-5">
          <div className="flex justify-center">
            <img src="/clearstrata-hero-logo.png" alt="ClearStrata" className="w-20 h-auto" />
          </div>
          <p className="text-base font-semibold text-red-700">{error}</p>
          <p className="text-sm text-gray-500">该入楼链接可能已过期，请重新扫描二维码获取新链接。</p>
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
