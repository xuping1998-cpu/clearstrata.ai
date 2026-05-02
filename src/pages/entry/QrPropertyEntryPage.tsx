import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, ExternalLink, Loader2, MailCheck } from 'lucide-react';
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
  const [unitNotFound, setUnitNotFound] = useState(false);
  const [alreadyMemberMsg, setAlreadyMemberMsg] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  const auditRef = useRef(false);
  const openedRef = useRef(false);
  const autoSubmitFiredRef = useRef(false);
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
        if (!inviteCodeParam) {
          setResolveErr(en ? 'Invalid or missing inviteCode.' : 'inviteCode 缺失或无效。');
          return;
        }
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
  }, [propertyIdParam, inviteCodeParam, en]);

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
    if (!effectivePropertyId || !inviteCodeParam) {
      setSubmitErr(en ? 'Missing property or invite code.' : '缺少物业或邀请码。');
      return;
    }
    setSubmitting(true);
    setSubmitErr(null);
    setUnitNotFound(false);
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
          setUnitNotFound(true);
          setSubmitErr(
            en
              ? `Unit "${unit}" is not on the whitelist for this property.`
              : `房号 "${unit}" 不在本物业白名单内。`,
          );
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

      // Already a member — show info and navigate home
      if (data.kind === 'already_member') {
        setAlreadyMemberMsg(
          en
            ? 'You are already a member of this property. To change your unit, please contact the council or administrator.'
            : '你已是本物业业主。如需更改房号，请联系理事会/管理员处理。',
        );
        setTimeout(() => navigate('/', { replace: true }), 2500);
        return;
      }

      if (!data.redirectUrl) throw new Error('No redirect URL returned from server');

      navigate(data.redirectUrl, { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : en ? 'Entry failed.' : '加入失败。';
      setSubmitErr(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /** Button click handler. */
  const handleSubmit = async () => {
    setSubmitErr(null);
    setUnitNotFound(false);
    setAlreadyMemberMsg(null);

    const name = fullName.trim();
    const email = emailIn.trim();
    const unit = unitNo.trim();

    if (!name || !email || !unit) {
      setSubmitErr(en ? 'Please fill in name, email, and unit.' : '请填写姓名、邮箱与房号。');
      return;
    }
    if (!effectivePropertyId || !inviteCodeParam) {
      setSubmitErr(en ? 'Missing property or invite code.' : '缺少物业或邀请码。');
      return;
    }

    // Already logged in — go straight to join
    if (session?.user) {
      await runJoin(name, email, unit);
      return;
    }

    // Not logged in — send OTP magic-link and save draft
    setSubmitting(true);
    try {
      saveDraft(name, unit);

      const appOrigin =
        (import.meta.env.VITE_APP_BASE_URL as string | undefined) ||
        window.location.origin;
      const entryPath = `${location.pathname}${location.search}`;
      const emailRedirectTo = `${appOrigin}/auth/callback?redirect=${encodeURIComponent(entryPath)}`;

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

  // Auto-submit once when session appears + draft exists (user clicked OTP link)
  useEffect(() => {
    if (!session?.user) return;
    if (autoSubmitFiredRef.current) return;
    if (!resolved) return; // wait for property to resolve first

    const draft = loadDraft();
    if (!draft) return; // no pending draft — user was already logged in before

    autoSubmitFiredRef.current = true;
    clearDraft();

    const email = (user?.email ?? session.user.email ?? '').trim();
    const name = fullName.trim() || draft.name;

    if (!email || !draft.unit) return;

    // Restore into form state for visual feedback
    if (draft.name) setFullName((s) => s || draft.name);
    setUnitNo((s) => s || draft.unit);

    console.log('[entry] session detected + draft found — auto-submitting join', { email, unit: draft.unit });
    void runJoin(name, email, draft.unit);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user, resolved]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (resolving) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/40 to-gray-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-clearstrata-ui-primary animate-spin" aria-hidden />
        <p className="mt-4 text-sm text-gray-500">{en ? 'Loading…' : '加载中…'}</p>
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
          <p>
            <span className="text-gray-500">{en ? 'Invite' : '邀请码'}：</span>
            <span className="font-mono font-medium text-gray-900">{inviteCodeParam}</span>
          </p>
        </div>

        {/* Auto-submitting overlay */}
        {submitting && session?.user && (
          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-900 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            {en ? 'Verifying membership…' : '正在验证身份，请稍候…'}
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
              disabled={submitting}
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
              disabled={submitting || Boolean(session?.user)}
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
                setUnitNotFound(false);
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

        {/* unit_not_found: demo link + edit unit */}
        {unitNotFound ? (
          <div className="space-y-2">
            <a
              href="https://www.clearstrata.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-emerald-300 text-emerald-800 bg-emerald-50 font-medium text-sm hover:bg-emerald-100"
            >
              <ExternalLink size={14} />
              {en ? 'View Demo' : '查看 Demo'}
            </a>
            <button
              type="button"
              onClick={() => {
                setSubmitErr(null);
                setUnitNotFound(false);
                setTimeout(() => unitInputRef.current?.focus(), 0);
              }}
              className="w-full py-2.5 rounded-xl border border-gray-300 text-gray-700 bg-white font-medium text-sm hover:bg-gray-50 transition-colors"
            >
              {en ? 'Change unit number' : '修改房号'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1D9E75] text-white font-semibold text-sm hover:bg-[#178a66] disabled:opacity-50 transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {session?.user
              ? (en ? 'Submit' : '提交并验证')
              : (en ? 'Send login link' : '发送登录链接')}
          </button>
        )}

        <p className="text-xs text-gray-400 text-center">property: {resolved.id.slice(0, 8)}…</p>
      </div>
    </div>
  );
}
