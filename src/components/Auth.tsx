import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
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
import { trackPropertyEntryEvent } from '../lib/propertyEntryEvents';
import { demoEntryPath, MARKETING_DEMO_PROPERTY_CODE } from '@/lib/propertyEntryRoutes';
import { saveGuestExperienceDraft } from '@/lib/guestExperienceDraft';

import { consumePendingRedirect } from '../lib/pendingRedirect';

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

/** `/entry?propertyId=…` redirect after login — funnel `auth_ok` 归因用 */
function parseRedirectQueryForEntryFunnel(redirectRaw: string | null): {
  propertyId: string | null;
  inviteCode: string | null;
  source: string | null;
} {
  if (!redirectRaw) return { propertyId: null, inviteCode: null, source: null };
  try {
    const path = decodeURIComponent(redirectRaw);
    if (!path.startsWith('/') || path.includes('://')) {
      return { propertyId: null, inviteCode: null, source: null };
    }
    const q = path.indexOf('?');
    if (q < 0) return { propertyId: null, inviteCode: null, source: null };
    const sp = new URLSearchParams(path.slice(q + 1));
    const rawPid = (sp.get('propertyId') || sp.get('property_id') || '').trim();
    const pid = rawPid && UUID_RE.test(rawPid) ? rawPid.toLowerCase() : null;
    const inviteCode =
      (sp.get('inviteCode') || sp.get('invite_code') || sp.get('code') || '').trim() || null;
    const source = (sp.get('source') || '').trim() || null;
    return { propertyId: pid, inviteCode, source };
  } catch {
    return { propertyId: null, inviteCode: null, source: null };
  }
}

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

