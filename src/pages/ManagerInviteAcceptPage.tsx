import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type ApiPayload = {
  ok?: boolean;
  preview?: boolean;
  email?: string;
  propertyName?: string;
  code?: string;
  message?: string;
};

/** Edge function uses HTTP 200 for business outcomes so `invoke()` always parses `data`. */

export function ManagerInviteAcceptPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token')?.trim() ?? '';

  const [phase, setPhase] = useState<
    'loading' | 'form' | 'submitting' | 'success' | 'error'
  >('loading');
  const [inviteEmail, setInviteEmail] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  const inflightPreviewRef = useRef(false);
  const redirectedAfterSuccessRef = useRef(false);

  const fetchPreview = useCallback(async () => {
    if (!token || inflightPreviewRef.current) return;
    inflightPreviewRef.current = true;
    setPhase('loading');
    setErrorText(null);

    try {
      const { data } = await supabase.functions.invoke('accept-manager-invite', {
        body: { token },
      });
      const p = data as ApiPayload | null;

      if (p?.preview === true && typeof p.email === 'string') {
        setInviteEmail(p.email);
        setPropertyName(typeof p.propertyName === 'string' ? p.propertyName : '');
        setPhase('form');
        return;
      }

      setPhase('error');
      setErrorText(resolvePreviewErrorMessage(p?.code, p?.message));
    } catch {
      setPhase('error');
      setErrorText('网络异常，请稍后重试');
    } finally {
      inflightPreviewRef.current = false;
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setPhase('error');
      setErrorText('链接无效：缺少邀请 token');
      return;
    }
    void fetchPreview();
  }, [token, fetchPreview]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    if (password.length < 8) {
      setErrorText('密码至少 8 位');
      return;
    }
    if (password !== confirmPassword) {
      setErrorText('两次输入的密码不一致');
      return;
    }

    setPhase('submitting');
    try {
      const { data } = await supabase.functions.invoke('accept-manager-invite', {
        body: { token, password },
      });
      const p = data as ApiPayload | null;

      if (p?.ok === true && typeof p.email === 'string') {
        setInviteEmail(p.email);
        setPhase('success');

        const loginUrl = `/login?email=${encodeURIComponent(p.email)}`;
        if (!redirectedAfterSuccessRef.current) {
          redirectedAfterSuccessRef.current = true;
          window.setTimeout(() => {
            navigate(loginUrl, { replace: true });
          }, 2000);
        }
        return;
      }

      setPhase('form');
      setErrorText(resolveSubmitErrorMessage(p?.code, p?.message));
    } catch {
      setPhase('form');
      setErrorText('网络异常，请稍后重试');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/40 to-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-4 text-center">
        <img
          src="/clearstrata-hero-logo.png"
          alt="ClearStrata"
          className="h-10 w-auto mx-auto"
        />

        {phase === 'loading' ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <Loader2 className="w-8 h-8 text-clearstrata-ui-primary animate-spin" />
            <p className="text-sm text-gray-600">加载邀请…</p>
            <p className="text-xs text-gray-400">Loading invitation…</p>
          </div>
        ) : null}

        {phase === 'form' || phase === 'submitting' ? (
          <>
            <h1 className="text-lg font-bold text-gray-900">接受物业经理邀请</h1>
            <p className="text-xs text-gray-400">Accept property manager invitation</p>

            <div className="text-left rounded-xl bg-gray-50 border border-gray-100 px-3 py-3 space-y-1 text-sm">
              <p>
                <span className="text-gray-500">邮箱 Email</span>
                <span className="block font-mono text-gray-900 break-all">{inviteEmail}</span>
              </p>
              <p className="pt-2">
                <span className="text-gray-500">物业 Property</span>
                <span className="block text-gray-900">{propertyName || '—'}</span>
              </p>
            </div>

            <form onSubmit={(e) => void handleAccept(e)} className="space-y-3 text-left">
              <div>
                <label htmlFor="mi-pw1" className="block text-sm font-medium text-gray-700 mb-1">
                  设置密码
                </label>
                <input
                  id="mi-pw1"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  minLength={8}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-clearstrata-ui-primary focus:ring-2 focus:ring-clearstrata-ui-primary/20 outline-none"
                  placeholder="至少 8 位"
                  disabled={phase === 'submitting'}
                />
                <p className="text-xs text-gray-400 mt-0.5">Set password (min 8 characters)</p>
              </div>
              <div>
                <label htmlFor="mi-pw2" className="block text-sm font-medium text-gray-700 mb-1">
                  确认密码
                </label>
                <input
                  id="mi-pw2"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  minLength={8}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-clearstrata-ui-primary focus:ring-2 focus:ring-clearstrata-ui-primary/20 outline-none"
                  placeholder="再次输入密码"
                  disabled={phase === 'submitting'}
                />
                <p className="text-xs text-gray-400 mt-0.5">Confirm password</p>
              </div>

              {errorText ? (
                <div
                  role="alert"
                  className="rounded-xl px-3 py-2 text-sm bg-red-50 text-red-900 border border-red-200"
                >
                  {errorText}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={phase === 'submitting'}
                className="w-full py-3 rounded-xl bg-[#1D9E75] text-white font-semibold text-sm hover:bg-[#178a66] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {phase === 'submitting' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : null}
                设置密码并接受邀请
              </button>
              <p className="text-xs text-gray-400 text-center">
                Set password and accept invitation
              </p>
            </form>
          </>
        ) : null}

        {phase === 'success' ? (
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-800 font-medium">
              邀请已接受，请使用刚设置的密码登录。
            </p>
            <p className="text-xs text-gray-400">
              Invitation accepted. Please sign in with your new password. Redirecting to login…
            </p>
            <Loader2 className="w-6 h-6 text-clearstrata-ui-primary animate-spin mx-auto" />
          </div>
        ) : null}

        {phase === 'error' ? (
          <div className="space-y-3 py-2">
            <div className="rounded-xl px-3 py-2 text-sm bg-red-50 text-red-900 border border-red-200">
              {errorText ?? '无法接受邀请'}
            </div>
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="text-sm text-gray-500 hover:text-gray-800 underline"
            >
              返回首页
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function resolvePreviewErrorMessage(code: string | undefined, message: string | undefined): string {
  if (typeof message === 'string' && message) return message;
  switch (code) {
    case 'EXPIRED':
      return '邀请已过期，请联系业委会发送新邀请';
    case 'NOT_PENDING':
      return '邀请不可用或已被处理';
    default:
      return '邀请无效或已失效';
  }
}

function resolveSubmitErrorMessage(code: string | undefined, message: string | undefined): string {
  if (typeof message === 'string' && message) return message;
  switch (code) {
    case 'WEAK_PASSWORD':
      return '密码至少 8 位';
    case 'EXISTING_OTHER_ROLE':
      return '该账号在本物业已是其他角色，无法用此链接成为物业经理';
    case 'RACE':
      return '邀请已被处理，请直接登录或与业委会联系';
    default:
      return '接受邀请失败，请稍后重试或联系业委会';
  }
}
