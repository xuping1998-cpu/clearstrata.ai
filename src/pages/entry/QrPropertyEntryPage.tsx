import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Loader2, MailCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { trackPropertyEntryEvent } from '../../lib/propertyEntryEvents';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DRAFT_NAME_KEY = 'entry_draft_name';
const DRAFT_UNIT_KEY = 'entry_draft_unit';

function saveDraft(name: string, unit: string) {
  try {
    sessionStorage.setItem(DRAFT_NAME_KEY, name);
    sessionStorage.setItem(DRAFT_UNIT_KEY, unit);
  } catch { /* ignore */ }
}

function loadDraft(): { name: string; unit: string } | null {
  try {
    const name = sessionStorage.getItem(DRAFT_NAME_KEY);
    const unit = sessionStorage.getItem(DRAFT_UNIT_KEY);
    if (unit) return { name: name ?? '', unit };
    return null;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_NAME_KEY);
    sessionStorage.removeItem(DRAFT_UNIT_KEY);
  } catch { /* ignore */ }
}

/** Public QR entry page: /entry?propertyId=...&inviteCode=...
 *  Unified OTP flow:
 *  1. No session → fill form → signInWithOtp → "check email" screen
 *  2. Email link click → back to /entry with session → auto-submit entry-auto-join
 *  3. Has session → direct submit → entry-auto-join → token → /entry/auto-login */