function isValidEmailBasic(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

/** One-time password for email sign-up from「进入物业」; user can reset via forgot password. */
function generateSecureEntryPassword(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex}Aa1!`;
}

type MainTab = 'guest' | 'property';
type LegacyOpen = 'none' | 'login' | 'signup';

export function Auth() {
  const [mainTab, setMainTab] = useState<MainTab>('guest');
  const [legacyOpen, setLegacyOpen] = useState<LegacyOpen>('none');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestBusy, setGuestBusy] = useState(false);
  const [epCode, setEpCode] = useState('');
  const [epBusy, setEpBusy] = useState(false);

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullNameEn, setFullNameEn] = useState('');
  const [fullNameZh, setFullNameZh] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [phone, setPhone] = useState('');
  /** Native <input type="date"> is unreliable as a controlled empty value in some browsers; keep value in a ref. */
  const moveInDateRef = useRef<HTMLInputElement>(null);
  const [languagePref, setLanguagePref] = useState<'en' | 'zh'>('en');
  const [error, setError] = useState('');
  /** Form submit in flight — not AuthContext session loading (avoids mistaken disabled button). */
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);

  const { signIn, signUp, session } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const passwordUpdated = searchParams.get('passwordUpdated') === '1';
  const passwordResetDone = searchParams.get('passwordReset') === '1';

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') {
      setIsLogin(false);
      setLegacyOpen('signup');
    }
    const pc = searchParams.get('propertyCode')?.trim();
    if (pc) {
      setEpCode(pc);
      setMainTab('property');
    }
  }, [searchParams]);

  const handleGuestDemo = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetSuccess('');
    const n = guestName.trim();
    const em = guestEmail.trim().toLowerCase();
    if (!n || !em) {
      setError(language === 'zh' ? '请填写姓名与邮箱。' : 'Please enter your name and email.');
      return;
    }
    if (!isValidEmailBasic(em)) {
      setError(language === 'zh' ? '邮箱格式不正确。' : 'Please enter a valid email address.');
      return;
    }
    setGuestBusy(true);
    try {
      saveGuestExperienceDraft({ name: n, email: em });
      navigate(demoEntryPath(MARKETING_DEMO_PROPERTY_CODE), { replace: false });
    } finally {
      setGuestBusy(false);
    }
  };

  const handlePropertyEnter = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetSuccess('');

    const code = (epCode.trim() || searchParams.get('propertyCode')?.trim() || '').trim();
    if (!code) {
      setError(language === 'zh' ? '请填写物业代号。' : 'Please enter your property code.');
      return;
    }

    setEpBusy(true);
    try {
      const { data, error } = await supabase.rpc('resolve_property_for_join_request', { p_code: code });
      if (error) {
        setError(language === 'zh' ? '无法查询该物业，请稍后重试。' : 'Could not look up this property. Try again later.');
        return;
      }
      const rows = Array.isArray(data) ? data : data != null ? [data] : [];
      const row = rows[0] as { id?: string } | undefined;
      const pid = row?.id != null ? String(row.id) : '';
      if (!pid) {
        setError(
          language === 'zh'
            ? '未找到该物业，请向业委会确认物业代号。'
            : 'Property not found. Please confirm the code with your strata council.',
        );
        return;
      }

      // Hand off everything to /entry — it handles OTP, whitelist, occupancy, and join
      navigate('/entry?propertyId=' + pid);
    } catch (err) {
      setError(getAuthErrorMessage(err, language === 'zh' ? 'zh' : 'en'));
    } finally {
      setEpBusy(false);
    }
  };
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

        if (safeRedirectAfterAuth()) return;

        const funnel = parseRedirectQueryForEntryFunnel(searchParams.get('redirect'));
        if (funnel.propertyId) {
          const {
            data: { session: postLogin },
          } = await supabase.auth.getSession();
          const uid = postLogin?.user?.id;
          if (uid) {
            void trackPropertyEntryEvent(supabase, {
              propertyId: funnel.propertyId,
              inviteCode: funnel.inviteCode,
              source: funnel.source ?? 'auth_login',
              eventType: 'auth_ok',
              userId: uid,
            });
          }
        }

        const pendingAfterLogin = consumePendingRedirect();
        if (pendingAfterLogin) {
          navigate(pendingAfterLogin, { replace: true });
          return;
        }
        const claimedId = await claimPropertyFromUrlIfPresent();
        if (claimedId) {
          persistCurrentPropertyId(claimedId);
          navigate('/', { replace: true });
          return;
        }
      } else {
        const user = await signUp(email, password, fullNameEn, fullNameZh, unitNumber);

        if (user) {
          await supabase.from('profiles').update({ phone }).eq('id', user.id);

          if (safeRedirectAfterAuth()) return;

          const propertyId = await resolveSignupPropertyIdAsync();

          let explicitPropertyInUrl = false;
          try {
            const p = new URLSearchParams(window.location.search);
            const raw = p.get('propertyId')?.trim() ?? '';
            explicitPropertyInUrl = !!(raw && UUID_RE.test(raw));
          } catch {
            explicitPropertyInUrl = false;
          }
          if (propertyId !== DEFAULT_PROPERTY_ID || explicitPropertyInUrl) {
            void trackPropertyEntryEvent(supabase, {
              propertyId,
              inviteCode: null,
              source: 'auth_signup',
              eventType: 'auth_ok',
              userId: user.id,
            });
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
          navigate('/', { replace: true });
        }
      }
    } catch (err) {
      setError(getAuthErrorMessage(err, language === 'zh' ? 'zh' : 'en'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordInputClass =
    'w-full pr-10 pl-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary/20 focus:border-clearstrata-ui-primary transition-colors';

  const loginCanSubmit =
    Boolean(email.trim()) && Boolean(password) && !isSubmitting && !forgotMode;
  const forgotCanSubmit = Boolean(email.trim()) && !resetSending;

  const goToLogin = () => {
    setLegacyOpen('login');
    setIsLogin(true);
    setForgotMode(false);
    setError('');
    setResetSuccess('');
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-50">
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-4 pt-0 sm:px-6 lg:grid lg:grid-cols-[minmax(0,46%)_minmax(0,54%)] lg:items-stretch lg:gap-6">
        <div className="flex h-full min-h-0 w-full flex-col pt-5 lg:pt-7">
          <div className="mb-2 flex w-full shrink-0 flex-col items-center justify-start overflow-visible px-2">
            <div className="w-full flex justify-center mt-8 mb-6">
              <img
                src="/clearstrata-hero-logo.png"
                alt="ClearStrata.Ai"
                className="h-auto w-[260px] sm:w-[320px] md:w-[380px] object-contain"
              />
            </div>
            <p className="mt-2 text-center text-xl font-semibold text-gray-700 sm:text-2xl">清涟让物业管理更简单透明</p>
          </div>
          <div className="mt-6 flex min-h-0 w-full flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col overflow-visible rounded-2xl border border-gray-100 bg-white shadow-md">
              <div className="flex shrink-0 border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setMainTab('guest');
                    setError('');
                    setResetSuccess('');
                  }}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                    mainTab === 'guest'
                      ? 'border-b-2 border-clearstrata-ui-primary bg-clearstrata-ui-soft/40 text-clearstrata-ui-primary'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {language === 'zh' ? '游客体验' : 'Try demo'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMainTab('property');
                    setError('');
                    setResetSuccess('');
                  }}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                    mainTab === 'property'
                      ? 'border-b-2 border-slate-800 bg-slate-50 text-slate-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {language === 'zh' ? '进入物业' : 'Join property'}
                </button>
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="border-l border-gray-100 px-4 py-3 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
                >
                  {language === 'en' ? '中文' : 'EN'}
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 shrink-0 overflow-visible">
            {passwordUpdated && (
              <div className="p-3 bg-clearstrata-ui-soft border border-clearstrata-ui-softBorder rounded-lg text-clearstrata-ui-softText text-sm flex justify-between gap-2 items-start">
                <span>{t('auth_password_updated_banner')}</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete('passwordUpdated');
                    setSearchParams(next, { replace: true });
                  }}
                  className="shrink-0 text-clearstrata-brand-700 hover:text-clearstrata-brand-900 text-lg leading-none"
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            )}
            {passwordResetDone && (
              <div className="p-3 bg-clearstrata-ui-soft border border-clearstrata-ui-softBorder rounded-lg text-clearstrata-ui-softText text-sm flex justify-between gap-2 items-start">
                <span>{t('auth_password_reset_login_banner')}</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete('passwordReset');
                    setSearchParams(next, { replace: true });
                  }}
                  className="shrink-0 text-clearstrata-brand-700 hover:text-clearstrata-brand-900 text-lg leading-none"
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            )}
            {mainTab === 'guest' ? (
              <form onSubmit={handleGuestDemo} className="space-y-3 p-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="guest-name">
                    {language === 'zh' ? '姓名' : 'Name'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="guest-name"
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-clearstrata-ui-primary focus:ring-2 focus:ring-clearstrata-ui-primary/20"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="guest-email">
                    {language === 'zh' ? '邮箱' : 'Email'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="guest-email"
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-clearstrata-ui-primary focus:ring-2 focus:ring-clearstrata-ui-primary/20"
                    autoComplete="email"
                    placeholder="name@example.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={guestBusy}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-clearstrata-ui-primary py-3 font-semibold text-white transition-colors hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guestBusy ? <Loader2 size={18} className="animate-spin" /> : null}
                  {language === 'zh' ? '立即查看账单' : 'View bills now'}
                </button>
              </form>
            ) : (
              <form onSubmit={(e) => void handlePropertyEnter(e)} className="space-y-4 p-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="ep-code">
                    {language === 'zh' ? '物业代号' : 'Property code'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="ep-code"
                    type="text"
                    value={epCode}
                    onChange={(e) => setEpCode(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 font-mono uppercase transition-colors focus:border-clearstrata-ui-primary focus:ring-2 focus:ring-clearstrata-ui-primary/20"
                    placeholder="BCS3736"
                    autoComplete="off"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {language === 'zh' ? '请使用业委会提供的专属代号。' : 'Use the code provided by your strata council.'}
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={epBusy}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {epBusy ? <Loader2 size={18} className="animate-spin" /> : null}
                  {language === 'zh' ? '进入业主身份确认' : 'Continue to owner verification'}
                </button>
              </form>
            )}

                </div>

                <div className="mt-auto w-full shrink-0">
            {error && (
              <div className="mx-6 mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            {/* Card footer: owner hint + admin link */}
            <div className="border-t border-gray-100 bg-gray-50/60 px-6 py-4 text-center space-y-2">
              <p className="text-xs text-gray-400 select-none">
                业主入口请使用上方「进入物业」
                <span className="block text-gray-300">Owner entry: use the &ldquo;Join property&rdquo; tab above</span>
              </p>
              <a
                href="/login"
                className="inline-block text-xs text-gray-400 hover:text-gray-600 transition-colors underline-offset-2 hover:underline"
              >
                管理员入口 / Admin Sign In
              </a>
            </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
          <AuthPromoPanel />
        </div>
      </div>
    </div>
  );
}
