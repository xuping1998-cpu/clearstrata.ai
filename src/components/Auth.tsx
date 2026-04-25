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
import { savePropertyEntryDraft } from '@/lib/propertyEntryDraft';
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
  const [epName, setEpName] = useState('');
  const [epEmail, setEpEmail] = useState('');
  const [epUnit, setEpUnit] = useState('');
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

  const { signIn, signUp } = useAuth();
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
    const n = epName.trim();
    const em = epEmail.trim().toLowerCase();
    const u = epUnit.trim();

    console.log('[Auth] entry form payload', {
      propertyCode: code || null,
      name: n || null,
      email: em || null,
      unit: u || null,
    });

    if (!n || !em || !u) {
      setError(language === 'zh' ? '请填写姓名、邮箱与房号。' : 'Please fill in all required fields.');
      return;
    }
    if (!isValidEmailBasic(em)) {
      setError(language === 'zh' ? '邮箱格式不正确。' : 'Please enter a valid email address.');
      return;
    }
    if (!code) {
      setError(
        language === 'zh'
          ? '请填写物业代号，或使用物业专属入口链接（含 propertyCode）。'
          : 'Enter your property code, or open your building’s dedicated link.',
      );
      return;
    }

    setEpBusy(true);
    try {
      const { data, error } = await supabase.rpc('resolve_property_for_join_request', { p_code: code });
      console.log('[Auth] resolve_property_for_join_request result', { data, error });
      if (error) {
        const msg = language === 'zh' ? '无法查询该物业，请稍后重试。' : 'Could not look up this property. Try again later.';
        setError(msg);
        console.error('[Auth] property resolve failed', error.message);
        return;
      }
      const rows = Array.isArray(data) ? data : data != null ? [data] : [];
      const row = rows[0] as { id?: string } | undefined;
      const pid = row?.id != null ? String(row.id) : '';
      if (!pid) {
        const msg =
          language === 'zh'
            ? '未找到该物业，或该物业未开放公开加入。请向业委会确认入口。'
            : 'Property not found or not open for public join. Please confirm with your strata council.';
        setError(msg);
        console.error('[Auth] property not resolved — empty property id', { data });
        return;
      }

      savePropertyEntryDraft({
        fullName: n,
        email: em,
        unitNumber: u,
        propertyId: pid,
        propertyCode: code,
      });

      const inviteFromUrl =
        searchParams.get('inviteCode')?.trim() ||
        searchParams.get('invite_code')?.trim() ||
        searchParams.get('code')?.trim() ||
        null;
      const sourceFromUrl = searchParams.get('source')?.trim() || 'web';

      const entryQs = new URLSearchParams();
      entryQs.set('propertyId', pid);
      entryQs.set('propertyCode', code);
      entryQs.set('source', sourceFromUrl);
      if (inviteFromUrl) entryQs.set('inviteCode', inviteFromUrl);
      const entryPath = `/entry?${entryQs.toString()}`;
      let userId: string | null = null;
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();

      if (existingSession?.user?.id) {
        userId = existingSession.user.id;
        console.log('[Auth] entry session: already signed in', { userId });
      } else {
        const pwd = generateSecureEntryPassword();
        console.log('[Auth] entry signUp start', { email: em });
        try {
          const newUser = await signUp(em, pwd, n, '', u);
          console.log('[Auth] entry signUp result', { userId: newUser?.id ?? null, error: null });
        } catch (signUpErr: unknown) {
          const msg = getAuthErrorMessage(signUpErr, language === 'zh' ? 'zh' : 'en');
          const raw =
            signUpErr && typeof signUpErr === 'object' && 'message' in signUpErr
              ? String((signUpErr as { message?: string }).message)
              : '';
          console.error('[Auth] entry signUp result', { error: signUpErr, message: raw });
          const dup =
            raw.toLowerCase().includes('already') ||
            raw.toLowerCase().includes('registered') ||
            raw.toLowerCase().includes('exists');
          if (dup) {
            setError(
              language === 'zh'
                ? '该邮箱已注册。请使用页面下方「直接登录」登录后，再点击「进入物业」。'
                : 'This email is already registered. Sign in below, then tap Join property again.',
            );
            return;
          }
          setError(msg);
          return;
        }

        const {
          data: { session: afterSignUp },
        } = await supabase.auth.getSession();
        if (afterSignUp?.user?.id) {
          userId = afterSignUp.user.id;
        } else {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: em,
            password: pwd,
          });
          console.log('[Auth] entry signIn/signInWithPassword result', {
            userId: signInData.session?.user?.id ?? null,
            error: signInErr?.message ?? null,
          });
          if (signInErr || !signInData.session?.user?.id) {
            const hint =
              signInErr?.message ||
              (language === 'zh'
                ? '请查收邮箱完成验证后再试，或使用下方「直接登录」。'
                : 'Check your email to confirm your account, or sign in below.');
            setError(hint);
            return;
          }
          userId = signInData.session.user.id;
        }
      }

      if (!userId) {
        setError(language === 'zh' ? '无法建立登录会话，请重试。' : 'Could not establish a session. Please try again.');
        return;
      }

      void trackPropertyEntryEvent(supabase, {
        propertyId: pid,
        inviteCode: inviteFromUrl,
        source: sourceFromUrl,
        eventType: 'auth_ok',
        userId,
      });

      console.log('[Auth] entry navigate', {
        propertyId: pid,
        propertyCode: code,
        unitNumber: u,
        userId,
        entryPath,
      });

      navigate(entryPath, { replace: true });
    } catch (err) {
      console.error('[Auth] handlePropertyEnter', err);
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
              <form onSubmit={(e) => void handlePropertyEnter(e)} className="space-y-3 p-5">
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800">
                  {language === 'zh'
                    ? '真实物业入口：提交后将前往加入申请页（非 Demo）。'
                    : 'Real property path: you will continue on the join request page (not the demo).'}
                </p>
                {(epCode.trim() || searchParams.get('propertyCode')?.trim()) && (
                  <p className="text-center text-sm font-bold text-slate-900">
                    {language === 'zh' ? '正在进入：' : 'Joining: '}
                    <span className="font-mono">{(epCode.trim() || searchParams.get('propertyCode') || '').toUpperCase()}</span>
                  </p>
                )}
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
                    {language === 'zh' ? '请使用业委会提供的专属代号或链接。' : 'Use the code from your strata / manager.'}
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="ep-name">
                    {language === 'zh' ? '姓名' : 'Name'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="ep-name"
                    type="text"
                    value={epName}
                    onChange={(e) => setEpName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-clearstrata-ui-primary focus:ring-2 focus:ring-clearstrata-ui-primary/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="ep-email">
                    {language === 'zh' ? '邮箱' : 'Email'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="ep-email"
                    type="email"
                    value={epEmail}
                    onChange={(e) => setEpEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-clearstrata-ui-primary focus:ring-2 focus:ring-clearstrata-ui-primary/20"
                    placeholder="name@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="ep-unit">
                    {language === 'zh' ? '房号 / 单元号' : 'Unit'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="ep-unit"
                    type="text"
                    value={epUnit}
                    onChange={(e) => setEpUnit(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-clearstrata-ui-primary focus:ring-2 focus:ring-clearstrata-ui-primary/20"
                    placeholder="1204"
                  />
                </div>
                <button
                  type="submit"
                  disabled={epBusy}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {epBusy ? <Loader2 size={18} className="animate-spin" /> : null}
                  {language === 'zh' ? '进入物业' : 'Continue to join'}
                </button>
              </form>
            )}

                </div>

                <div className="mt-auto w-full shrink-0 space-y-3">
            <div className="border-t border-gray-100 bg-gray-50/60 px-6 py-4">
              <div className="mt-4 text-center text-sm text-gray-500">
                {language === 'zh' ? '已有账号？' : 'Already have an account?'}
                <button
                  type="button"
                  onClick={goToLogin}
                  className="ml-2 font-medium text-clearstrata-ui-primary hover:underline"
                >
                  {language === 'zh' ? '直接登录' : 'Sign in'}
                </button>
              </div>

              {legacyOpen === 'login' ? (
                <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                  {resetSuccess && (
                    <div className="rounded-lg border border-clearstrata-ui-softBorder bg-clearstrata-ui-soft p-3 text-sm text-clearstrata-ui-softText">{resetSuccess}</div>
                  )}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="login-email">
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
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-clearstrata-ui-primary focus:ring-2 focus:ring-clearstrata-ui-primary/20"
                      placeholder="name@example.com"
                    />
                  </div>
                  {!forgotMode && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="login-password">
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
                          required={!forgotMode}
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
                  {isLogin && forgotMode && (
                    <>
                      <button
                        type="submit"
                        disabled={!forgotCanSubmit}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-clearstrata-ui-primary py-3 font-semibold text-white transition-colors hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive disabled:cursor-not-allowed disabled:opacity-50"
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
                        className="w-full py-2 text-sm font-medium text-clearstrata-ui-primary hover:underline"
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
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-clearstrata-ui-primary py-3 font-semibold text-white transition-colors hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive disabled:cursor-not-allowed disabled:opacity-50"
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
                        className="w-full py-1 text-center text-sm font-medium text-clearstrata-ui-primary hover:underline"
                      >
                        {t('auth_forgot_password')}
                      </button>
                    </>
                  )}
                </form>
              ) : null}

              {legacyOpen === 'signup' ? (
                <form onSubmit={handleSubmit} className="mt-4 space-y-4 border-t border-gray-200 pt-4">
                  {step === 1 ? (
                    <>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="signup-email">
                          {t('auth_email')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="signup-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-clearstrata-ui-primary focus:ring-2 focus:ring-clearstrata-ui-primary/20"
                          placeholder="name@example.com"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="signup-password">
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
                        <p className="mt-1 text-xs text-gray-500">{language === 'en' ? 'Minimum 6 characters' : '至少6个字符'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="signup-name-en">
                            {t('auth_full_name_en')} <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="signup-name-en"
                            type="text"
                            value={fullNameEn}
                            onChange={(e) => setFullNameEn(e.target.value)}
                            required
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-clearstrata-ui-primary focus:ring-2 focus:ring-clearstrata-ui-primary/20"
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="signup-name-zh">
                            {t('auth_full_name_zh')}
                          </label>
                          <input
                            id="signup-name-zh"
                            type="text"
                            value={fullNameZh}
                            onChange={(e) => setFullNameZh(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-clearstrata-ui-primary focus:ring-2 focus:ring-clearstrata-ui-primary/20"
                            placeholder="张三"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="signup-unit">
                            {language === 'en' ? 'Unit Number' : '单元号'} <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="signup-unit"
                            type="text"
                            value={unitNumber}
                            onChange={(e) => setUnitNumber(e.target.value)}
                            required
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-clearstrata-ui-primary focus:ring-2 focus:ring-clearstrata-ui-primary/20"
                            placeholder="101"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="signup-phone">
                            {language === 'en' ? 'Phone' : '电话'}
                          </label>
                          <input
                            id="signup-phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-clearstrata-ui-primary focus:ring-2 focus:ring-clearstrata-ui-primary/20"
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
                        className="w-full rounded-lg bg-clearstrata-ui-primary py-3 font-semibold text-white transition-colors hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive"
                      >
                        {language === 'en' ? 'Next' : '下一步'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="move-in">
                          {language === 'en' ? 'Move-in Date' : '入住日期'}
                        </label>
                        <input
                          key="move-in"
                          ref={moveInDateRef}
                          id="move-in"
                          type="date"
                          name="move_in_date"
                          min="1900-01-01"
                          max="2100-12-31"
                          autoComplete="off"
                          className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2.5 transition-colors focus:border-clearstrata-ui-primary focus:ring-2 focus:ring-clearstrata-ui-primary/20"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          {language === 'en'
                            ? 'Tap the field to open the calendar and pick any date.'
                            : '点击输入框打开日历，可自由选择日期。'}
                        </p>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          {language === 'en' ? 'Language Preference' : '语言偏好'}
                        </label>
                        <div className="flex gap-3">
                          <label
                            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 px-4 py-2.5 transition-all ${
                              languagePref === 'en'
                                ? 'border-clearstrata-ui-primary bg-clearstrata-ui-soft text-clearstrata-ui-primary'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
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
                            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 px-4 py-2.5 transition-all ${
                              languagePref === 'zh'
                                ? 'border-clearstrata-ui-primary bg-clearstrata-ui-soft text-clearstrata-ui-primary'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
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
                      <div className="rounded-lg border border-clearstrata-ui-softBorder bg-clearstrata-ui-soft p-3">
                        <p className="text-sm text-clearstrata-ui-softText">
                          {language === 'en'
                            ? 'You are registering as a property owner. Council roles are assigned by a site administrator after approval. Admin accounts cannot be created here.'
                            : '您将以业主身份注册。理事会（Council）角色须由管理员在后台审核后指定。系统管理员（Admin）账号不能通过此页面注册。'}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="flex-1 rounded-lg bg-gray-100 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-200"
                        >
                          {language === 'en' ? 'Back' : '返回'}
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-clearstrata-ui-primary py-3 font-semibold text-white transition-colors hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive disabled:cursor-not-allowed disabled:opacity-50"
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
                </form>
              ) : null}
            </div>

            {error && (
              <div className="mx-6 mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
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
