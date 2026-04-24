import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import { supabase } from '../../lib/supabase';
import { samePropertyId } from '../../lib/propertyIdMatch';
import { readPropertyEntryDraft } from '@/lib/propertyEntryDraft';
import { firstRpcJsonRow } from '../../lib/rpcJsonRow';
import { trackPropertyEntryEvent } from '../../lib/propertyEntryEvents';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function firstRow<T extends Record<string, unknown>>(data: unknown): T | null {
  if (data == null) return null;
  if (Array.isArray(data)) return (data[0] as T) ?? null;
  if (typeof data === 'object') return data as T;
  return null;
}

function normalizePropertyRow(row: Record<string, unknown> | null | undefined): { id: string; name: string } | null {
  if (!row || typeof row.id !== 'string') return null;
  return {
    id: row.id,
    name: typeof row.name === 'string' ? row.name : '',
  };
}

function persistCurrentPropertyId(propertyId: string) {
  try {
    localStorage.setItem('currentPropertyId', propertyId);
    localStorage.setItem('clearstrata-current-property-id', propertyId);
  } catch {
    /* ignore */
  }
}

/** 公开邀请 /entry；demo/营销演示走独立入口，勿混用本页。 */
export function QrPropertyEntryPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { session, user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const en = language === 'en';
  const { setCurrentPropertyId, refreshMemberships } = useProperty();

  const propertyIdParam = useMemo(
    () => (searchParams.get('propertyId') || searchParams.get('property_id') || '').trim(),
    [searchParams],
  );
  const inviteCodeParam = useMemo(() => {
    const a = (searchParams.get('inviteCode') || searchParams.get('invite_code') || '').trim();
    if (a) return a;
    const pid = (searchParams.get('propertyId') || searchParams.get('property_id') || '').trim();
    if (pid && UUID_RE.test(pid)) {
      const c = (searchParams.get('code') || '').trim();
      if (c) return c;
    }
    return '';
  }, [searchParams]);

  const hasInviteInSearch = useMemo(() => {
    const ic = (searchParams.get('inviteCode') || '').trim();
    const ic2 = (searchParams.get('invite_code') || '').trim();
    const code = (searchParams.get('code') || '').trim();
    return !!(ic || ic2 || code);
  }, [searchParams]);

  const propertyCodeParam = useMemo(() => (searchParams.get('propertyCode') || '').trim(), [searchParams]);
  const sourceParam = useMemo(() => (searchParams.get('source') || '').trim(), [searchParams]);

  const [resolved, setResolved] = useState<{ id: string; name: string } | null>(null);
  const [resolveErr, setResolveErr] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const [fullName, setFullName] = useState('');
  const [emailIn, setEmailIn] = useState('');
  const [unitNo, setUnitNo] = useState('');

  const openedLoggedRef = useRef(false);
  const entryOpenAuditRef = useRef(false);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const redirectTo = `${location.pathname}${location.search}`;

  useEffect(() => {
    if (authLoading) return;
    if (session?.user) return;
    if (resolving) return;
    if (resolveErr || !resolved) return;
    navigate(`/login?redirect=${encodeURIComponent(redirectTo)}`, { replace: true });
  }, [authLoading, session, resolving, resolveErr, resolved, navigate, redirectTo]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setResolving(true);
      setResolveErr(null);
      setResolved(null);
      try {
        if (propertyIdParam && UUID_RE.test(propertyIdParam)) {
          const id = propertyIdParam.toLowerCase();
          const { data, error } = await supabase.from('properties').select('id,name').eq('id', id).maybeSingle();
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
          return;
        }

        if (propertyCodeParam) {
          const { data, error } = await supabase.rpc('resolve_property_for_join_request', {
            p_code: propertyCodeParam,
          });
          if (cancelled) return;
          if (error) {
            setResolveErr(en ? 'Could not resolve property code.' : '无法解析物业代码。');
            return;
          }
          const row = firstRow<Record<string, unknown>>(data);
          const p = normalizePropertyRow(row);
          if (p) {
            setResolved(p);
            return;
          }
          setResolveErr(en ? 'No property matches this code.' : '未找到该物业代码。');
          return;
        }

        setResolveErr(en ? 'Missing propertyId or propertyCode in the link.' : '链接中缺少 propertyId 或 propertyCode。');
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [propertyIdParam, propertyCodeParam, en]);

  useEffect(() => {
    if (openedLoggedRef.current) return;
    const pid = propertyIdParam && UUID_RE.test(propertyIdParam) ? propertyIdParam.toLowerCase() : null;
    if (!pid) return;
    openedLoggedRef.current = true;
    void trackPropertyEntryEvent(supabase, {
      propertyId: pid,
      inviteCode: inviteCodeParam || null,
      source: sourceParam || null,
      eventType: 'opened',
    });
  }, [propertyIdParam, inviteCodeParam, sourceParam]);

  /** 审计：打开入楼链接（独立销售 demo 勿用 /entry 与真码，见 Qr 页头注释） */
  useEffect(() => {
    if (entryOpenAuditRef.current) return;
    if (!resolved?.id || !hasInviteInSearch) return;
    entryOpenAuditRef.current = true;
    void (async () => {
      const { error } = await supabase.rpc('log_property_entry_client_event', {
        p_property_id: resolved.id,
        p_event_type: 'entry_opened',
        p_invite_code: inviteCodeParam || null,
        p_metadata: { source: sourceParam || 'entry', has_session: Boolean(session?.user) },
      });
      if (error) console.warn('[entry] log_property_entry_client_event', error.message);
    })();
  }, [resolved?.id, hasInviteInSearch, inviteCodeParam, sourceParam, session?.user]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase.from('profiles').select('full_name_en, email').eq('id', user.id).maybeSingle();
      const prof = data as { full_name_en?: string; email?: string } | null;
      if (typeof prof?.full_name_en === 'string' && prof.full_name_en.trim()) setFullName((s) => s || prof.full_name_en!.trim());
      const defEmail = (user.email ?? prof?.email ?? '').trim();
      if (defEmail) setEmailIn((e) => e || defEmail);
    })();
  }, [user?.id, user?.email]);

  const effectivePropertyId = useMemo(() => {
    if (propertyIdParam && UUID_RE.test(propertyIdParam)) return propertyIdParam.toLowerCase();
    if (propertyCodeParam && resolved?.id) return resolved.id;
    return null;
  }, [propertyIdParam, propertyCodeParam, resolved?.id]);

  useEffect(() => {
    if (!effectivePropertyId) return;
    const d = readPropertyEntryDraft();
    if (!d?.propertyId || !samePropertyId(d.propertyId, effectivePropertyId)) return;
    const fn = d.fullName?.trim();
    const em = d.email?.trim();
    const un = d.unitNumber?.trim();
    if (fn) setFullName((s) => s.trim() || fn);
    if (em) setEmailIn((s) => s.trim() || em);
    if (un) setUnitNo((s) => s.trim() || un);
  }, [effectivePropertyId]);

  const handleSubmit = async () => {
    if (!session?.user?.id || !effectivePropertyId || !inviteCodeParam.trim()) {
      setToast({ kind: 'error', text: en ? 'Missing data.' : '数据不完整。' });
      return;
    }
    const name = fullName.trim();
    const em = emailIn.trim();
    const unit = unitNo.trim();
    if (!name || !em || !unit) {
      setToast({ kind: 'error', text: en ? 'Please fill name, email, and unit.' : '请填写姓名、邮箱与房号。' });
      return;
    }

    setSubmitting(true);
    setToast(null);
    try {
      const { data, error } = await supabase.rpc('enter_property_by_public_invite_v2', {
        p_property_id: effectivePropertyId,
        p_invite_code: inviteCodeParam.trim(),
        p_full_name: name,
        p_email: em,
        p_unit_no: unit,
      });

      const row = firstRpcJsonRow(data);
      if (error) {
        setToast({ kind: 'error', text: error.message || (en ? 'Request failed.' : '请求失败。') });
        return;
      }

      const ok = row?.ok === true;
      const status = String(row?.status ?? '');

      if (!ok) {
        if (status === 'auth_required') {
          navigate(`/login?redirect=${encodeURIComponent(redirectTo)}`, { replace: true });
          return;
        }
        if (status === 'invalid_invite' || status === 'invalid_arguments') {
          setToast({
            kind: 'error',
            text: en
              ? 'This invite is invalid, expired, exhausted, or has been disabled.'
              : '邀请码无效、已停用、已过期或次数已用完。',
          });
          return;
        }
        setToast({ kind: 'error', text: en ? 'Could not complete entry.' : '无法完成入楼。' });
        return;
      }

      if (status === 'already_member') {
        const pid = String(row?.property_id ?? effectivePropertyId);
        persistCurrentPropertyId(pid);
        setCurrentPropertyId(pid);
        await refreshMemberships();
        setToast({ kind: 'success', text: en ? 'You are already a member of this property.' : '你已是本物业成员。' });
        window.setTimeout(() => navigate('/', { replace: true }), 1200);
        return;
      }

      if (status === 'auto_approved') {
        const pid = String(row?.property_id ?? effectivePropertyId);
        persistCurrentPropertyId(pid);
        setCurrentPropertyId(pid);
        await refreshMemberships();
        setToast({ kind: 'success', text: en ? 'Verified against the whitelist. Welcome to your property.' : '已通过白名单验证，欢迎进入本物业。' });
        window.setTimeout(() => navigate('/', { replace: true }), 1000);
        return;
      }

      if (status === 'pending_review' || status === 'duplicate_pending') {
        const rf = String(row?.review_flag ?? '');
        navigate('/join/pending', { replace: true, state: { reviewFlag: rf, propertyName: resolved?.name } });
        return;
      }

      setToast({ kind: 'error', text: en ? 'Unexpected response.' : '未预期的返回。' });
    } finally {
      setSubmitting(false);
    }
  };

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
        <p className="text-sm text-gray-800 text-center max-w-md">{resolveErr || (en ? 'Invalid link.' : '链接无效。')}</p>
        <Link to="/" className="mt-6 text-clearstrata-ui-primary font-medium text-sm">
          {en ? 'Home' : '返回首页'}
        </Link>
      </div>
    );
  }

  if (authLoading || !session?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/40 to-gray-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-clearstrata-ui-primary animate-spin" aria-hidden />
        <p className="mt-4 text-sm text-gray-500">{en ? 'Sign in required…' : '正在前往登录…'}</p>
      </div>
    );
  }

  if (session?.user && resolved && !hasInviteInSearch) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/40 to-gray-50 flex flex-col items-center justify-center p-6">
        <p className="text-sm text-red-800">{en ? 'Missing invite code in entry URL' : '入口链接缺少邀请码'}</p>
        <Link to="/" className="mt-4 text-clearstrata-ui-primary text-sm">
          {en ? 'Home' : '首页'}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/40 to-gray-50 flex items-start justify-center p-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-clearstrata-ui-primary text-white mb-3">
            <Building2 size={24} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {en ? 'Resident identity confirmation' : '业主身份确认'}
          </h1>
          <p className="text-sm text-gray-600 mt-2 text-left">
            {en
              ? 'Please enter information that matches this building. The system will check the unit whitelist and decide if you can enter directly.'
              : '请填写与你所在物业一致的信息。系统会根据本物业白名单自动判断是否可直接进入。'}
          </p>
        </div>

        <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-sm space-y-1">
          <p>
            <span className="text-gray-500">{en ? 'Property' : '物业'}：</span>
            <span className="font-medium text-gray-900">{resolved.name}</span>
          </p>
          {propertyCodeParam ? (
            <p>
              <span className="text-gray-500">{en ? 'Building code' : '楼号 / 代号'}：</span>
              <span className="font-mono font-medium text-gray-900">{propertyCodeParam.toUpperCase()}</span>
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <label className="block text-sm text-gray-700">
            {en ? 'Full name' : '姓名（必填）'}
            <input
              type="text"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm text-gray-700">
            {en ? 'Email' : '邮箱'}
            <input
              type="email"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={emailIn}
              onChange={(e) => setEmailIn(e.target.value)}
              autoComplete="email"
              title={en ? 'Prefer your sign-in email for consistency' : '建议与登录邮箱一致，便于物业核对。'}
            />
          </label>
          <p className="text-xs text-amber-800/90">
            {en
              ? 'Pre-filled with your sign-in email; you may edit if the council expects a different contact.'
              : '已预填当前登录邮箱；若业委会需要其他联系邮箱可修改。'}
          </p>
          <label className="block text-sm text-gray-700">
            {en ? 'Unit / suite' : '房号（必填）'}
            <input
              type="text"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={unitNo}
              onChange={(e) => setUnitNo(e.target.value)}
              required
            />
          </label>
        </div>

        {toast && (
          <div
            role="status"
            className={`rounded-xl px-3 py-2 text-sm ${
              toast.kind === 'success'
                ? 'bg-gray-50 text-gray-900 border border-gray-200'
                : 'bg-red-50 text-red-900 border border-red-200'
            }`}
          >
            {toast.text}
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1D9E75] text-white font-semibold text-sm hover:bg-[#178a66] disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {en ? 'Submit' : '提交并验证'}
        </button>

        <p className="text-xs text-gray-400 text-center">property: {resolved.id.slice(0, 8)}…</p>
      </div>
    </div>
  );
}
