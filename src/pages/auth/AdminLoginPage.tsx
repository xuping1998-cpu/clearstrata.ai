import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthErrorMessage } from '../../lib/authErrorMessages';
import { consumePendingRedirect } from '../../lib/pendingRedirect';

export function AdminLoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = Boolean(email.trim()) && Boolean(password) && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signIn(email.trim().toLowerCase(), password);

      // Honour redirect param if present and safe
      const raw = searchParams.get('redirect');
      if (raw) {
        try {
          const path = decodeURIComponent(raw);
          if (path.startsWith('/') && !path.startsWith('//') && !path.includes('://')) {
            navigate(path, { replace: true });
            return;
          }
        } catch { /* ignore */ }
      }

      const pending = consumePendingRedirect();
      if (pending) {
        navigate(pending, { replace: true });
        return;
      }

      navigate('/', { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err, 'zh'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-md p-8 space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <img src="/clearstrata-hero-logo.png" alt="ClearStrata" className="h-10 w-auto" />
        </div>

        <div className="text-center">
          <h1 className="text-lg font-bold text-gray-900">管理员登录</h1>
          <p className="text-xs text-gray-400 mt-0.5">Admin Sign In</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
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

          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 py-3 font-semibold text-white text-sm transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            登录
          </button>
        </form>

        <p className="text-center text-xs text-gray-400">
          业主请{' '}
          <a href="/" className="text-gray-500 hover:underline">
            返回首页
          </a>
          {' '}使用「进入物业」入口
        </p>
      </div>
    </div>
  );
}
