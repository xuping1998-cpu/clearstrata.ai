import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { getAuthErrorMessage } from '../lib/authErrorMessages';
import { DEFAULT_PROPERTY_ID } from '../lib/defaultProperty';
import { AuthPromoPanel } from './AuthPromoPanel';
import {
  APP_MODE_STORAGE_KEY,
  GUEST_PROPERTY_STORAGE_KEY,
  clearPublicDemoLocalStorage,
} from '../contexts/PropertyContext';
import { logPropertyEntrySubmitResult } from '../lib/propertyEntryGateLog';

function persistCurrentPropertyId(propertyId: string) {
  try {
    localStorage.setItem('currentPropertyId', propertyId);
    localStorage.setItem('clearstrata-current-property-id', propertyId);
  } catch {
    /* ignore */
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Property for roster bind: URL propertyId → guest scan → propertyCode resolve → default. */
async function resolveSignupPropertyIdAsync(): Promise<string> {
  try {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('propertyId')?.trim();
    if (pid && UUID_RE.test(pid)) return pid.toLowerCase();
  } catch {
    /* ignore */
  }
  try {
    const gid = localStorage.getItem(GUEST_PROPERTY_STORAGE_KEY);
    const g = gid?.trim();
    if (g && UUID_RE.test(g)) return g.toLowerCase();
  } catch {
    /* ignore */
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('propertyCode')?.trim();
    if (code) {
      const { data, error } = await supabase.rpc('resolve_property_for_join_request', {
        p_code: code,
      });
      if (!error && data != null) {
        const rows = Array.isArray(data) ? data : [data];
        const id = (rows[0] as { id?: string } | undefined)?.id;
        if (id && UUID_RE.test(String(id))) return String(id).toLowerCase();
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_PROPERTY_ID;
}

/** After scan-as-guest signup: bind stored property via invite (RLS-safe). */
async function claimGuestStoredPropertyAfterSignUp(): Promise<string | null> {
  let gid: string | null = null;
  try {
    gid = localStorage.getItem(GUEST_PROPERTY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (!gid) return null;
  const { data, error } = await supabase.rpc('ensure_invite_owner_membership', {
    p_property_id: gid,
  });
  if (error) {
    console.warn('ensure_invite_owner_membership', error);
    return null;
  }
  if (data == null) return null;
  const pid = String(data);
  try {
    localStorage.removeItem(GUEST_PROPERTY_STORAGE_KEY);
    persistCurrentPropertyId(pid);
  } catch {
    /* ignore */
  }
  return pid;
}

/** QR / deep link: ?propertyCode=BCS3736 — bind user to property via RPC (RLS-safe). */
async function claimPropertyFromUrlIfPresent(): Promise<string | null> {
  const params = new URLSearchParams(window.location.search);
  const propertyCode = params.get('propertyCode');
  if (!propertyCode?.trim()) return null;
  const { data, error } = await supabase.rpc('claim_property_by_code', {
    p_code: propertyCode.trim(),
  });
  if (error) {
    console.warn('claim_property_by_code', error);
    return null;
  }
  if (data == null) return null;
  return String(data);
}

/** After /demo/BCS3736 signup: membership on public demo property only (server-enforced). */
async function claimPublicDemoPropertyAfterSignUp(): Promise<string | null> {
  let gid: string | null = null;
  try {
    if (localStorage.getItem(APP_MODE_STORAGE_KEY) !== 'demo') return null;
    gid = localStorage.getItem(GUEST_PROPERTY_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!gid) return null;
  const { data, error } = await supabase.rpc('claim_public_demo_property_membership', {
    p_property_id: gid,
  });
  if (error) {
    console.warn('claim_public_demo_property_membership', error);
    return null;
  }
  if (data == null) return null;
  const pid = String(data);
  clearPublicDemoLocalStorage();
  persistCurrentPropertyId(pid);
  return pid;
}

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullNameEn, setFullNameEn] = useState('');
  const [fullNameZh, setFullNameZh] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [phone, setPhone] = useState('');
  /** Native <input type="date"> is unreliable as a controlled empty value in some browsers; keep value in a ref. */
  const moveInDateRef = useRef<HTMLInputElement>(null);
  const [moveInDateKey, setMoveInDateKey] = useState(0);
  const [languagePref, setLanguagePref] = useState<'en' | 'zh'>('en');
  const [error, setError] = useState('');
  /** Form submit in flight — not AuthContext session loading (avoids mistaken disabled button). */
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);

  const { signIn, signUp } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const passwordUpdated = searchParams.get('passwordUpdated') === '1';

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') {
      setIsLogin(false);
    }
  }, [searchParams]);

  const safeRedirectAfterAuth = (): boolean => {
    const raw = searchParams.get('redirect');
    if (!raw) return false;
    try {
      const path = decodeURIComponent(raw);
      if (path.startsWith('/') && !path.startsWith('//') && !path.includes('://')) {
        navigate(path, { replace: true });
        return true;
      }
    } catch {
      /* ignore malformed redirect */
    }
    return false;
  };

  const handleSendResetEmail = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError(t('auth_enter_email_required'));
      return;
    }
    setResetSending(true);
    setError('');
    setResetSuccess('');
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetErr) throw resetErr;
      setResetSuccess(t('auth_reset_email_sent'));
    } catch (err) {
      setError(getAuthErrorMessage(err, language === 'zh' ? 'zh' : 'en'));
    } finally {
      setResetSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetSuccess('');

    if (isLogin && forgotMode) {
      await handleSendResetEmail();
      return;
    }

    setIsSubmitting(true);

    try {
      if (isLogin) {
        const cleanEmail = email.trim().toLowerCase();
        await signIn(cleanEmail, password);
        clearPublicDemoLocalStorage();
        const claimedId = await claimPropertyFromUrlIfPresent();
        if (claimedId) {
          persistCurrentPropertyId(claimedId);
          navigate('/', { replace: true });
          return;
        }
        if (safeRedirectAfterAuth()) return;
      } else {
        const user = await signUp(email, password, fullNameEn, fullNameZh, unitNumber);

        if (user) {
          await supabase.from('profiles').update({ phone }).eq('id', user.id);

          const moveInRaw = moveInDateRef.current?.value?.trim() || '';
          const propertyId = await resolveSignupPropertyIdAsync();

          const { data: joinData, error: joinErr } = await supabase.rpc('submit_join_request', {
            p_property_id: propertyId,
            p_requested_role: 'owner',
            p_unit_number: unitNumber.trim(),
            p_note: null,
            p_full_name: fullNameEn.trim(),
            p_email: email.trim().toLowerCase(),
            p_phone: phone.trim() || null,
            p_invite_code: null,
            p_direct_invite_id: null,
            p_inferred_role: null,
            p_inferred_unit_number: null,
            p_move_in_date: moveInRaw || null,
            p_language_pref: languagePref,
          });

          logPropertyEntrySubmitResult({
            userId: user.id,
            email: email.trim().toLowerCase(),
            propertyId,
            unitNo: unitNumber.trim(),
            data: joinData,
            error: joinErr,
          });

          if (joinErr) {
            throw joinErr;
          }

          const jr = joinData as {
            ok?: boolean;
            success?: boolean;
            error?: string;
            message?: string;
            message_zh?: string;
            entry_path?: string;
            property_id?: string;
          } | null;

          const jrOk = jr != null && (jr.ok === true || jr.success === true);

          if (!jrOk) {
            if (jr?.error === 'property_closed' || jr?.message_zh?.includes('公开')) {
              throw new Error(
                language === 'zh'
                  ? '该物业当前不接受公开加入申请，请联系物业或业委会获取邀请。'
                  : 'This property is not open for public join requests. Ask your strata for an invite.',
              );
            }
            if (jr?.error === 'bad_property') {
              throw new Error(
                language === 'zh' ? '物业无效或不存在。' : 'Invalid or unknown property.',
              );
            }
            if (jr?.error === 'already_member') {
              if (jr.property_id) persistCurrentPropertyId(String(jr.property_id));
              const demoClaimed = await claimPublicDemoPropertyAfterSignUp();
              if (demoClaimed) {
                navigate('/', { replace: true });
                return;
              }
              const guestClaimed = await claimGuestStoredPropertyAfterSignUp();
              if (guestClaimed) {
                navigate('/', { replace: true });
                return;
              }
              const claimedId = await claimPropertyFromUrlIfPresent();
              if (claimedId) {
                persistCurrentPropertyId(claimedId);
                navigate('/', { replace: true });
                return;
              }
              if (safeRedirectAfterAuth()) return;
              navigate('/', { replace: true });
              return;
            }
            throw new Error(
              language === 'zh'
                ? (jr?.message_zh as string) || '无法完成加入申请，请稍后再试。'
                : (jr?.message as string) || 'Could not complete your join request. Please try again.',
            );
          }

          if (jr.entry_path === 'auto_approved' && jr.property_id) {
            persistCurrentPropertyId(String(jr.property_id));
            const demoClaimed = await claimPublicDemoPropertyAfterSignUp();
            if (demoClaimed) {
              navigate('/', { replace: true });
              return;
            }
            const guestClaimed = await claimGuestStoredPropertyAfterSignUp();
            if (guestClaimed) {
              navigate('/', { replace: true });
              return;
            }
            const claimedId = await claimPropertyFromUrlIfPresent();
            if (claimedId) {
              persistCurrentPropertyId(claimedId);
              navigate('/', { replace: true });
              return;
            }
            if (safeRedirectAfterAuth()) return;
            navigate('/', { replace: true });
            return;
          }

          if (jr.entry_path === 'pending_submitted') {
            navigate('/join/pending', { replace: true });
            return;
          }

          if (jr.property_id) {
            persistCurrentPropertyId(String(jr.property_id));
          }
          const demoClaimed = await claimPublicDemoPropertyAfterSignUp();
          if (demoClaimed) {
            navigate('/', { replace: true });
            return;
          }
          const guestClaimed = await claimGuestStoredPropertyAfterSignUp();
          if (guestClaimed) {
            navigate('/', { replace: true });
            return;
          }
          const claimedId = await claimPropertyFromUrlIfPresent();
          if (claimedId) {
            persistCurrentPropertyId(claimedId);
            navigate('/', { replace: true });
            return;
          }
          if (safeRedirectAfterAuth()) return;
          navigate('/join/pending', { replace: true });
          return;
        }
      }
    } catch (err) {
      setError(getAuthErrorMessage(err, language === 'zh' ? 'zh' : 'en'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setForgotMode(false);
    setResetSuccess('');
    setEmail('');
    setPassword('');
    setFullNameEn('');
    setFullNameZh('');
    setUnitNumber('');
    setPhone('');
    if (moveInDateRef.current) moveInDateRef.current.value = '';
    setMoveInDateKey((k) => k + 1);
    setLanguagePref('en');
    setStep(1);
    setError('');
    setShowPassword(false);
  };

  const passwordInputClass =
    'w-full pr-10 pl-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75] transition-colors';

  const loginCanSubmit =
    Boolean(email.trim()) && Boolean(password) && !isSubmitting && !forgotMode;
  const forgotCanSubmit = Boolean(email.trim()) && !resetSending;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <div className="flex w-full flex-col items-center justify-center px-6 py-8 lg:w-1/2 lg:py-10">
          <div className="mb-6 w-full max-w-md text-center lg:mb-8">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1D9E75] text-white shadow-lg shadow-[#1D9E75]/25 sm:h-16 sm:w-16">
              <Building2 className="size-7 sm:size-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">ClearStrata</h1>
            <p className="mt-1 text-sm text-gray-500">{t('auth_slogan')}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
              <Link to="/pricing" className="font-medium text-[#1D9E75] hover:underline">
                {t('nav_pricing')}
              </Link>
              <Link to="/contact" className="font-medium text-[#1D9E75] hover:underline">
                {t('nav_contact')}
              </Link>
            </div>
          </div>

          <div className="w-full max-w-md">
            <div className="overflow-visible rounded-2xl border border-gray-100 bg-white shadow-xl shadow-gray-200/60">
              <div className="flex border-b border-gray-100">
            <button
              type="button"
              onClick={() => { setIsLogin(true); resetForm(); }}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                isLogin
                  ? 'text-[#1D9E75] border-b-2 border-[#1D9E75] bg-emerald-50/40'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('auth_login')}
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); resetForm(); }}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                !isLogin
                  ? 'text-[#1D9E75] border-b-2 border-[#1D9E75] bg-emerald-50/40'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('auth_signup')}
            </button>
            <button
              type="button"
              onClick={toggleLanguage}
              className="px-4 py-3.5 text-sm font-medium text-gray-500 hover:text-gray-700 border-l border-gray-100 transition-colors"
            >
              {language === 'en' ? '中文' : 'EN'}
            </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 p-6">
            {passwordUpdated && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-sm flex justify-between gap-2 items-start">
                <span>{t('auth_password_updated_banner')}</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete('passwordUpdated');
                    setSearchParams(next, { replace: true });
                  }}
                  className="shrink-0 text-emerald-700 hover:text-emerald-900 text-lg leading-none"
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            )}
            {isLogin ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="login-email">
                    {t('auth_email')}
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required={!forgotMode}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75] transition-colors"
                    placeholder="name@example.com"
                  />
                </div>
                {!forgotMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="login-password">
                      {t('auth_password')}
                    </label>
                    <div className="relative">
                      <input
                        id="login-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t('auth_password_placeholder')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={passwordInputClass}
                        required
                        minLength={6}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {step === 1 ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="signup-email">
                        {t('auth_email')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75] transition-colors"
                        placeholder="name@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="signup-password">
                        {t('auth_password')} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="signup-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder={t('auth_password_placeholder')}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={passwordInputClass}
                          required
                          minLength={6}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? '🙈' : '👁️'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {language === 'en' ? 'Minimum 6 characters' : '至少6个字符'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="signup-name-en">
                          {t('auth_full_name_en')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="signup-name-en"
                          type="text"
                          value={fullNameEn}
                          onChange={(e) => setFullNameEn(e.target.value)}
                          required
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75] transition-colors"
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="signup-name-zh">
                          {t('auth_full_name_zh')}
                        </label>
                        <input
                          id="signup-name-zh"
                          type="text"
                          value={fullNameZh}
                          onChange={(e) => setFullNameZh(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75] transition-colors"
                          placeholder="张三"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="signup-unit">
                          {language === 'en' ? 'Unit Number' : '单元号'} <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="signup-unit"
                          type="text"
                          value={unitNumber}
                          onChange={(e) => setUnitNumber(e.target.value)}
                          required
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75] transition-colors"
                          placeholder="101"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="signup-phone">
                          {language === 'en' ? 'Phone' : '电话'}
                        </label>
                        <input
                          id="signup-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75] transition-colors"
                          placeholder="04xx xxx xxx"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!email || !password || !fullNameEn || !unitNumber) {
                          setError(language === 'en' ? 'Please fill in all required fields' : '请填写所有必填项');
                          return;
                        }
                        setError('');
                        setStep(2);
                      }}
                      className="w-full bg-[#1D9E75] text-white py-3 rounded-lg font-semibold hover:bg-[#178a66] transition-colors"
                    >
                      {language === 'en' ? 'Next' : '下一步'}
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="move-in">
                        {language === 'en' ? 'Move-in Date' : '入住日期'}
                      </label>
                      <input
                        key={`move-in-${moveInDateKey}`}
                        ref={moveInDateRef}
                        id="move-in"
                        type="date"
                        name="move_in_date"
                        min="1900-01-01"
                        max="2100-12-31"
                        autoComplete="off"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75] transition-colors cursor-pointer bg-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {language === 'en'
                          ? 'Tap the field to open the calendar and pick any date.'
                          : '点击输入框打开日历，可自由选择日期。'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {language === 'en' ? 'Language Preference' : '语言偏好'}
                      </label>
                      <div className="flex gap-3">
                        <label
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all ${
                            languagePref === 'en'
                              ? 'border-[#1D9E75] bg-emerald-50 text-[#1D9E75]'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name="lang"
                            value="en"
                            checked={languagePref === 'en'}
                            onChange={() => setLanguagePref('en')}
                            className="sr-only"
                          />
                          <span className="font-medium">English</span>
                        </label>
                        <label
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all ${
                            languagePref === 'zh'
                              ? 'border-[#1D9E75] bg-emerald-50 text-[#1D9E75]'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name="lang"
                            value="zh"
                            checked={languagePref === 'zh'}
                            onChange={() => setLanguagePref('zh')}
                            className="sr-only"
                          />
                          <span className="font-medium">中文</span>
                        </label>
                      </div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <p className="text-sm text-emerald-800">
                        {language === 'en'
                          ? 'You are registering as a property owner. Council roles are assigned by a site administrator after approval. Admin accounts cannot be created here.'
                          : '您将以业主身份注册。理事会（Council）角色须由管理员在后台审核后指定。系统管理员（Admin）账号不能通过此页面注册。'}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                      >
                        {language === 'en' ? 'Back' : '返回'}
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 bg-[#1D9E75] text-white py-3 rounded-lg font-semibold hover:bg-[#178a66] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            {t('loading')}
                          </>
                        ) : (
                          t('auth_signup')
                        )}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {isLogin && forgotMode && (
              <>
                <button
                  type="submit"
                  disabled={!forgotCanSubmit}
                  className="w-full bg-[#1D9E75] text-white py-3 rounded-lg font-semibold hover:bg-[#178a66] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {resetSending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      {t('loading')}
                    </>
                  ) : (
                    t('auth_send_reset_email')
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(false);
                    setError('');
                    setResetSuccess('');
                  }}
                  className="w-full text-[#1D9E75] py-2 text-sm font-medium hover:underline"
                >
                  {t('auth_back_to_login')}
                </button>
              </>
            )}

            {isLogin && !forgotMode && (
              <>
                <button
                  type="submit"
                  disabled={!loginCanSubmit}
                  className="w-full bg-[#1D9E75] text-white py-3 rounded-lg font-semibold hover:bg-[#178a66] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      {t('loading')}
                    </>
                  ) : (
                    t('auth_login')
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(true);
                    setError('');
                    setResetSuccess('');
                  }}
                  className="w-full text-center text-sm font-medium text-[#1D9E75] hover:underline py-1"
                >
                  {t('auth_forgot_password')}
                </button>
              </>
            )}

            {resetSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm">
                {resetSuccess}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
              </form>
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-center border-t border-gray-200 bg-gradient-to-b from-gray-50/80 to-emerald-50/30 px-6 py-8 lg:w-1/2 lg:border-l lg:border-t-0 lg:border-gray-100 lg:bg-gradient-to-br lg:from-white lg:to-emerald-50/40 lg:py-10">
          <AuthPromoPanel />
        </div>
      </div>
    </div>
  );
}
