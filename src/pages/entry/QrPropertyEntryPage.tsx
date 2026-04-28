import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, ExternalLink, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { trackPropertyEntryEvent } from '../../lib/propertyEntryEvents';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Public QR entry page: /entry?propertyId=...&inviteCode=...
 *  Demo/marketing flows must NOT use this page.
 *  Auto-join flow: submit → entry-auto-join Edge Function → /entry/auto-login?token=... */
export function QrPropertyEntryPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { session, user } = useAuth();
  const { language } = useLanguage();
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

  // Property resolution state
  const [resolved, setResolved] = useState<{ id: string; name: string } | null>(null);
  const [resolveErr, setResolveErr] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);

  // Form state
  const [fullName, setFullName] = useState('');
  const [emailIn, setEmailIn] = useState('');
  const [unitNo, setUnitNo] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [unitNotFound, setUnitNotFound] = useState(false);

  const auditRef = useRef(false);
  const openedRef = useRef(false);

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
    return () => {
      cancelled = true;
    };
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

  const redirectTo = `${location.pathname}${location.search}`;

  const handleSubmit = async () => {
    setSubmitErr(null);
    setUnitNotFound(false);

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

    setSubmitting(true);
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

      if (error) {
        throw new Error(error.message || 'Entry failed');
      }

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

      if (!data.redirectUrl) {
        throw new Error('No redirect URL returned from server');
      }

      // Navigate to /entry/auto-login?token=... which will establish session and navigate to final_redirect
      navigate(data.redirectUrl, { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : en ? 'Entry failed.' : '加入失败。';
      setSubmitErr(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Loading: property resolution in progress
  if (resolving) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/40 to-gray-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-clearstrata-ui-primary animate-spin" aria-hidden />
        <p className="mt-4 text-sm text-gray-500">{en ? 'Loading…' : '加载中…'}</p>
      </div>
    );
  }

  // Error: property not found / invalid link
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

  // Form
  return (
    <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/40 to-gray-50 flex items-start justify-center p-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-clearstrata-ui-primary text-white mb-3">
            <Building2 size={24} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {en ? 'Resident identity confirmation' : '业主身份确认'}
          </h1>
          <p className="text-sm text-gray-600 mt-2 text-left">
            {en
              ? 'Enter information that matches this building. The system checks the unit whitelist and decides if you can enter directly.'
              : '请填写与你所在物业一致的信息。系统会根据本物业白名单自动判断是否可直接进入。'}
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
              disabled={submitting}
              required
            />
          </label>
          <label className="block text-sm text-gray-700">
            {en ? 'Unit / suite' : '房号（必填）'}
            <input
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

        {/* Error message */}
        {submitErr && (
          <div
            role="alert"
            className="rounded-xl px-3 py-2 text-sm bg-red-50 text-red-900 border border-red-200"
          >
            {submitErr}
          </div>
        )}

        {/* Demo button — shown when unit is not on whitelist */}
        {unitNotFound && (
          <a
            href="https://www.clearstrata.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-emerald-300 text-emerald-800 bg-emerald-50 font-medium text-sm hover:bg-emerald-100"
          >
            <ExternalLink size={14} />
            {en ? 'View Demo' : '查看 Demo'}
          </a>
        )}

        {/* Submit button */}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1D9E75] text-white font-semibold text-sm hover:bg-[#178a66] disabled:opacity-50 transition-colors"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {en ? 'Submit' : '提交并验证'}
        </button>

        {/* Already have an account? */}
        {!session?.user && (
          <p className="text-xs text-gray-400 text-center">
            {en ? 'Already registered? ' : '已有账号？'}
            <Link
              to={`/login?redirect=${encodeURIComponent(redirectTo)}`}
              className="text-clearstrata-ui-primary hover:underline"
            >
              {en ? 'Sign in' : '登录'}
            </Link>
          </p>
        )}

        <p className="text-xs text-gray-400 text-center">property: {resolved.id.slice(0, 8)}…</p>
      </div>
    </div>
  );
}
