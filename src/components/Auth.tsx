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
      titleZh: '业主授权监督工具',
      titleEn: 'Owner Authorization & Oversight',
      descZh:
        '采购授权、发票审核及异常监督三层治理，从源头治理防患于未然，而不是事后追责。',
      descEn:
        'Three layers of governance — procurement authorization, invoice review and anomaly oversight — designed to prevent problems before they happen, rather than assigning blame afterwards.',
    },
    {
      icon: UsersRound,
      titleZh: '业委会智能管理助手',
      titleEn: 'AI Governance Assistant for Council',
      descZh:
        '会议自动归档，AGM 预算、保险与采购授权自动查验，异常支出主动预警。让决策更轻松，远程书面会议不受时间与地域限制。',
      descEn:
        'Automatically archives meetings, validates AGM budgets, insurance requirements and procurement authorizations, and proactively flags unusual spending. Remote written meetings make participation easier from anywhere.',
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
    <div className="flex w-full flex-col bg-gradient-to-b from-[#EAF7FB] via-[#E6F3F8] to-white text-slate-800">
      {/* Header */}
      <header className="relative z-10 w-full shrink-0 border-b border-sky-100/80 bg-[#EAF7FB]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-1.5 sm:px-5 sm:py-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-1.5">
            <img
              src="/clearstrata-hero-logo.png"
              alt="ClearStrata.Ai"
              className="h-6 w-auto shrink-0 object-contain sm:h-7"
            />
            <span className="shrink-0 text-[11px] font-semibold leading-tight text-slate-800 sm:text-xs">
              ClearStrata.Ai
            </span>
            <span className="h-3 w-px shrink-0 bg-slate-300/90" aria-hidden />
            <span className="shrink-0 text-[9px] font-medium leading-tight text-blue-600 sm:text-[11px]">
              app.clearstrata.ai
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={toggleLanguage}
              className="rounded-md px-2 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-white/60 hover:text-slate-900 sm:px-2.5 sm:text-xs"
            >
              {zh ? 'EN' : '中文'}
            </button>
            <button
              type="button"
              onClick={openJoinProperty}
              className="rounded-md bg-blue-600 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800 sm:px-3 sm:py-1.5 sm:text-xs"
            >
              {zh ? '进入物业' : 'Join Property'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative w-full shrink-0 overflow-hidden">
        <div
          className="pointer-events-none absolute -left-12 top-4 h-32 w-32 rounded-full bg-sky-200/35 blur-2xl sm:h-40 sm:w-40"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-8 top-10 h-28 w-28 rounded-full bg-cyan-100/45 blur-2xl sm:h-36 sm:w-36"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-3 py-2.5 text-center sm:px-5 sm:py-3 md:py-4">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
            {zh ? 'AI驱动的业主自管平台' : 'AI驱动的业主自管平台'}
          </h1>
          <p className="mt-0.5 text-xs font-semibold text-slate-600 sm:mt-1 sm:text-sm md:text-base">
            AI-Powered Owner Self-Governance Platform
          </p>
          <div className="mx-auto mt-1.5 max-w-lg border-y border-sky-200/70 py-1.5 sm:mt-2 sm:py-2">
            <p className="text-[10px] leading-snug text-slate-700 sm:text-sm">
              我们追求的不是人治，而是法治。
            </p>
            <p className="mt-0.5 text-[11px] font-bold leading-snug text-blue-600 sm:mt-1 sm:text-sm">
              Rules before relationships.
            </p>
            <p className="mt-0.5 text-[9px] leading-snug text-slate-600 sm:mt-1 sm:text-xs">
              ClearStrata helps strata communities move from personality-based governance to
              process-based governance.
            </p>
          </div>
          <ul className="mx-auto mt-1.5 max-w-xl space-y-0.5 text-[11px] leading-snug text-slate-700 sm:mt-2 sm:space-y-0.5 sm:text-sm">
            <li>{zh ? '让业主的每一笔支出干净透明' : '让业主的每一笔支出干净透明'}</li>
            <li>{zh ? '让全球 Council 决策轻松、便捷、高效' : '让全球 Council 决策轻松、便捷、高效'}</li>
            <li>{zh ? '让本地物业服务可追踪、可监督、可查询' : '让本地物业服务可追踪、可监督、可查询'}</li>
          </ul>
          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:mt-3 sm:flex sm:items-stretch sm:justify-center sm:gap-2.5">
            <button
              type="button"
              onClick={goCreateProperty}
              className="inline-flex h-14 min-h-[56px] max-h-16 flex-col items-center justify-center rounded-lg bg-clearstrata-ui-primary px-1.5 py-1 text-[11px] font-semibold leading-tight text-white shadow-sm transition-colors hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive sm:h-auto sm:min-h-0 sm:max-h-none sm:rounded-xl sm:px-5 sm:py-2 sm:text-sm"
            >
              <span className="truncate">{zh ? '创建我的物业' : '创建我的物业'}</span>
              <span className="text-[9px] font-medium leading-none text-white/90 sm:text-xs">
                Create My Property
              </span>
            </button>
            <button
              type="button"
              onClick={goExploreDemo}
              className="inline-flex h-14 min-h-[56px] max-h-16 flex-col items-center justify-center rounded-lg border-2 border-blue-600 bg-white px-1.5 py-1 text-[11px] font-semibold leading-tight text-blue-700 transition-colors hover:bg-blue-50 sm:h-auto sm:min-h-0 sm:max-h-none sm:rounded-xl sm:px-5 sm:py-2 sm:text-sm"
            >
              <span className="truncate">{zh ? '体验演示物业' : '体验演示物业'}</span>
              <span className="text-[9px] font-medium leading-none text-blue-600/90 sm:text-xs">
                Explore Demo Property
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Value cards */}
      <section className="w-full shrink-0 px-3 pb-2 sm:px-5 sm:pb-3">
        <div className="mx-auto grid max-w-5xl gap-2 sm:grid-cols-3 sm:gap-2.5">
          {valueCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.titleZh}
                className="flex items-start gap-2 rounded-xl border border-sky-100 bg-white/90 p-2 shadow-sm sm:gap-2.5 sm:p-2.5"
              >
                <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-blue-600 sm:h-8 sm:w-8">
                  <Icon size={15} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <h3 className="text-[11px] font-bold leading-tight text-slate-900 sm:text-xs">
                    {zh ? card.titleZh : card.titleEn}
                  </h3>
                  <p className="mt-0.5 text-[10px] leading-tight text-slate-600 sm:text-[11px]">
                    {zh ? card.descZh : card.descEn}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Philosophy */}
      <section className="w-full shrink-0 px-3 pb-0 sm:px-5 sm:pb-1">
        <div className="mx-auto max-w-3xl rounded-xl border border-sky-200/80 bg-[#E6F3F8] px-3 py-2.5 text-center sm:px-5 sm:py-3">
          <p className="text-xs font-semibold italic leading-snug text-slate-800 sm:text-sm">
            &ldquo;Change the system, not the person.&rdquo;
          </p>
          <p className="mt-1 text-[10px] leading-snug text-slate-700 sm:text-xs">
            Replacing a closed, obstructive and passive system with one that is open, transparent and
            owner-driven by AI.
          </p>
          <p className="mt-1.5 text-xs font-medium text-slate-800 sm:text-sm">改变制度，而不是人。</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-2 w-full shrink-0 border-t border-sky-100/80 px-3 py-2 pb-2.5 text-center sm:mt-3 sm:px-5 sm:py-3">
        <p className="text-[10px] leading-tight text-slate-500 sm:text-xs">
          {zh ? '业主入口请使用上方「进入物业」' : 'Owner entry: use the “Join Property” button above'}
        </p>
        <p className="text-[9px] leading-tight text-slate-400 sm:text-[10px]">
          {zh ? 'Owner entry: use the “Join Property” button above' : '业主入口请使用上方「进入物业」'}
        </p>
        <a
          href="/login"
          className="mt-1 inline-block text-[10px] font-medium text-slate-500 underline-offset-2 transition-colors hover:text-slate-700 hover:underline sm:text-xs"
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
