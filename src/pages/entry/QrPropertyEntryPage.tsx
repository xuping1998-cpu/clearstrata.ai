import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import { supabase } from '../../lib/supabase';
import {
  createPendingJoinRequest,
  tryAutoJoinProperty,
  type CreatePendingJoinRequestResult,
} from '../../lib/qrPropertyEntry';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type OpenProperty = { id: string; name: string };

function firstRpcRow<T extends Record<string, unknown>>(data: unknown): T | null {
  if (data == null) return null;
  if (Array.isArray(data)) return (data[0] as T) ?? null;
  if (typeof data === 'object') return data as T;
  return null;
}

function normalizePropertyRow(row: Record<string, unknown> | null | undefined): OpenProperty | null {
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

function pendingMessageFromResult(result: CreatePendingJoinRequestResult, en: boolean): string {
  if (result.kind === 'already_pending') {
    return en ? 'You already have a pending request for this property.' : '已有待审核申请，请等待处理。';
  }
  if (result.kind === 'business_reject') {
    if (result.errorKey === 'already_pending' || result.message === 'PENDING_EXISTS') {
      return en ? 'You already have a pending request for this property.' : '已有待审核申请，请等待处理。';
    }
    return en
      ? (result.message as string) || 'Could not submit for review.'
      : (result.message_zh as string) || '无法提交审核申请。';
  }
  if (result.kind === 'rpc_error') {
    return result.error.message || (en ? 'Request failed.' : '请求失败');
  }
  return en ? 'Submitted for review.' : '已提交审核申请。';
}

export function QrPropertyEntryPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { session, user } = useAuth();
  const { language } = useLanguage();
  const en = language === 'en';
  const { setCurrentPropertyId, refreshMemberships } = useProperty();

  const propertyIdParam = useMemo(
    () => (searchParams.get('propertyId') || searchParams.get('property_id') || '').trim(),
    [searchParams],
  );
  const propertyCodeParam = useMemo(() => (searchParams.get('propertyCode') || '').trim(), [searchParams]);
  /** Public invite code (`property_invite_codes`). Prefer `inviteCode=`; when `propertyId` is set, `code=` is treated as invite (QR links). */
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
  const sourceParam = useMemo(() => (searchParams.get('source') || '').trim(), [searchParams]);

  const [resolved, setResolved] = useState<OpenProperty | null>(null);
  const [resolveErr, setResolveErr] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);
  const [unit, setUnit] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const redirectBack = `${location.pathname}${location.search}`;

  const resolveProperty = useCallback(async () => {
    setResolving(true);
    setResolveErr(null);
    setResolved(null);
    try {
      if (propertyIdParam && UUID_RE.test(propertyIdParam)) {
        const id = propertyIdParam.toLowerCase();
        const { data, error } = await supabase.from('properties').select('id,name').eq('id', id).maybeSingle();
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
        if (error) {
          setResolveErr(en ? 'Could not resolve property code.' : '无法解析物业代码。');
          return;
        }
        const row = firstRpcRow<Record<string, unknown>>(data);
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
      setResolving(false);
    }
  }, [propertyIdParam, propertyCodeParam, en]);

  useEffect(() => {
    void resolveProperty();
  }, [resolveProperty]);

  const loginHref = `/?redirect=${encodeURIComponent(redirectBack || '/entry')}`;

  const onSubmit = async () => {
    if (submitting || submitLock.current) return;
    if (!session?.user || !user?.id) {
      setToast({ kind: 'error', text: en ? 'Please sign in first.' : '请先登录。' });
      return;
    }
    if (!resolved?.id) {
      setToast({ kind: 'error', text: en ? 'Property is not ready.' : '物业信息未就绪。' });
      return;
    }
    const unitTrim = unit.trim();
    if (!unitTrim) {
      setToast({ kind: 'error', text: en ? 'Please enter your unit number.' : '请输入房号。' });
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    setToast(null);

    const email = (user.email ?? session.user.email ?? '').trim().toLowerCase();
    const lang = language === 'zh' ? 'zh' : 'en';

    try {
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('full_name_en, phone, preferred_language')
        .eq('id', user.id)
        .maybeSingle();

      if (profErr || !prof) {
        console.error('[qr-entry] profile load', profErr);
        const pending = await createPendingJoinRequest(supabase, {
          userId: user.id,
          propertyId: resolved.id,
          unitNo: unitTrim,
          fullName: null,
          email: email || null,
          phone: null,
          languagePref: lang,
          inviteCode: inviteCodeParam || null,
        });
        if (pending.kind === 'created' || pending.kind === 'auto_approved') {
          setToast({
            kind: 'success',
            text: en ? 'Could not verify profile; submitted for review.' : '无法校验资料，已提交人工审核。',
          });
          navigate('/join/pending', { replace: true });
          return;
        }
        const msg = pendingMessageFromResult(pending, en);
        console.error('[qr-entry] createPendingJoinRequest', pending);
        setToast({ kind: 'error', text: msg });
        return;
      }

      const auto = await tryAutoJoinProperty(supabase, {
        propertyId: resolved.id,
        unitNo: unitTrim,
        currentUserId: user.id,
        currentUserEmail: email,
        languagePref: prof.preferred_language === 'zh' ? 'zh' : lang,
        inviteCode: inviteCodeParam || null,
      });

      if (auto.ok) {
        const pid = auto.propertyId;
        persistCurrentPropertyId(pid);
        setCurrentPropertyId(pid);
        await refreshMemberships();
        setToast({
          kind: 'success',
          text: en ? 'Unit verified. You have joined the property.' : '房号验证通过，已自动加入物业。',
        });
        navigate('/', { replace: true });
        return;
      }

      console.error('[qr-entry] tryAutoJoinProperty failed', auto.raw);

      const pending = await createPendingJoinRequest(supabase, {
        userId: user.id,
        propertyId: resolved.id,
        unitNo: unitTrim,
        fullName: typeof prof.full_name_en === 'string' ? prof.full_name_en : null,
        email: email || null,
        phone: typeof prof.phone === 'string' ? prof.phone : null,
        languagePref: prof.preferred_language === 'zh' ? 'zh' : lang,
        inviteCode: inviteCodeParam || null,
      });

      if (pending.kind === 'created') {
        setToast({
          kind: 'success',
          text: en ? 'Could not auto-match; a review request was submitted.' : '未能自动匹配，已提交审核申请。',
        });
        navigate('/join/pending', { replace: true });
        return;
      }
      if (pending.kind === 'auto_approved') {
        persistCurrentPropertyId(resolved.id);
        setCurrentPropertyId(resolved.id);
        await refreshMemberships();
        setToast({
          kind: 'success',
          text: en ? 'Unit verified. You have joined the property.' : '房号验证通过，已自动加入物业。',
        });
        navigate('/', { replace: true });
        return;
      }

      const msg = pendingMessageFromResult(pending, en);
      console.error('[qr-entry] createPendingJoinRequest after auto fail', pending);
      const autoHint = en
        ? auto.message || auto.reason
        : auto.message_zh || auto.message || auto.reason;
      setToast({
        kind: 'error',
        text: [autoHint, msg].filter(Boolean).join(en ? ' — ' : '；'),
      });
    } catch (e) {
      console.error('[qr-entry] submit', e);
      setToast({
        kind: 'error',
        text: e instanceof Error ? e.message : en ? 'Something went wrong.' : '发生错误。',
      });
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  if (resolving) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 to-gray-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-[#1D9E75] animate-spin" aria-hidden />
        <p className="mt-4 text-sm text-gray-500">{en ? 'Loading…' : '加载中…'}</p>
      </div>
    );
  }

  if (resolveErr || !resolved) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 to-gray-50 flex flex-col items-center justify-center p-6">
        <Building2 className="w-12 h-12 text-gray-400 mb-3" />
        <p className="text-sm text-gray-800 text-center max-w-md">{resolveErr || (en ? 'Invalid link.' : '链接无效。')}</p>
        <Link to="/" className="mt-6 text-[#1D9E75] font-medium text-sm">
          {en ? 'Home' : '返回首页'}
        </Link>
      </div>
    );
  }

  const isQr = sourceParam.toLowerCase() === 'qr';

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 to-gray-50 flex items-start justify-center p-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#1D9E75] text-white mb-3">
            <Building2 size={24} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{resolved.name}</h1>
          {isQr && (
            <p className="text-xs text-emerald-800 font-medium mt-1">
              {en ? 'Scan QR entry' : '扫码进入'}
            </p>
          )}
        </div>

        <p className="text-sm text-gray-600 leading-relaxed">
          {en
            ? 'If your unit matches the building roster, access is opened automatically. Otherwise your request goes to staff for approval.'
            : '房号与楼栋名册一致时将自动开通；若无法自动匹配，将转入人工审核。'}
        </p>

        {!session && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {en ? 'Sign in to continue.' : '请先登录后继续。'}
            <Link to={loginHref} className="block mt-2 font-semibold text-[#1D9E75]">
              {en ? 'Sign in' : '去登录'}
            </Link>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            {en ? 'Unit number' : '房号'}
          </label>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            disabled={submitting || !session}
            placeholder={en ? 'e.g. 319' : '例如 319'}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1D9E75]/25 focus:border-[#1D9E75]"
          />
        </div>

        <button
          type="button"
          disabled={submitting || !session}
          onClick={() => void onSubmit()}
          className="w-full py-3 rounded-xl bg-[#1D9E75] text-white text-sm font-semibold hover:bg-[#178a66] disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="animate-spin w-5 h-5" /> : null}
          {en ? 'Enter now' : '立即进入'}
        </button>

        {toast && (
          <div
            role="status"
            className={`rounded-xl px-3 py-2 text-sm ${
              toast.kind === 'success'
                ? 'bg-emerald-50 text-emerald-950 border border-emerald-200'
                : 'bg-red-50 text-red-950 border border-red-200'
            }`}
          >
            {toast.text}
          </div>
        )}

        <p className="text-xs text-gray-400 text-center">
          property: {resolved.id.slice(0, 8)}…
          {propertyCodeParam ? ` · code: ${propertyCodeParam}` : ''}
          {inviteCodeParam ? ` · invite: ${inviteCodeParam}` : ''}
        </p>
      </div>
    </div>
  );
}
