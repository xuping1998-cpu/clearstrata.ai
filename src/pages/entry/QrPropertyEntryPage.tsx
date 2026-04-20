import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import { supabase } from '../../lib/supabase';
import { submitUnifiedPropertyEntry } from '../../lib/propertyEntryUnified';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function firstRpcRow<T extends Record<string, unknown>>(data: unknown): T | null {
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
  /** 与历史 QR 链接一致：`inviteCode` / `invite_code`；`propertyId` 为 UUID 时 `code=` 视为 invite。 */
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
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const redirectBack = `${location.pathname}${location.search}`;

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
        if (!cancelled) setResolving(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [propertyIdParam, propertyCodeParam, en]);

  useEffect(() => {
    console.log('[entry] search', location.search);
  }, [location.search]);

  /** 进入页面 / URL 或用户变化时打印上下文 */
  useEffect(() => {
    console.log('[entry] page', {
      propertyId: propertyIdParam || null,
      inviteCode: inviteCodeParam || null,
      user: user ?? null,
    });
  }, [location.search, user, propertyIdParam, inviteCodeParam]);

  /** 登录后若 query 中没有任何 invite 参数，提示便于排查回跳丢参 */
  useEffect(() => {
    if (!session?.user || !resolved) return;
    if (hasInviteInSearch) return;
    setToast({ kind: 'error', text: 'Missing invite code in entry URL' });
  }, [session?.user, resolved, hasInviteInSearch]);

  /** 登录成功且物业已解析后：自动提交一次（不依赖按钮）。`propertyId` 来自 URL，或通过 propertyCode 解析得到 `resolved.id`。 */
  useEffect(() => {
    if (!session?.user || !user?.id) return;

    const propertyIdFromQuery =
      propertyIdParam && UUID_RE.test(propertyIdParam) ? propertyIdParam : null;
    const propertyId =
      propertyIdFromQuery ?? (propertyCodeParam && resolved?.id ? resolved.id : null);

    if (!propertyId || !UUID_RE.test(propertyId)) return;
    if (!resolved?.id || resolved.id.toLowerCase() !== propertyId.toLowerCase()) return;

    if (user && propertyId && !hasSubmittedRef.current) {
      hasSubmittedRef.current = true;

      let cancelled = false;
      setAutoSubmitting(true);

      void (async () => {
        try {
          const email = (user.email ?? session.user.email ?? '').trim().toLowerCase();
          const lang = language === 'zh' ? 'zh' : 'en';

          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name_en, phone')
            .eq('id', user.id)
            .maybeSingle();

          if (cancelled) return;

          console.log('[entry] payload', {
            propertyId,
            inviteCode: inviteCodeParam,
            unitNo: null,
            userId: user?.id,
          });

          const result = await submitUnifiedPropertyEntry(supabase, {
            userId: user.id,
            p_property_id: propertyId,
            p_requested_role: 'owner',
            p_unit_number: null,
            p_note: 'entry_auto',
            p_full_name: typeof prof?.full_name_en === 'string' ? prof.full_name_en.trim() || null : null,
            p_email: email || null,
            p_phone: typeof prof?.phone === 'string' ? prof.phone.trim() || null : null,
            p_invite_code: inviteCodeParam || null,
            p_direct_invite_id: null,
            p_inferred_role: null,
            p_inferred_unit_number: null,
            p_move_in_date: null,
            p_language_pref: lang,
          });

          console.log('[entry] submit result', result);

          if (cancelled) return;

          if (result.kind === 'pending_submitted') {
            navigate('/join/pending', { replace: true });
            return;
          }

          if (result.kind === 'auto_approved') {
            const pid = result.propertyId ?? propertyId;
            persistCurrentPropertyId(pid);
            setCurrentPropertyId(pid);
            await refreshMemberships();
            navigate('/dashboard', { replace: true });
            return;
          }

          if (result.kind === 'rpc_error') {
            console.error('[entry] submitUnifiedPropertyEntry rpc_error', result);
            setToast({
              kind: 'error',
              text: result.error.message || (en ? 'Request failed.' : '请求失败'),
            });
            return;
          }

          if (result.kind === 'business_reject') {
            const errKey = result.errorKey;
            const rawMsg = result.message;
            if (errKey === 'already_member' || rawMsg === 'ALREADY_MEMBER') {
              persistCurrentPropertyId(propertyId);
              setCurrentPropertyId(propertyId);
              await refreshMemberships();
              navigate('/dashboard', { replace: true });
              return;
            }
            if (
              errKey === 'already_pending' ||
              errKey === 'pending_exists' ||
              rawMsg === 'PENDING_EXISTS'
            ) {
              navigate('/join/pending', { replace: true });
              return;
            }
            console.error('[entry] submitUnifiedPropertyEntry business_reject', result);
            setToast({
              kind: 'error',
              text:
                (en ? result.message : result.message_zh) ||
                result.errorKey ||
                (en ? 'Could not complete entry.' : '无法完成入楼。'),
            });
          }
        } finally {
          setAutoSubmitting(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }
  }, [
    session,
    user,
    resolved?.id,
    propertyIdParam,
    propertyCodeParam,
    inviteCodeParam,
    language,
    en,
    navigate,
    setCurrentPropertyId,
    refreshMemberships,
  ]);

  const loginHref = `/?redirect=${encodeURIComponent(redirectBack || '/entry')}`;

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

  const isQr = sourceParam.toLowerCase() === 'qr';

  return (
    <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/40 to-gray-50 flex items-start justify-center p-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-clearstrata-ui-primary text-white mb-3">
            <Building2 size={24} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{resolved.name}</h1>
          {isQr && (
            <p className="text-xs text-clearstrata-brand-800 font-medium mt-1">
              {en ? 'Scan QR entry' : '扫码进入'}
            </p>
          )}
        </div>

        <p className="text-sm text-gray-600 leading-relaxed">
          {en
            ? 'After you sign in, your join request is submitted automatically. You will be redirected when it completes.'
            : '登录后将自动提交入楼申请，完成后会跳转，无需再点按钮。'}
        </p>

        {!session && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {en ? 'Sign in to continue.' : '请先登录后继续。'}
            <Link to={loginHref} className="block mt-2 font-semibold text-clearstrata-ui-primary">
              {en ? 'Sign in' : '去登录'}
            </Link>
          </div>
        )}

        {session && autoSubmitting && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-800 inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-clearstrata-ui-primary shrink-0" aria-hidden />
            {en ? 'Submitting your request…' : '正在提交申请…'}
          </div>
        )}

        {toast && (
          <div
            role="status"
            className={`rounded-xl px-3 py-2 text-sm ${
              toast.kind === 'success'
                ? 'bg-clearstrata-ui-soft text-clearstrata-brand-950 border border-clearstrata-ui-softBorder'
                : 'bg-red-50 text-red-950 border border-red-200'
            }`}
          >
            {toast.text}
          </div>
        )}

        <p className="text-xs text-gray-400 text-center">
          property: {resolved.id.slice(0, 8)}…
          {propertyCodeParam ? ` · code: ${propertyCodeParam}` : ''}
        </p>
      </div>
    </div>
  );
}
