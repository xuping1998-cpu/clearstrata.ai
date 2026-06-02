import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthErrorMessage } from '../../lib/authErrorMessages';
import { consumePendingRedirect } from '../../lib/pendingRedirect';
import { supabase } from '../../lib/supabase';

const CREATE_PROPERTY_PATH = '/onboarding/create-property';

type AuthTab = 'signin' | 'signup';

function isCreatePropertyRedirectTarget(redirectRaw: string | null): boolean {
  if (!redirectRaw) return false;
  try {
    const path = decodeURIComponent(redirectRaw);
    return path === CREATE_PROPERTY_PATH || path.includes(CREATE_PROPERTY_PATH);
  } catch {
    return redirectRaw.includes(CREATE_PROPERTY_PATH);
  }
}

function resolveSafeRedirectPath(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const path = decodeURIComponent(raw);
    if (path.startsWith('/') && !path.startsWith('//') && !path.includes('://')) {
      return path;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function AdminLoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isCreatePropertyRedirect = useMemo(
    () => isCreatePropertyRedirectTarget(searchParams.get('redirect')),
    [searchParams],
  );

  const [authTab, setAuthTab] = useState<AuthTab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailConfirmNotice, setEmailConfirmNotice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const emailParam = searchParams.get('email');

  useEffect(() => {
    if (!emailParam?.trim()) return;
    try {
      setEmail(decodeURIComponent(emailParam.trim()));
    } catch {
      setEmail(emailParam.trim());
    }
  }, [emailParam]);

  const canSubmitSignIn = Boolean(email.trim()) && Boolean(password) && !submitting;
  const canSubmitSignUp =
    Boolean(fullName.trim()) && Boolean(email.trim()) && Boolean(password) && !submitting;

  const navigateAfterAuth = () => {
    const path = resolveSafeRedirectPath(searchParams.get('redirect'));
    if (path) {
      navigate(path, { replace: true });
      return;
    }
    const pending = consumePendingRedirect();
    if (pending) {
      navigate(pending, { replace: true });
      return;
    }
    navigate('/', { replace: true });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailConfirmNotice(false);
    setSubmitting(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      navigateAfterAuth();
    } catch (err) {
      setError(getAuthErrorMessage(err, 'zh'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailConfirmNotice(false);
    setSubmitting(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const name = fullName.trim();
      const user = await signUp(cleanEmail, password, name, name, '');
      if (!user) {
        setError('注册失败，请稍后重试。');
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        navigate(CREATE_PROPERTY_PATH, { replace: true });
        return;
      }

      setEmailConfirmNotice(true);
      setAuthTab('signin');
    } catch (err) {
      setError(getAuthErrorMessage(err, 'zh'));
    } finally {
      setSubmitting(false);
    }
  };

  const switchTab = (tab: AuthTab) => {
    setAuthTab(tab);
    setError('');
    setEmailConfirmNotice(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-md p-8 space-y-6">
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs text-gray-500 hover:text-gray-700 hover:underline transition-colors text-left leading-snug"
          >
            <span className="block">← 返回首页</span>
            <span className="block">← Back to Home</span>
          </button>
        </div>

        <div className="flex justify-center">
          <img src="/clearstrata-hero-logo.png" alt="ClearStrata" className="h-10 w-auto" />
        </div>

        <div className="text-center">
          {isCreatePropertyRedirect ? (
            <>
              <h1 className="text-lg font-bold text-gray-900">创建物业账户</h1>
              <p className="mt-1 text-xs text-gray-500">Create Your Property Account</p>
              <p className="mt-2 text-sm text-gray-600">登录或注册后继续创建你的物业</p>
              <p className="mt-0.5 text-xs text-gray-400">
                Sign in or register to continue creating your property
              </p>
            </>
          ) : (
            <>
              <h1 className="text-lg font-bold text-gray-900">管理员登录</h1>
              <p className="text-xs text-gray-400 mt-0.5">Admin Sign In</p>
            </>
          )}
        </div>

        {isCreatePropertyRedirect ? (
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => switchTab('signin')}
              className={`flex-1 rounded-md px-2 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                authTab === 'signin'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="block">已有账户登录</span>
              <span className="block text-[10px] font-medium text-gray-500 sm:text-xs">Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab('signup')}
              className={`flex-1 rounded-md px-2 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                authTab === 'signup'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="block">新用户注册</span>
              <span className="block text-[10px] font-medium text-gray-500 sm:text-xs">Create Account</span>
            </button>
          </div>
        ) : null}

        {emailConfirmNotice ? (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 space-y-1"
          >
            <p>请检查邮箱完成验证，然后返回本页登录继续创建物业。</p>
            <p className="text-xs text-emerald-800">
              Please check your email to confirm your account, then return here to sign in and continue
              creating your property.
            </p>
          </div>
        ) : null}

        {authTab === 'signup' && isCreatePropertyRedirect ? (
          <form onSubmit={(e) => void handleSignUp(e)} className="space-y-4">
            <div>
              <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700 mb-1">
                姓名 / Full name
              </label>
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 focus:outline-none"
                placeholder="张三 / Jane Doe"
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">
                邮箱 / Email
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
                密码 / Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 text-sm transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 focus:outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error ? (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmitSignUp}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-clearstrata-ui-primary py-3 font-semibold text-white text-sm transition-colors hover:bg-clearstrata-ui-primaryHover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              注册 / Create Account
            </button>
          </form>
        ) : (
          <form onSubmit={(e) => void handleSignIn(e)} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 mb-1">
                邮箱
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 focus:outline-none"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-1">
                密码
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 text-sm transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 focus:outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error ? (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmitSignIn}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 py-3 font-semibold text-white text-sm transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {isCreatePropertyRedirect ? '登录 / Sign In' : '登录'}
            </button>
          </form>
        )}

        {isCreatePropertyRedirect ? (
          <div className="text-center text-xs text-gray-500 space-y-1">
            <p>登录后将自动返回创建物业页面。</p>
            <p>You will return to the property creation page after signing in.</p>
          </div>
        ) : (
          <div className="text-center text-xs text-gray-400 space-y-3">
            <div className="space-y-1">
              <p>业主入口：返回首页后点击【进入物业】</p>
              <p>物业经理/职员：请联系理事会发送职员邀请</p>
            </div>
            <div className="space-y-1">
              <p>Owners: return home and use “Join Property”</p>
              <p>Staff/Managers: contact council for an invitation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