export function QrPropertyEntryPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { session, user } = useAuth();
  const { language, setLanguage } = useLanguage();
  const en = language === 'en';

  const propertyIdParam = useMemo(
    () => (searchParams.get('propertyId') || searchParams.get('property_id') || '').trim(),
    [searchParams],
  );
  const inviteCodeParam = useMemo(
    () => (searchParams.get('inviteCode') || searchParams.get('invite_code') || '').trim(),
    [searchParams],
  );
  const sourceParam = useMemo(() => (searchParams.get('source') || '').trim(), [searchParams]);
  const langParam = useMemo(() => (searchParams.get('lang') || '').trim(), [searchParams]);

  // Property resolution state
  const [resolved, setResolved] = useState<{ id: string; name: string } | null>(null);
  const [resolveErr, setResolveErr] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);

  // Form state
  const [fullName, setFullName] = useState('');
  const [emailIn, setEmailIn] = useState('');
  const [unitNo, setUnitNo] = useState('');

  // Submission / UI state
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [alreadyMemberMsg, setAlreadyMemberMsg] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(false);
  const [preflighting, setPreflighting] = useState(false);
  const [occupiedConfirm, setOccupiedConfirm] = useState(false);

  const auditRef = useRef(false);
  const openedRef = useRef(false);
  const autoSubmitFiredRef = useRef(false);
  const memberCheckFiredRef = useRef(false);
  const unitInputRef = useRef<HTMLInputElement>(null);

  // Apply lang param immediately
  useEffect(() => {
    if (langParam === 'en') setLanguage('en');
    else if (langParam === 'zh') setLanguage('zh');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langParam]);

  // Resolve property info
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setResolving(true);
      setResolveErr(null);
      setResolved(null);
      try {
        if (!propertyIdParam || !UUID_RE.test(propertyIdParam)) {
          setResolveErr(en ? 'Invalid or missing propertyId.' : 'propertyId 缺失或无效。');
          return;
        }
        // inviteCode is validated at submit time; don't block here so active members
        // (who may lack inviteCode in the URL) can still be detected and redirected.
        const id = propertyIdParam.toLowerCase();
        const { data, error } = await supabase
          .from('properties')
          .select('id,name')
          .eq('id', id)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          setResolveErr(en ? 'Could not load property.' : '无法加载物业信息。');
          return;
        }
        if (data?.id) {
          setResolved({ id: data.id, name: typeof data.name === 'string' ? data.name : '' });
          return;
        }
        setResolveErr(en ? 'Property not found.' : '未找到该物业。');
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();
    return () => { cancelled = true; };
  }, [propertyIdParam, en]);

  // Audit: entry page opened
  useEffect(() => {
    if (openedRef.current) return;
    const pid = propertyIdParam && UUID_RE.test(propertyIdParam)
      ? propertyIdParam.toLowerCase()
      : null;
    if (!pid) return;
    openedRef.current = true;
    void trackPropertyEntryEvent(supabase, {
      propertyId: pid,
      inviteCode: inviteCodeParam || null,
      source: sourceParam || null,
      eventType: 'opened',
    });
  }, [propertyIdParam, inviteCodeParam, sourceParam]);

  // Audit: entry opened with resolved property + invite code
  useEffect(() => {
    if (auditRef.current) return;
    if (!resolved?.id || !inviteCodeParam) return;
    auditRef.current = true;
    void (async () => {
      const { error } = await supabase.rpc('log_property_entry_client_event', {
        p_property_id: resolved.id,
        p_event_type: 'entry_opened',
        p_invite_code: inviteCodeParam || null,
        p_metadata: { source: sourceParam || 'entry', has_session: Boolean(session?.user) },
      });
      if (error) console.warn('[entry] log_property_entry_client_event', error.message);
    })();
  }, [resolved?.id, inviteCodeParam, sourceParam, session?.user]);

  // Pre-fill form from logged-in user profile
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name_en, email')
        .eq('id', user.id)
        .maybeSingle();
      const prof = data as { full_name_en?: string; email?: string } | null;
      if (typeof prof?.full_name_en === 'string' && prof.full_name_en.trim()) {
        setFullName((s) => s || prof.full_name_en!.trim());
      }
      const defEmail = (user.email ?? prof?.email ?? '').trim();
      if (defEmail) setEmailIn((e) => e || defEmail);
    })();
  }, [user?.id, user?.email]);

  const effectivePropertyId = useMemo(() => {
    if (propertyIdParam && UUID_RE.test(propertyIdParam)) return propertyIdParam.toLowerCase();
    return null;
  }, [propertyIdParam]);

  // Current full entry URL — used as emailRedirectTo for OTP
  const entryUrl = `${window.location.origin}${location.pathname}${location.search}`;

  /** Core join logic — calls entry-auto-join and handles all outcomes. */
  const runJoin = async (name: string, email: string, unit: string) => {
    if (!effectivePropertyId) {
      setSubmitErr(en ? 'Missing property ID.' : '缺少物业信息。');
      return;
    }
    setSubmitting(true);
    setSubmitErr(null);
    setAlreadyMemberMsg(null);
    try {
      console.log('[entry] submitting to entry-auto-join', {
        propertyId: effectivePropertyId,
        inviteCode: inviteCodeParam,
        unitNo: unit,
      });

      const { data, error } = await supabase.functions.invoke<{
        ok?: boolean;
        reason?: string;
        message?: string;
        redirectUrl?: string;
        kind?: string;
        propertyName?: string;
      }>('entry-auto-join', {
        body: {
          propertyId: effectivePropertyId,
          inviteCode: inviteCodeParam,
          fullName: name,
          email,
          unitNo: unit,
        },
      });

      console.log('[entry] entry-auto-join result', data, error);

      if (error) throw new Error(error.message || 'Entry failed');

      if (!data || data.ok !== true) {
        const reason = data?.reason ?? '';
        if (reason === 'unit_not_found') {
          // Unit not on whitelist → send to demo
          navigate('/demo', { replace: true });
          return;
        }
        if (reason === 'invalid_invite') {
          setSubmitErr(en ? 'Invite code is invalid or expired.' : '邀请码无效或已过期。');
          return;
        }
        if (reason === 'invite_unit_mismatch') {
          setSubmitErr(
            en ? 'Invite code does not match this unit.' : '邀请码与房号不匹配。',
          );
          return;
        }
        throw new Error(data?.message || 'Entry rejected');
      }

      const kind = data.kind ?? '';

      // need_confirm: unit occupied — let user decide whether to submit pending
      if (kind === 'need_confirm') {
        setOccupiedConfirm(true);
        return;
      }

      // already_member and auto_approved → go directly to the dashboard.
      // For auto_approved the user already has a session (OTP), so the token
      // redirect flow is not needed.
      if (kind === 'already_member' || kind === 'auto_approved') {
        navigate('/?propertyId=' + (effectivePropertyId ?? ''), { replace: true });
        return;
      }

      // pending_submitted and other states — use the server's redirectUrl
      if (data.redirectUrl) {
        navigate(data.redirectUrl, { replace: true });
        return;
      }

      // fallback for pending
      navigate('/join/pending', { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : en ? 'Entry failed.' : '加入失败。';
      setSubmitErr(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /** Send OTP magic-link — shared by handleSubmit and handleContinueAfterOccupied. */
  const doSendOtp = async (name: string, email: string, unit: string) => {
    setSubmitting(true);
    try {
      saveDraft(name, unit);
      const appOrigin =
        (import.meta.env.VITE_APP_BASE_URL as string | undefined) ||
        window.location.origin;
      const entryPath = location.pathname + location.search;
      const emailRedirectTo =
        appOrigin + '/auth/callback?redirect=' + encodeURIComponent(entryPath);
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo },
      });
      if (otpErr) {
        clearDraft();
        throw new Error(otpErr.message);
      }
      setOtpSent(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : en ? 'Could not send email.' : '发送失败，请重试。';
      setSubmitErr(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /** Called when user confirms to proceed after seeing the "unit occupied" warning. */
  const handleContinueAfterOccupied = async () => {
    const name = fullName.trim();
    const email = emailIn.trim();
    const unit = unitNo.trim();
    setOccupiedConfirm(false);
    if (session?.user) {
      await runJoin(name, email, unit); // entry-auto-join will return pending_submitted
    } else {
      await doSendOtp(name, email, unit); // OTP → auto-submit → pending
    }
  };

  /** Button click handler — includes pre-OTP preflight checks. */
  const handleSubmit = async () => {
    setSubmitErr(null);
    setAlreadyMemberMsg(null);
    setOccupiedConfirm(false);

    const name = fullName.trim();
    const email = emailIn.trim();
    const unit = unitNo.trim();

    if (!name || !email || !unit) {
      setSubmitErr(en ? 'Please fill in name, email, and unit.' : '请填写姓名、邮箱与房号。');
      return;
    }
    if (!effectivePropertyId) {
      setSubmitErr(en ? 'Missing property ID.' : '缺少物业信息。');
      return;
    }

    // ── Session present ────────────────────────────────────────────────────
    if (session?.user) {
      // Check if already active member of this property → go to Home
      setSubmitting(true);
      try {
        const { data: selfMem, error: selfMemErr } = await supabase
          .from('property_members')
          .select('id')
          .eq('property_id', effectivePropertyId)
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .maybeSingle();
        if (selfMemErr) {
          setSubmitErr(en ? 'Verification failed, please try again later.' : '系统验证中，请稍后再试。');
          return;
        }
        if (selfMem) {
          navigate('/?propertyId=' + effectivePropertyId, { replace: true });
          return;
        }
      } finally {
        setSubmitting(false);
      }
      // Not yet a member → entry-auto-join handles the rest
      await runJoin(name, email, unit);
      return;
    }

    // ── No session: pre-flight checks before sending OTP ──────────────────
    setPreflighting(true);
    try {
      // 1. Whitelist check — unit must exist in unit_whitelist for this property.
      const { data: wlRow, error: wlErr } = await supabase
        .from('unit_whitelist')
        .select('id')
        .eq('property_id', effectivePropertyId)
        .eq('unit_no', unit)
        .eq('is_active', true)
        .maybeSingle();

      if (wlErr) {
        // Query failed — block flow, do not send OTP
        setSubmitErr(en ? 'Verification failed, please try again later.' : '系统验证中，请稍后再试。');
        return;
      }
      if (!wlRow) {
        // Unit not in whitelist → Demo, no email sent
        navigate('/demo', { replace: true });
        return;
      }

      // 2. Occupancy check — is this unit already bound to an active member?
      const { data: occupant, error: occupantErr } = await supabase
        .from('property_members')
        .select('id')
        .eq('property_id', effectivePropertyId)
        .eq('unit_no', unit)
        .eq('status', 'active')
        .maybeSingle();

      if (occupantErr) {
        // Query failed — block flow, do not send OTP
        setSubmitErr(en ? 'Verification failed, please try again later.' : '系统验证中，请稍后再试。');
        return;
      }
      if (occupant) {
        // Unit occupied — show confirmation dialog, do not send email yet
        setOccupiedConfirm(true);
        return;
      }

      // 3. All checks passed → send OTP
      await doSendOtp(name, email, unit);
    } finally {
      setPreflighting(false);
    }
  };

  // Auto-submit once when session appears + draft exists (user returned via OTP link)
  useEffect(() => {
    if (!session?.user) return;
    if (!effectivePropertyId) return;
    if (!resolved) return;
    if (autoSubmitFiredRef.current) return;

    const draftName = sessionStorage.getItem(DRAFT_NAME_KEY) ?? '';
    const draftUnit = sessionStorage.getItem(DRAFT_UNIT_KEY) ?? '';

    if (!draftUnit) return; // no pending draft — user was already logged in

    autoSubmitFiredRef.current = true;

    // Clear draft before submitting to prevent re-fire on remount
    sessionStorage.removeItem(DRAFT_NAME_KEY);
    sessionStorage.removeItem(DRAFT_UNIT_KEY);

    const email = session.user.email ?? '';
    const name = draftName || fullName.trim();

    if (!email) return;

    // Restore into form state for visual feedback
    if (draftName) setFullName((s) => s || draftName);
    setUnitNo((s) => s || draftUnit);
    if (email) setEmailIn((s) => s || email);

    console.log('[entry] session + draft — auto-submitting join', { email, unit: draftUnit });
    void runJoin(name, email, draftUnit);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user, resolved]);

  // If already an active member of this property, skip the form and go straight to the app
  useEffect(() => {
    if (!session?.user) return;
    if (!effectivePropertyId) return;
    if (memberCheckFiredRef.current) return;
    memberCheckFiredRef.current = true;

    setCheckingMembership(true);
    void (async () => {
      const { data } = await supabase
        .from('property_members')
        .select('id, role, status, property_id')
        .eq('property_id', effectivePropertyId)
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (data) {
        console.log('[entry] active member detected, redirect to app', data);
        navigate('/?propertyId=' + effectivePropertyId, { replace: true });
      } else {
        setCheckingMembership(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user, effectivePropertyId]);

  // ── Render ────────────────────────────────────────────────────────────────

  // If /entry is opened without a propertyId, redirect out immediately.
  // This prevents the "propertyId 缺失或无效" dead-page when the guard in
  // App.tsx redirected here without params.
  if (!propertyIdParam) {
    return session?.user
      ? <Navigate to="/" replace />
      : <Navigate to="/login" replace />;
  }

  if (resolving || checkingMembership) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/40 to-gray-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-clearstrata-ui-primary animate-spin" aria-hidden />
        <p className="mt-4 text-sm text-gray-500">
          {checkingMembership
            ? (en ? 'Verifying entry info…' : '正在验证入楼信息…')
            : (en ? 'Loading…' : '加载中…')}
        </p>
      </div>
    );
  }

  if (resolveErr || !resolved) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/40 to-gray-50 flex flex-col items-center justify-center p-6">
        <Building2 className="w-12 h-12 text-gray-400 mb-3" />
        <p className="text-sm text-gray-800 text-center max-w-md">
          {resolveErr || (en ? 'Invalid link.' : '链接无效。')}
        </p>
        <Link to="/" className="mt-6 text-clearstrata-ui-primary font-medium text-sm">
          {en ? 'Home' : '返回首页'}
        </Link>
      </div>
    );
  }

  // OTP sent screen
  if (otpSent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/40 to-gray-50 flex items-start justify-center p-4 py-10">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center space-y-4">
          <div className="flex justify-center mb-2">
            <img src="/clearstrata-hero-logo.png" alt="ClearStrata" className="w-16 h-auto" />
          </div>
          <MailCheck className="mx-auto w-12 h-12 text-[#1D9E75]" />
          <h2 className="text-lg font-bold text-gray-900">
            {en ? 'Check your email' : '请查收登录邮件'}
          </h2>
          <p className="text-sm text-gray-600">
            {en
              ? 'We sent a login link to your email. Click the link to continue joining this property.'
              : '登录链接已发送到你的邮箱，点击邮件中的链接继续进入物业。'}
          </p>
          <p className="text-xs text-gray-400">
            {en ? 'You can close this tab.' : '收到邮件后点击链接，本页面可关闭。'}
          </p>
          <button
            type="button"
            onClick={() => setOtpSent(false)}
            className="text-sm text-clearstrata-ui-primary hover:underline"
          >
            {en ? '← Change email' : '← 修改邮箱重新发送'}
          </button>
        </div>
      </div>
    );
  }

  // Unit-occupied confirmation screen
  if (occupiedConfirm) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/40 to-gray-50 flex items-start justify-center p-4 py-10">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center space-y-4">
          <div className="flex justify-center mb-2">
            <img src="/clearstrata-hero-logo.png" alt="ClearStrata" className="w-16 h-auto" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            {en ? 'Unit already registered' : '该房号已被绑定'}
          </h2>
          <p className="text-sm text-gray-600">
            {en
              ? `Unit "${unitNo}" is already bound to another owner. Do you still want to submit an application?`
              : `房号 "${unitNo}" 已有业主登记。是否仍要继续提交申请？`}
          </p>
          <p className="text-xs text-gray-400">
            {en
              ? 'Your request will be reviewed by the strata council.'
              : '提交后将等待业委会审核处理。'}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void handleContinueAfterOccupied()}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1D9E75] text-white font-semibold text-sm hover:bg-[#178a66] disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {en ? 'Continue application' : '继续申请'}
            </button>
            <button
              type="button"
              onClick={() => setOccupiedConfirm(false)}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {en ? 'Cancel' : '取消'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/40 to-gray-50 flex items-start justify-center p-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
        {/* Header */}
        <div className="text-center">
          <div className="w-full flex justify-center mb-5">
            <img src="/clearstrata-hero-logo.png" alt="ClearStrata" className="w-20 h-auto" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {en ? 'Resident identity confirmation' : '业主身份确认'}
          </h1>
          <p className="text-sm text-gray-600 mt-2 text-left">
            {en
              ? 'Enter your information. A login link will be sent to your email to verify identity and join this property.'
              : '请填写你的信息，系统将发送邮件链接完成身份验证并加入物业。'}
          </p>
        </div>

        {/* Property info */}
        <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-sm space-y-1">
          <p>
            <span className="text-gray-500">{en ? 'Property' : '物业'}：</span>
            <span className="font-medium text-gray-900">{resolved.name}</span>
          </p>
          {inviteCodeParam && (
            <p>
              <span className="text-gray-500">{en ? 'Invite' : '邀请码'}：</span>
              <span className="font-mono font-medium text-gray-900">{inviteCodeParam}</span>
            </p>
          )}
        </div>

        {/* Auto-submitting / pre-flight overlay */}
        {(preflighting || (submitting && session?.user)) && (
          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-900 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            {preflighting
              ? (en ? 'Checking unit…' : '正在验证房号…')
              : (en ? 'Verifying entry info…' : '正在验证入楼信息…')}
          </div>
        )}

        {/* Form fields */}
        <div className="space-y-3">
          <label className="block text-sm text-gray-700">
            {en ? 'Name' : '姓名'}
            <input
              type="text"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clearstrata-ui-primary/40"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              disabled={submitting || preflighting}
              required
            />
          </label>
          <label className="block text-sm text-gray-700">
            {en ? 'Email' : '邮箱'}
            <input
              type="email"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clearstrata-ui-primary/40"
              value={emailIn}
              onChange={(e) => setEmailIn(e.target.value)}
              autoComplete="email"
              disabled={submitting || preflighting || Boolean(session?.user)}
              required
            />
            {session?.user && (
              <button
                type="button"
                onClick={async () => {
                  clearDraft();
                  await supabase.auth.signOut();
                  setEmailIn('');
                }}
                className="mt-1 text-xs text-clearstrata-ui-primary hover:underline"
              >
                {en ? 'Switch email' : '切换邮箱'}
              </button>
            )}
          </label>
          <label className="block text-sm text-gray-700">
            {en ? 'Unit / suite' : '房号（必填）'}
            <input
              ref={unitInputRef}
              type="text"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clearstrata-ui-primary/40"
              value={unitNo}
              onChange={(e) => {
                setUnitNo(e.target.value);
                setSubmitErr(null);
              }}
              disabled={submitting || preflighting}
              required
            />
          </label>
        </div>

        {/* Error */}
        {submitErr && (
          <div role="alert" className="rounded-xl px-3 py-2 text-sm bg-red-50 text-red-900 border border-red-200">
            {submitErr}
          </div>
        )}

        {/* Already-member info (blue) */}
        {alreadyMemberMsg && (
          <div role="status" className="rounded-xl px-3 py-2 text-sm bg-blue-50 text-blue-900 border border-blue-200">
            {alreadyMemberMsg}
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting || preflighting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1D9E75] text-white font-semibold text-sm hover:bg-[#178a66] disabled:opacity-50 transition-colors"
        >
          {(submitting || preflighting) ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {preflighting
            ? (en ? 'Checking…' : '验证中…')
            : session?.user
              ? (en ? 'Submit' : '提交并验证')
              : (en ? 'Send login link' : '发送登录链接')}
        </button>

        <p className="text-xs text-gray-400 text-center">property: {resolved.id.slice(0, 8)}…</p>
      </div>
    </div>
  );
}
