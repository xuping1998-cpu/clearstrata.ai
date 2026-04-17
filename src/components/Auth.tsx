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
import { submitUnifiedPropertyEntry } from '../lib/propertyEntryUnified';
import { demoEntryPath, MARKETING_DEMO_PROPERTY_CODE } from '@/lib/propertyEntryRoutes';
import { saveGuestExperienceDraft } from '@/lib/guestExperienceDraft';
import { savePropertyEntryDraft } from '@/lib/propertyEntryDraft';

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

function isValidEmailBasic(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
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
  const [epStrata, setEpStrata] = useState('');
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
    const st = epStrata.trim();
    const u = epUnit.trim();
    if (!n || !em || !st || !u) {
      setError(language === 'zh' ? '请填写姓名、邮箱、Strata Plan 与房号。' : 'Please fill in all required fields.');
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
      if (error) {
        console.warn('resolve_property_for_join_request', error);
        setError(language === 'zh' ? '无法查询该物业，请稍后重试。' : 'Could not look up this property. Try again later.');
        return;
      }
      const rows = Array.isArray(data) ? data : data != null ? [data] : [];
      const row = rows[0] as { id?: string } | undefined;
      const pid = row?.id != null ? String(row.id) : '';
      if (!pid) {
        setError(
          language === 'zh'
            ? '未找到该物业，或该物业未开放公开加入。请向业委会确认入口。'
            : 'Property not found or not open for public join. Please confirm with your strata council.',
        );
        return;
      }
      savePropertyEntryDraft({
        fullName: n,
        email: em,
        strataPlan: st,
        unitNumber: u,
        propertyId: pid,
        propertyCode: code,
      });
      navigate(`/join-request?propertyId=${encodeURIComponent(pid)}`, { replace: false });
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

          const entryResult = await submitUnifiedPropertyEntry(supabase, {
            userId: user.id,
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

          if (entryResult.kind === 'rpc_error') {
            const dup =
              entryResult.error.code === '23505' ||
              (entryResult.error.message ?? '').toLowerCase().includes('duplicate') ||
              (entryResult.error.message ?? '').includes('uniq_pending_request');
            if (dup) {
              navigate('/join/pending', { replace: true });
              return;
            }
            throw new Error(entryResult.error.message);
          }

          const jr = entryResult.raw as {
            error?: string;
            message?: string;
            message_zh?: string;
            property_id?: string;
          } | null;

          if (entryResult.kind === 'business_reject') {
            if (
              entryResult.errorKey === 'already_pending' ||
              entryResult.message === 'PENDING_EXISTS' ||
              entryResult.errorKey === 'pending_exists'
            ) {
              navigate('/join/pending', { replace: true });
              return;
            }
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
            if (jr?.error === 'already_member' || entryResult.errorKey === 'already_member') {
              const pid = jr?.property_id != null ? String(jr.property_id) : propertyId;
              if (pid) persistCurrentPropertyId(pid);
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
                ? (jr?.message_zh as string) || entryResult.message_zh || '无法完成加入申请，请稍后再试。'
                : (jr?.message as string) || entryResult.message || 'Could not complete your join request. Please try again.',
            );
          }

          const afterJoinHome = async () => {
            const demoClaimed = await claimPublicDemoPropertyAfterSignUp();
            if (demoClaimed) {
              navigate('/', { replace: true });
              return true;
            }
            const guestClaimed = await claimGuestStoredPropertyAfterSignUp();
            if (guestClaimed) {
              navigate('/', { replace: true });
              return true;
            }
            const claimedId = await claimPropertyFromUrlIfPresent();
            if (claimedId) {
              persistCurrentPropertyId(claimedId);
              navigate('/', { replace: true });
              return true;
            }
            if (safeRedirectAfterAuth()) return true;
            navigate('/', { replace: true });
            return true;
          };

          if (entryResult.kind === 'auto_approved' && entryResult.propertyId) {
            persistCurrentPropertyId(String(entryResult.propertyId));
            await afterJoinHome();
            return;
          }

          if (entryResult.kind === 'pending_submitted') {
            navigate('/join/pending', { replace: true });
            return;
          }
        }
      }
    } catch (err) {
      setError(getAuthErrorMessage(err, language === 'zh' ? 'zh' : 'en'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordInputClass =
    'w-full pr-10 pl-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75] transition-colors';

  const loginCanSubmit =
    Boolean(email.trim()) && Boolean(password) && !isSubmitting && !forgotMode;
  const forgotCanSubmit = Boolean(email.trim()) && !resetSending;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-50 px-4 py-5 sm:py-6 lg:py-8">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[minmax(0,46%)_minmax(0,54%)] lg:items-stretch lg:gap-10 xl:gap-12">
        <div className="flex min-h-0 w-full flex-col justify-between gap-4 lg:gap-5">
          {/*
            TEMP: [&>img]:mix-blend-multiply softens opaque white in public/logo-clearstrata-v1.png against bg-gray-50.
            Replace the PNG with a transparent-background final asset, then remove the blend utility from this wrapper.
          */}
          <div className="flex w-full shrink-0 flex-col items-center gap-2 px-2 pb-1 pt-0 [&>img]:mix-blend-multiply">
            <img
              src="/logo-clearstrata-v1.png"
              alt="ClearStrata.Ai"
              className="mx-auto h-auto w-56 max-w-full object-contain sm:w-64 lg:w-72"
            />
            <h1 className="text-center text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">ClearStrata</h1>
            <p className="text-center text-sm font-semibold text-gray-700">清漣讓物業管理更簡單透明</p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <span className="rounded-full border border-emerald-100 bg-emerald-50/80 px-3 py-1 text-xs font-semibold text-emerald-900">
                {language === 'zh' ? '业主监督' : 'Owner oversight'}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800">
                {language === 'zh' ? '理事会透明' : 'Council clarity'}
              </span>
              <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-800">
                {language === 'zh' ? '同步中英' : 'EN / 中文'}
              </span>
            </div>
          </div>
          <div className="flex w-full min-w-0 flex-1 flex-col lg:mt-0">
            <div className="flex w-full flex-col overflow-visible rounded-2xl border border-gray-100 bg-white shadow-md">
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
                      ? 'border-b-2 border-[#1D9E75] bg-emerald-50/40 text-[#1D9E75]'
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
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
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
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
                    autoComplete="email"
                    placeholder="name@example.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={guestBusy}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1D9E75] py-3 font-semibold text-white transition-colors hover:bg-[#178a66] disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 font-mono uppercase transition-colors focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
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
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
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
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
                    placeholder="name@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="ep-strata">
                    Strata plan <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="ep-strata"
                    value={epStrata}
                    onChange={(e) => setEpStrata(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
                    placeholder={language === 'zh' ? '计划类型或登记号' : 'Plan type or registration'}
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
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
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

            <div className="border-t border-gray-100 bg-gray-50/60 px-6 py-4">
              <p className="text-xs font-semibold text-gray-600">
                {language === 'zh' ? '已有账号？' : 'Already have an account?'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = legacyOpen === 'login' ? 'none' : 'login';
                    setLegacyOpen(next);
                    if (next === 'login') {
                      setIsLogin(true);
                      setForgotMode(false);
                      setError('');
                      setResetSuccess('');
                    }
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50"
                >
                  {language === 'zh' ? '邮箱与密码登录' : 'Email & password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = legacyOpen === 'signup' ? 'none' : 'signup';
                    setLegacyOpen(next);
                    if (next === 'signup') {
                      setIsLogin(false);
                      setStep(1);
                      setError('');
                      setResetSuccess('');
                    }
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50"
                >
                  {language === 'zh' ? '业主完整注册' : 'Full owner signup'}
                </button>
              </div>

              {legacyOpen === 'login' ? (
                <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                  {resetSuccess && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{resetSuccess}</div>
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
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
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
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1D9E75] py-3 font-semibold text-white transition-colors hover:bg-[#178a66] disabled:cursor-not-allowed disabled:opacity-50"
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
                        className="w-full py-2 text-sm font-medium text-[#1D9E75] hover:underline"
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
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1D9E75] py-3 font-semibold text-white transition-colors hover:bg-[#178a66] disabled:cursor-not-allowed disabled:opacity-50"
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
                        className="w-full py-1 text-center text-sm font-medium text-[#1D9E75] hover:underline"
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
                          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
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
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
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
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
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
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
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
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 transition-colors focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
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
                        className="w-full rounded-lg bg-[#1D9E75] py-3 font-semibold text-white transition-colors hover:bg-[#178a66]"
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
                          className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2.5 transition-colors focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20"
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
                                ? 'border-[#1D9E75] bg-emerald-50 text-[#1D9E75]'
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
                                ? 'border-[#1D9E75] bg-emerald-50 text-[#1D9E75]'
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
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
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
                          className="flex-1 rounded-lg bg-gray-100 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-200"
                        >
                          {language === 'en' ? 'Back' : '返回'}
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#1D9E75] py-3 font-semibold text-white transition-colors hover:bg-[#178a66] disabled:cursor-not-allowed disabled:opacity-50"
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

        <div className="flex min-h-0 w-full min-w-0 flex-col">
          <div className="flex h-full min-h-0 w-full">
            <AuthPromoPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
