import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Loader2, MailCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { trackPropertyEntryEvent } from '../../lib/propertyEntryEvents';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 与 App 路由一致：`/` 为主应用首页；若某部署将匿名落地页固定为 `/entry`，改为 `'/entry'`。 */
const BACK_TO_HOME_PATH: '/' | '/entry' = '/';

const OTP_LENGTH = 8;

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
  const [otpCode, setOtpCode] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [checkingMembership, setCheckingMembership] = useState(false);
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
          setResolveErr('propertyId 缺失或无效。');
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
          setResolveErr('无法加载物业信息。');
          return;
        }
        if (data?.id) {
          setResolved({ id: data.id, name: typeof data.name === 'string' ? data.name : '' });
          return;
        }
        setResolveErr('未找到该物业。');
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

  // Current full entry URL (retained for potential audit/logging use)
  const entryUrl = `${window.location.origin}${location.pathname}${location.search}`;

  /** Core join logic — calls entry-auto-join and handles all outcomes. */
  const runJoin = async (name: string, email: string, unit: string) => {
    if (!effectivePropertyId) {
      setSubmitErr('缺少物业信息。');
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
      console.log('[ENTRY FLOW] submit', {
        propertyId: effectivePropertyId,
        unit,
        email,
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
      console.log('[ENTRY FLOW] result', {
        ok: data?.ok,
        kind: data?.kind,
        reason: data?.reason,
      });

      if (error) throw new Error(error.message || 'Entry failed');

      // ── ok:false 分支 ──────────────────────────────────────────────────────
      if (!data || data.ok !== true) {
        const reason = data?.reason ?? '';

        if (reason === 'unit_not_found') {
          navigate('/demo', { replace: true });
          return;
        }
        if (reason === 'invalid_invite') {
          setSubmitErr('邀请码无效或已过期。');
          return;
        }
        if (reason === 'invite_unit_mismatch') {
          setSubmitErr('邀请码与房号不匹配。');
          return;
        }
        throw new Error(data?.message || '加入失败');
      }

      // ── ok:true 分支 ───────────────────────────────────────────────────────
      const kind = data.kind ?? '';

      if (kind === 'pending_submitted') {
        navigate('/join/pending', {
          replace: true,
          state: {
            propertyId: effectivePropertyId,
            propertyName: data.propertyName,
            unitNo: unit,
            reason: data.reason || 'occupied',
            requestId: (data as Record<string, unknown>).request_id,
            reviewFlag: 'occupied',
          },
        });
        return;
      }

      if (kind === 'already_member') {
        if (session?.user) {
          console.log('[ENTRY FLOW] already_member with session redirect home', effectivePropertyId);
          navigate('/?propertyId=' + effectivePropertyId, { replace: true });
          return;
        }
        console.log('[ENTRY FLOW] already_member without session send OTP', effectivePropertyId);
        await doSendOtp(name, email, unit);
        return;
      }

      if (kind === 'auto_approved') {
        if (session?.user) {
          navigate('/?propertyId=' + effectivePropertyId, { replace: true });
        } else {
          await doSendOtp(name, email, unit);
        }
        return;
      }

      // 未知返回 — 兜底报错
      throw new Error(data?.message || 'Unexpected response from server');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '加入失败。';
      setSubmitErr(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Resend countdown: 60s after each send
  useEffect(() => {
    if (!otpSent) return;
    setResendCountdown(60);
    const id = window.setInterval(() => {
      setResendCountdown((c) => {
        if (c <= 1) { clearInterval(id); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpSent]);

  /** Send OTP code — no magic link, no /auth/callback dependency. */
  const doSendOtp = async (name: string, email: string, unit: string) => {
    setSubmitting(true);
    setSubmitErr(null);
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
          data: {
            full_name: name,
            unit_no: unit,
            property_id: effectivePropertyId ?? undefined,
          },
        },
      });
      if (otpErr) throw new Error(otpErr.message);
      setOtpCode('');
      setResendCountdown(60);
      setOtpSent(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '发送失败，请重试。';
      setSubmitErr(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /** Verify OTP code; on success, re-run join with the established session. */
  const handleVerifyOtp = async () => {
    const email = emailIn.trim().toLowerCase();
    const code = otpCode.trim();
    if (!email || code.length < OTP_LENGTH) return;

    setOtpVerifying(true);
    setSubmitErr(null);
    try {
      console.log('[ENTRY FLOW] verifyOtp', { email });
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'magiclink',
      });
      if (verifyErr) {
        console.error('[ENTRY FLOW] verifyOtp failed', verifyErr.message);
        setSubmitErr('验证码无效或已过期，请重新输入。');
        return;
      }
      console.log('[ENTRY FLOW] verifyOtp ok, running join');
      setOtpSent(false);
      await runJoin(fullName.trim(), email, unitNo.trim());
    } catch (e) {
      const msg = e instanceof Error ? e.message : '验证失败，请重试。';
      setSubmitErr(msg);
    } finally {
      setOtpVerifying(false);
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

  /** Button click handler — delegates all validation to entry-auto-join. */
  const handleSubmit = async () => {
    setSubmitErr(null);
    setAlreadyMemberMsg(null);
    setOccupiedConfirm(false);

    const name = fullName.trim();
    const email = emailIn.trim();
    const unit = unitNo.trim();

    if (!name || !email || !unit) {
      setSubmitErr('请填写姓名、邮箱与房号。');
      return;
    }
    if (!effectivePropertyId) {
      setSubmitErr('缺少物业信息。');
      return;
    }

    await runJoin(name, email, unit);
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
          {checkingMembership ? '正在验证入楼信息…' : '加载中…'}
        </p>
      </div>
    );
  }

  if (resolveErr || !resolved) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/40 to-gray-50 flex flex-col items-center justify-center p-6">
        <Building2 className="w-12 h-12 text-gray-400 mb-3" />
        <p className="text-sm text-gray-800 text-center max-w-md">
          {resolveErr || '链接无效。'}
        </p>
        <button
          type="button"
          onClick={() => navigate(BACK_TO_HOME_PATH)}
          className="mt-6 w-full max-w-md text-left text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          <span>← 返回首页</span>
          <span className="block text-[10px] text-gray-400 mt-0.5">Back to home</span>
        </button>
      </div>
    );
  }

  // OTP code input screen
  if (otpSent) {
    const resendDisabled = submitting || resendCountdown > 0;
    return (
      <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/40 to-gray-50 flex items-start justify-center p-4 py-10">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center space-y-4">
          <button
            type="button"
            onClick={() => navigate(BACK_TO_HOME_PATH)}
            className="block w-full text-left text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <span>← 返回首页</span>
            <span className="block text-[10px] text-gray-400 mt-0.5">Back to home</span>
          </button>
          <div className="flex justify-center mb-2">
            <img src="/clearstrata-hero-logo.png" alt="ClearStrata" className="w-16 h-auto" />
          </div>
          <MailCheck className="mx-auto w-12 h-12 text-[#1D9E75]" />
          <h2 className="text-lg font-bold text-gray-900">
            输入邮箱验证码
            <span className="block text-xs font-normal text-gray-400 mt-0.5">Enter verification code</span>
          </h2>
          <p className="text-sm text-gray-600">
            验证码已发送到 <span className="font-medium">{emailIn}</span>。请打开邮箱，复制 {OTP_LENGTH} 位验证码后粘贴到下方。
            <span className="block text-xs text-gray-400 mt-1">
              A {OTP_LENGTH}-digit code was sent to {emailIn}. Open your email, copy and paste it below.
            </span>
          </p>

          <input
            type="text"
            inputMode="numeric"
            maxLength={OTP_LENGTH}
            autoFocus
            className="w-full text-center text-2xl font-mono tracking-[0.4em] border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-clearstrata-ui-primary/40"
            placeholder={'─'.repeat(OTP_LENGTH)}
            value={otpCode}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH);
              setOtpCode(digits);
              setSubmitErr(null);
              if (digits.length === OTP_LENGTH) {
                setTimeout(() => void handleVerifyOtp(), 0);
              }
            }}
            disabled={otpVerifying}
          />

          {submitErr && (
            <div role="alert" className="rounded-xl px-3 py-2 text-sm bg-red-50 text-red-900 border border-red-200">
              {submitErr}
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleVerifyOtp()}
            disabled={otpVerifying || otpCode.length < OTP_LENGTH}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1D9E75] text-white font-semibold text-sm hover:bg-[#178a66] disabled:opacity-50 transition-colors"
          >
            {otpVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            验证并进入物业
          </button>

          <div className="flex justify-between text-sm pt-1">
            <button
              type="button"
              onClick={() => { setOtpSent(false); setOtpCode(''); setSubmitErr(null); setResendCountdown(0); }}
              className="text-clearstrata-ui-primary hover:underline"
            >
              ← 修改信息
            </button>
            <button
              type="button"
              disabled={resendDisabled}
              onClick={() => void doSendOtp(fullName.trim(), emailIn.trim(), unitNo.trim())}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="w-3 h-3 animate-spin inline mr-1" />}
              {resendCountdown > 0 ? `重新发送（${resendCountdown}s）` : '重新发送验证码'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Unit-occupied confirmation screen
  if (occupiedConfirm) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/40 to-gray-50 flex items-start justify-center p-4 py-10">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center space-y-4">
          <button
            type="button"
            onClick={() => navigate(BACK_TO_HOME_PATH)}
            className="block w-full text-left text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <span>← 返回首页</span>
            <span className="block text-[10px] text-gray-400 mt-0.5">Back to home</span>
          </button>
          <div className="flex justify-center mb-2">
            <img src="/clearstrata-hero-logo.png" alt="ClearStrata" className="w-16 h-auto" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            该房号已被绑定
            <span className="block text-xs font-normal text-gray-400 mt-0.5">Unit already registered</span>
          </h2>
          <p className="text-sm text-gray-600">
            房号 &ldquo;{unitNo}&rdquo; 已有业主登记，是否仍要继续提交申请？
            <span className="block text-xs text-gray-400 mt-1">
              Unit &ldquo;{unitNo}&rdquo; is already bound to another owner. Submit anyway?
            </span>
          </p>
          <p className="text-xs text-gray-400">提交后将等待业委会审核处理。</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void handleContinueAfterOccupied()}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1D9E75] text-white font-semibold text-sm hover:bg-[#178a66] disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              继续申请
            </button>
            <button
              type="button"
              onClick={() => setOccupiedConfirm(false)}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              取消
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
        <button
          type="button"
          onClick={() => navigate(BACK_TO_HOME_PATH)}
          className="block w-full text-left text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          <span>← 返回首页</span>
          <span className="block text-[10px] text-gray-400 mt-0.5">Back to home</span>
        </button>
        {/* Header */}
        <div className="text-center">
          <div className="w-full flex justify-center mb-5">
            <img src="/clearstrata-hero-logo.png" alt="ClearStrata" className="w-20 h-auto" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            业主身份确认
            <span className="block text-xs font-normal text-gray-400 mt-0.5">Resident identity confirmation</span>
          </h1>
          <p className="text-sm text-gray-600 mt-2 text-left">
            请填写你的信息，系统将向邮箱发送 {OTP_LENGTH} 位验证码完成身份验证。
            <span className="block text-xs text-gray-400 mt-1">
              Fill in your info. A {OTP_LENGTH}-digit code will be sent to your email.
            </span>
          </p>
        </div>

        {/* Property info */}
        <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-sm space-y-1">
          <p>
            <span className="text-gray-500">物业：</span>
            <span className="font-medium text-gray-900">{resolved.name}</span>
          </p>
          {inviteCodeParam && (
            <p>
              <span className="text-gray-500">邀请码：</span>
              <span className="font-mono font-medium text-gray-900">{inviteCodeParam}</span>
            </p>
          )}
        </div>

        {/* Submitting overlay */}
        {submitting && (
          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-900 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            正在验证入楼信息…
          </div>
        )}

        {/* Form fields */}
        <div className="space-y-3">
          <label className="block text-sm text-gray-700">
            姓名
            <input
              type="text"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clearstrata-ui-primary/40"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              disabled={submitting}
              required
            />
          </label>
          <label className="block text-sm text-gray-700">
            邮箱
            <input
              type="email"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clearstrata-ui-primary/40"
              value={emailIn}
              onChange={(e) => setEmailIn(e.target.value)}
              autoComplete="email"
              disabled={submitting || Boolean(session?.user)}
              required
            />
            {session?.user && (
              <button
                type="button"
                onClick={async () => {
                  clearDraft();
                  setFullName('');
                  setEmailIn('');
                  setUnitNo('');
                  setSubmitErr(null);
                  setAlreadyMemberMsg(null);
                  setOccupiedConfirm(false);
                  await supabase.auth.signOut();
                  navigate('/', { replace: true });
                }}
                className="mt-1 text-xs text-clearstrata-ui-primary hover:underline"
              >
                切换邮箱
              </button>
            )}
          </label>
          <label className="block text-sm text-gray-700">
            房号
            <input
              ref={unitInputRef}
              type="text"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clearstrata-ui-primary/40"
              value={unitNo}
              onChange={(e) => {
                setUnitNo(e.target.value);
                setSubmitErr(null);
              }}
              disabled={submitting}
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
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1D9E75] text-white font-semibold text-sm hover:bg-[#178a66] disabled:opacity-50 transition-colors"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          提交并验证
        </button>

        <p className="text-xs text-gray-400 text-center">property: {resolved.id.slice(0, 8)}…</p>
      </div>
    </div>
  );
}
