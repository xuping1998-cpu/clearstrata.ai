import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getAuthErrorMessage } from '../lib/authErrorMessages';
import { useLanguage } from '../contexts/LanguageContext';

export function ResetPassword() {
  const navigate = useNavigate();
  const { language, toggleLanguage } = useLanguage();
  const zh = language === 'zh';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (sessionReady) setLinkInvalid(false);
  }, [sessionReady]);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted && session) setSessionReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' && session) setSessionReady(true);
      if (session) setSessionReady(true);
    });

    const t = window.setTimeout(() => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (mounted && !session) setLinkInvalid(true);
      });
    }, 8000);

    return () => {
      mounted = false;
      window.clearTimeout(t);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError(zh ? '新密码不能为空' : 'New password is required.');
      return;
    }
    if (password.length < 8) {
      setError(zh ? '密码长度至少 8 位' : 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError(zh ? '两次输入的密码不一致' : 'Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) {
        setError(getAuthErrorMessage(updateErr, zh ? 'zh' : 'en'));
        return;
      }
      setSuccess(true);
      await supabase.auth.signOut();
      setTimeout(() => {
        navigate('/?passwordUpdated=1', { replace: true });
      }, 800);
    } catch (err) {
      setError(getAuthErrorMessage(err, zh ? 'zh' : 'en'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordInputClass =
    'w-full pr-10 pl-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75] transition-colors';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50/80 via-white to-gray-50 p-4">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1D9E75] text-white mb-4 shadow-lg shadow-[#1D9E75]/25">
          <Building2 size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">ClearStrata</h1>
        <p className="text-gray-500 text-sm mt-1">
          {zh ? '重设密码' : 'Reset password'}
        </p>
        <div className="mt-3">
          <button
            type="button"
            onClick={toggleLanguage}
            className="text-sm font-medium text-[#1D9E75] hover:underline"
          >
            {zh ? 'EN' : '中文'}
          </button>
        </div>
      </div>

      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-100 overflow-visible p-6">
          {linkInvalid && !sessionReady && !success ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-red-700">
                {zh
                  ? '链接无效或已过期，请重新在登录页申请「忘记密码」。'
                  : 'This link is invalid or has expired. Request a new reset from the sign-in page.'}
              </p>
              <Link
                to="/"
                className="inline-block w-full text-center bg-[#1D9E75] text-white py-3 rounded-lg font-semibold hover:bg-[#178a66]"
              >
                {zh ? '返回登录' : 'Back to sign in'}
              </Link>
            </div>
          ) : !sessionReady && !success ? (
            <div className="text-center space-y-4">
              <Loader2 className="w-10 h-10 text-[#1D9E75] animate-spin mx-auto" />
              <p className="text-sm text-gray-600">
                {zh ? '正在验证重置链接…' : 'Verifying reset link…'}
              </p>
            </div>
          ) : success ? (
            <div className="text-center space-y-3">
              <p className="text-emerald-700 font-medium">
                {zh ? '密码修改成功，正在跳转登录…' : 'Password updated. Redirecting…'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 text-center">
                {zh ? '重设密码' : 'Set a new password'}
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="reset-pw">
                  {zh ? '新密码' : 'New password'}
                </label>
                <div className="relative">
                  <input
                    id="reset-pw"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className={passwordInputClass}
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    aria-label={showPassword ? 'Hide' : 'Show'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {zh ? '至少 8 位字符' : 'At least 8 characters'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="reset-pw2">
                  {zh ? '确认新密码' : 'Confirm new password'}
                </label>
                <input
                  id="reset-pw2"
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75] transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#1D9E75] text-white py-3 rounded-lg font-semibold hover:bg-[#178a66] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {zh ? '提交中…' : 'Saving…'}
                  </>
                ) : (
                  zh ? '确认修改' : 'Confirm'
                )}
              </button>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <p className="text-center text-sm">
                <Link to="/" className="text-[#1D9E75] font-medium hover:underline">
                  {zh ? '返回登录' : 'Back to sign in'}
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
