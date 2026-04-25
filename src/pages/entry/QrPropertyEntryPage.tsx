import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Building2, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import { supabase } from '../../lib/supabase';
import { trackPropertyEntryEvent } from '../../lib/propertyEntryEvents';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function persistCurrentPropertyId(propertyId: string) {
  try {
    localStorage.setItem('currentPropertyId', propertyId);
    localStorage.setItem('clearstrata-current-property-id', propertyId);
  } catch {
    /* ignore */
  }
}

type JoinSubmitResult = {
  ok?: boolean;
  kind?: 'auto_approved' | 'pending' | 'need_confirm' | 'already_member' | 'error' | string;
  reason?: 'non_whitelist' | 'occupied' | 'duplicate_unit_pending' | 'invalid_invite' | 'invalid_property' | string | null;
  message?: string | null;
  property_id?: string;
  property_name?: string | null;
  unit_no?: string;
  require_confirm?: boolean;
};

function confirmMessage(reason: string | null | undefined, fallback: string | null | undefined, en: boolean) {
  if (reason === 'non_whitelist') {
    return en
      ? 'This unit is not on the whitelist. You can still submit an application for administrator review.'
      : '该房号不在白名单内。你仍可以提交申请，由管理员审核确认。';
  }
  if (reason === 'occupied') {
    return en
      ? 'This unit is already registered by another owner. If this is your unit, you can continue and submit for administrator review.'
      : '该房号已被其他业主登记。如果你确认这是你的房号，可以继续提交申请，由管理员审核。';
  }
  if (reason === 'duplicate_unit_pending') {
    return en
      ? 'This unit already has an application under review. If this is your unit, you can continue and submit for administrator review.'
      : '该房号已有申请正在审核。如果你确认这是你的房号，可以继续提交，由管理员审核。';
  }
  return fallback || (en ? 'Please confirm before continuing.' : '请确认后继续。');
}

/** 公开邀请 /entry；demo/营销演示走独立入口，勿混用本页。 */
export function QrPropertyEntryPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const en = language === 'en';
  const { setCurrentPropertyId, refreshMemberships } = useProperty();

  const propertyIdParam = useMemo(
    () => (searchParams.get('propertyId') || searchParams.get('property_id') || '').trim(),
    [searchParams],
  );
  const inviteCodeParam = useMemo(
    () => (searchParams.get('inviteCode') || searchParams.get('invite_code') || '').trim(),
    [searchParams],
  );
  const sourceParam = useMemo(() => (searchParams.get('source') || '').trim(), [searchParams]);

  const [resolved, setResolved] = useState<{ id: string; name: string } | null>(null);
  const [resolveErr, setResolveErr] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [confirmState, setConfirmState] = useState<{ reason: string | null; message: string; unitNo: string } | null>(null);
  const [confirm, setConfirm] = useState(false);

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
    navigate(`/login?redirect=${encodeURIComponent(redirectTo)}`, { replace: true });
  }, [authLoading, session, navigate, redirectTo]);

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
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [propertyIdParam, inviteCodeParam, en]);

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
    if (!resolved?.id || !inviteCodeParam) return;
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
  }, [resolved?.id, inviteCodeParam, sourceParam, session?.user]);

  const effectivePropertyId = useMemo(() => {
    if (propertyIdParam && UUID_RE.test(propertyIdParam)) return propertyIdParam.toLowerCase();
    return null;
  }, [propertyIdParam]);

  const submitJoin = async (confirmOverride = confirm) => {
    if (!session?.user?.id || !effectivePropertyId || !inviteCodeParam.trim()) {
      setToast({ kind: 'error', text: en ? 'Missing data.' : '数据不完整。' });
      return;
    }
    const unit = unitNo.trim();
    if (!unit) {
      setToast({ kind: 'error', text: en ? 'Please enter your unit number.' : '请输入房号。' });
      return;
    }

    setSubmitting(true);
    setToast(null);
    try {
      const { data, error } = await supabase.rpc('submit_join_request', {
        p_property_id: effectivePropertyId,
        p_invite_code: inviteCodeParam.trim() || null,
        p_unit_no: unit,
        p_confirm: confirmOverride,
      });

      console.log('JOIN RESULT:', data, error);

      if (error) {
        console.error('JOIN ERROR:', error);
        throw new Error(error.message || 'Join failed');
      }

      const result = data as JoinSubmitResult | null;
      if (!result || !result.kind) {
        throw new Error('Invalid join response');
      }

      if (result.kind === 'auto_approved' || result.kind === 'already_member') {
        await refreshMemberships();
        persistCurrentPropertyId(effectivePropertyId);
        setCurrentPropertyId(effectivePropertyId);
        navigate('/');
        return;
      }

      if (result.kind === 'need_confirm') {
        setConfirm(false);
        setConfirmState({
          reason: result.reason ?? null,
          message: confirmMessage(result.reason, result.message, en),
          unitNo: unit,
        });
        return;
      }

      if (result.kind === 'pending') {
        navigate('/join/pending', {
          replace: true,
          state: {
            propertyId: effectivePropertyId,
            unitNo: unit,
            propertyName: resolved?.name,
            reviewFlag: result.reason,
            message: result.message,
          },
        });
        return;
      }

      throw new Error(result.message || 'Join rejected');
    } catch (err) {
      const message = err instanceof Error ? err.message : en ? 'Join failed.' : '加入失败。';
      setToast({ kind: 'error', text: message });
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

  if (session?.user && resolved && !inviteCodeParam) {
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
          <p>
            <span className="text-gray-500">{en ? 'Invite' : '邀请码'}：</span>
            <span className="font-mono font-medium text-gray-900">{inviteCodeParam}</span>
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm text-gray-700">
            {en ? 'Unit / suite' : '房号（必填）'}
            <input
              type="text"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={unitNo}
              onChange={(e) => {
                setUnitNo(e.target.value);
                setConfirmState(null);
                setConfirm(false);
              }}
              required
            />
          </label>
        </div>

        {confirmState ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-left leading-relaxed">{confirmState.message}</p>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-lg border border-amber-300 bg-white px-3 py-2 font-medium text-amber-950 hover:bg-amber-100"
                onClick={() => {
                  setConfirmState(null);
                  setConfirm(false);
                }}
                disabled={submitting}
              >
                {en ? 'Edit unit' : '返回修改房号'}
              </button>
              <button
                type="button"
                className="rounded-lg bg-amber-500 text-white px-4 py-2"
                disabled={submitting}
                onClick={() => {
                  setConfirmState(null);
                  setConfirm(true);
                  void submitJoin(true);
                }}
              >
                {en ? 'Submit anyway' : '仍然提交'}
              </button>
            </div>
          </div>
        ) : null}

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
          onClick={() => {
            setConfirm(false);
            void submitJoin(false);
          }}
          disabled={submitting || Boolean(confirmState)}
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
