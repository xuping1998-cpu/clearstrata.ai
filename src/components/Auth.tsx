import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardList, Loader2, ShieldCheck, UsersRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { getAuthErrorMessage } from '../lib/authErrorMessages';
import { DEFAULT_PROPERTY_ID } from '../lib/defaultProperty';
import {
  APP_MODE_STORAGE_KEY,
  GUEST_PROPERTY_STORAGE_KEY,
  clearPublicDemoLocalStorage,
} from '../contexts/PropertyContext';
import { trackPropertyEntryEvent } from '../lib/propertyEntryEvents';

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

type LegacyOpen = 'none' | 'login' | 'signup';

export function Auth() {
  const [legacyOpen, setLegacyOpen] = useState<LegacyOpen>('none');
  const [epCode, setEpCode] = useState('');
  const [epBusy, setEpBusy] = useState(false);
  const [showOwnerEntry, setShowOwnerEntry] = useState(false);

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
      setShowOwnerEntry(true);
    }
  }, [searchParams]);

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

  /** Primary CTA — logged-out users go to login with return path; logged-in users enter create flow directly. */
  const goCreateProperty = () => {
    const target = '/onboarding/create-property';
    if (!session) {
      navigate(`/login?redirect=${encodeURIComponent(target)}`);
      return;
    }
    navigate(target);
  };

  /** Secondary CTA — pure mock demo (NOT /demo/BCS3736, never /login). */
  const goExploreDemo = () => {
    navigate('/demo-property');
  };

  const openJoinProperty = () => {
    setError('');
    setResetSuccess('');
    setShowOwnerEntry(true);
  };

  const zh = language === 'zh';

  const valueCards = [
    {
      icon: ShieldCheck,
      titleZh: '业主监督工具',
      titleEn: 'Owner oversight',
      descZh: '查看发票、公告、会议投票与物业支出，掌握社区大小事。',
      descEn: 'Review invoices, notices, meeting votes and spending — stay informed.',
    },
    {
      icon: UsersRound,
      titleZh: '业委会透明管理助手',
      titleEn: 'Council transparency',
      descZh: '会议通知、电子投票、采购询价、支出审核，让决策更公开透明。',
      descEn: 'Notices, e-voting, procurement RFQs and expense review — open decisions.',
    },
    {
      icon: ClipboardList,
      titleZh: '物业经理的工作日志',
      titleEn: 'Manager work log',
      descZh: '诉求处理、巡检记录、公共事项、月报归档，提升管理效率。',
      descEn: 'Requests, inspections, public matters and monthly reports — all on record.',
    },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-[#EAF7FB] via-[#E6F3F8] to-white text-slate-800">
      {/* Header */}
      <header className="relative z-10 w-full border-b border-sky-100/80 bg-[#EAF7FB]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <img
              src="/clearstrata-hero-logo.png"
              alt="ClearStrata.Ai"
              className="h-8 w-auto shrink-0 object-contain sm:h-9"
            />
            <span className="truncate text-xs font-semibold text-slate-700 sm:text-sm">
              {zh ? '物业透明管理平台' : 'Transparent property management'}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleLanguage}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-white/60 hover:text-slate-900 sm:px-3 sm:text-sm"
            >
              {zh ? 'EN' : '中文'}
            </button>
            <button
              type="button"
              onClick={openJoinProperty}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800 sm:px-4 sm:text-sm"
            >
              {zh ? '进入物业' : 'Join Property'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative w-full overflow-hidden">
        <div
          className="pointer-events-none absolute -left-16 top-8 h-48 w-48 rounded-full bg-sky-200/40 blur-2xl sm:h-64 sm:w-64"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-10 top-20 h-40 w-40 rounded-full bg-cyan-100/50 blur-2xl sm:h-56 sm:w-56"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-4 py-6 text-center sm:px-6 sm:py-8 md:py-10">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
            {zh ? 'AI驱动的业主自管平台' : 'AI驱动的业主自管平台'}
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-600 sm:text-base md:text-lg">
            AI-Powered Owner Self-Governance Platform
          </p>
          <p className="mt-1.5 font-mono text-xs tracking-wide text-sky-700/80 sm:text-sm">
            app.clearstrata.ai
          </p>
          <ul className="mx-auto mt-4 max-w-xl space-y-1.5 text-sm text-slate-700 sm:mt-5 sm:text-base">
            <li>{zh ? '让业主的每一笔支出干净透明' : '让业主的每一笔支出干净透明'}</li>
            <li>{zh ? '让全球 Council 决策轻松、便捷、高效' : '让全球 Council 决策轻松、便捷、高效'}</li>
            <li>{zh ? '让本地物业服务可追踪、可监督、可查询' : '让本地物业服务可追踪、可监督、可查询'}</li>
          </ul>
          <div className="mt-5 flex flex-col items-stretch justify-center gap-3 sm:mt-6 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={goCreateProperty}
              className="inline-flex min-h-[44px] flex-col items-center justify-center rounded-xl bg-clearstrata-ui-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive sm:min-h-0 sm:py-3 sm:text-base"
            >
              <span>{zh ? '创建我的物业' : '创建我的物业'}</span>
              <span className="text-xs font-medium text-white/90 sm:text-sm">Create My Property</span>
            </button>
            <button
              type="button"
              onClick={goExploreDemo}
              className="inline-flex min-h-[44px] flex-col items-center justify-center rounded-xl border-2 border-blue-600 bg-white px-6 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 sm:min-h-0 sm:py-3 sm:text-base"
            >
              <span>{zh ? '体验演示物业' : '体验演示物业'}</span>
              <span className="text-xs font-medium text-blue-600/90 sm:text-sm">Explore Demo Property</span>
            </button>
          </div>
        </div>
      </section>

      {/* Value cards */}
      <section className="w-full px-4 pb-6 sm:px-6 sm:pb-8">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3">
          {valueCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.titleZh}
                className="rounded-2xl border border-sky-100 bg-white/90 p-4 shadow-sm sm:p-5"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-blue-600">
                  <Icon size={20} strokeWidth={2} />
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-900 sm:text-base">
                  {zh ? card.titleZh : card.titleEn}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
                  {zh ? card.descZh : card.descEn}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Philosophy */}
      <section className="w-full px-4 pb-6 sm:px-6 sm:pb-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-sky-200/80 bg-[#E6F3F8] px-5 py-6 text-center sm:px-8 sm:py-8">
          <p className="text-sm font-semibold italic leading-relaxed text-slate-800 sm:text-base">
            &ldquo;Change the system, not the person.&rdquo;
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-700 sm:text-sm">
            Replacing a closed, obstructive and passive system with one that is open, transparent and
            owner-driven by AI.
          </p>
          <p className="mt-4 text-sm font-medium text-slate-800">改变制度，而不是人。</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto w-full border-t border-sky-100/80 px-4 pb-8 pt-5 text-center sm:px-6">
        <p className="text-xs text-slate-500">
          {zh ? '业主入口请使用上方「进入物业」' : 'Owner entry: use the “Join Property” button above'}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          {zh ? 'Owner entry: use the “Join Property” button above' : '业主入口请使用上方「进入物业」'}
        </p>
        <a
          href="/login"
          className="mt-4 inline-block text-xs font-medium text-slate-500 underline-offset-2 transition-colors hover:text-slate-700 hover:underline"
        >
          {zh ? '管理员入口 / Admin Sign In' : '管理员入口 / Admin Sign In'}
        </a>
      </footer>

      {/* Owner entry modal — opened from the top-right button; reuses handlePropertyEnter. */}
      {showOwnerEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowOwnerEntry(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {language === 'zh' ? '进入已有物业' : 'Join existing property'}
                </h2>
                <p className="text-xs text-gray-500">
                  {language === 'zh' ? '输入业委会提供的物业代号' : 'Enter the code provided by your strata council'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOwnerEntry(false)}
                className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label={language === 'zh' ? '关闭' : 'Close'}
              >
                ×
              </button>
            </div>

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
                  placeholder="PROPERTY-CODE"
                  autoComplete="off"
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500">
                  {language === 'zh' ? '请使用业委会提供的专属代号。' : 'Use the code provided by your strata council.'}
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}

              <button
                type="submit"
                disabled={epBusy}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {epBusy ? <Loader2 size={18} className="animate-spin" /> : null}
                {language === 'zh' ? '进入业主身份确认' : 'Continue to owner verification'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
