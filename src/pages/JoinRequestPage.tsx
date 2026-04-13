import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useProperty } from '../contexts/PropertyContext';
import { supabase } from '../lib/supabase';
import { logPropertyEntrySubmitResult } from '../lib/propertyEntryGateLog';
import type { UserRole } from '../lib/supabase';
import { samePropertyId } from '../lib/propertyIdMatch';
import { resolveJoinCodeFromProperties } from '../lib/joinCodeResolve';

/** Align with DB `properties`: use `code` (not legacy `property_code` in some migrations). */
type OpenProperty = {
  id: string;
  name: string;
  slug: string | null;
  code: string | null;
  status?: string | null;
};

const REQUEST_ROLES: UserRole[] = ['owner', 'tenant', 'viewer', 'manager', 'council'];

type UrlResolveStatus = 'idle' | 'loading' | 'ok' | 'err';

/** PostgREST may return one row as object or as single-element array. */
function firstRpcRow<T extends Record<string, unknown>>(data: unknown): T | null {
  if (data == null) return null;
  if (Array.isArray(data)) return (data[0] as T) ?? null;
  if (typeof data === 'object') return data as T;
  return null;
}

function normalizePropertyRow(row: Record<string, unknown> | null | undefined): OpenProperty | null {
  if (!row || typeof row.id !== 'string') return null;
  const codeVal = row.code ?? row.property_code;
  return {
    id: row.id,
    name: typeof row.name === 'string' ? row.name : '',
    slug: (row.slug as string | null) ?? null,
    code: typeof codeVal === 'string' ? codeVal : codeVal == null ? null : String(codeVal),
    status: (row.status as string | null) ?? null,
  };
}

function matchPropertyByCode(list: OpenProperty[], inputCode: string): OpenProperty | undefined {
  const trimmed = inputCode.trim();
  if (!trimmed) return undefined;
  const hit = list.find(
    (p) => p.slug === trimmed || p.code === trimmed || p.id === trimmed,
  );
  if (hit) return hit;
  const raw = trimmed.toLowerCase();
  return list.find((p) => {
    if (p.slug && p.slug.toLowerCase() === raw) return true;
    if (p.code && p.code.toLowerCase() === raw) return true;
    if (samePropertyId(p.id, trimmed)) return true;
    if (p.id.toLowerCase() === raw) return true;
    return false;
  });
}

/** Prefer id string exactly as in list so <select value> stays controlled. */
function canonicalPropertyId(list: OpenProperty[], id: string): string {
  const hit = list.find((p) => samePropertyId(p.id, id));
  return hit?.id ?? id;
}

function persistCurrentPropertyId(propertyId: string) {
  try {
    localStorage.setItem('currentPropertyId', propertyId);
    localStorage.setItem('clearstrata-current-property-id', propertyId);
  } catch {
    /* ignore */
  }
}

function parseInviteLinkRpc(data: unknown): OpenProperty | null {
  const row = data as {
    ok?: boolean;
    property_id?: string;
    name?: string;
    slug?: string | null;
    code?: string | null;
    property_code?: string | null;
  } | null;
  if (!row?.ok || !row.property_id) return null;
  return normalizePropertyRow({
    id: row.property_id,
    name: row.name,
    slug: row.slug,
    code: row.code ?? row.property_code,
  });
}

/** Map directed invite intended_role (incl. resident) → form / DB role. */
function mapIntendedToUserRole(s: string | null | undefined): UserRole {
  const t = (s ?? '').trim().toLowerCase();
  if (t === 'tenant') return 'tenant';
  if (t === 'viewer') return 'viewer';
  if (t === 'council') return 'council';
  if (t === 'manager') return 'manager';
  if (t === 'property_admin') return 'property_admin';
  if (t === 'resident') return 'owner';
  if (t === 'owner') return 'owner';
  return 'owner';
}

function parseDirectInviteRpc(data: unknown): {
  ok: true;
  direct_invite_id: string;
  property_id: string;
  property_name: string;
  unit_number: string | null;
  intended_role: string | null;
  intended_email: string | null;
  intended_name: string | null;
} | null {
  const row = data as Record<string, unknown> | null;
  if (!row || row.ok !== true) return null;
  const pid = row.property_id;
  if (typeof pid !== 'string' || typeof row.direct_invite_id !== 'string') return null;
  return {
    ok: true,
    direct_invite_id: row.direct_invite_id as string,
    property_id: pid,
    property_name: typeof row.property_name === 'string' ? row.property_name : '',
    unit_number: row.unit_number != null ? String(row.unit_number) : null,
    intended_role: row.intended_role != null ? String(row.intended_role) : null,
    intended_email: row.intended_email != null ? String(row.intended_email) : null,
    intended_name: row.intended_name != null ? String(row.intended_name) : null,
  };
}

function parsePublicInviteRpc(data: unknown): {
  ok: true;
  property_id: string;
  property_name: string;
  invite_code: string;
} | null {
  const row = data as Record<string, unknown> | null;
  if (!row || row.ok !== true) return null;
  const pid = row.property_id;
  if (typeof pid !== 'string' || typeof row.invite_code !== 'string') return null;
  return {
    ok: true,
    property_id: pid,
    property_name: typeof row.property_name === 'string' ? row.property_name : '',
    invite_code: row.invite_code,
  };
}

export function JoinRequestPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { session, profile } = useAuth();
  const { language } = useLanguage();
  const en = language === 'en';
  const { refreshMemberships, setCurrentPropertyId } = useProperty();
  const enRef = useRef(en);
  enRef.current = en;

  const inviteTokenParam = searchParams.get('invite')?.trim() ?? '';
  const joinCodeParam = searchParams.get('code')?.trim() ?? '';

  const hasDeepParams = useMemo(() => {
    const token = searchParams.get('token')?.trim();
    const propertyId = searchParams.get('propertyId')?.trim() || searchParams.get('property_id')?.trim();
    const code = searchParams.get('code')?.trim();
    const invite = searchParams.get('invite')?.trim();
    return Boolean(token || propertyId || code || invite);
  }, [searchParams]);

  /** `/join?code=` without `invite` — public code / QR */
  const isPublicCodeFlow = !!joinCodeParam && !inviteTokenParam;

  const [properties, setProperties] = useState<OpenProperty[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [propertyCode, setPropertyCode] = useState('');
  const [resolvedProperty, setResolvedProperty] = useState<OpenProperty | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [note, setNote] = useState('');
  const [requestedRole, setRequestedRole] = useState<UserRole>('owner');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [applyingCode, setApplyingCode] = useState(false);
  const [codeMatchHint, setCodeMatchHint] = useState<string | null>(null);
  /** QR / deep link: matched row from DB (same id used for submit, not URL text). */
  const [lockedProperty, setLockedProperty] = useState<OpenProperty | null>(null);

  /** Directed invite: `/join?invite=TOKEN` */
  const [inviteTokenFlow, setInviteTokenFlow] = useState(false);
  const [directInviteId, setDirectInviteId] = useState<string | null>(null);
  /** Public invite code from `property_invite_codes` — submit RPC needs exact code string. */
  const [publicInviteCodeForSubmit, setPublicInviteCodeForSubmit] = useState<string | null>(null);

  /** Server-verified property for deep links only; submit must use this when deepLinkLocked. */
  const verifiedDeepLinkPropertyRef = useRef<OpenProperty | null>(null);
  const [deepLinkLocked, setDeepLinkLocked] = useState(false);
  const [urlResolveStatus, setUrlResolveStatus] = useState<UrlResolveStatus>('idle');
  const [urlResolveError, setUrlResolveError] = useState<string | null>(null);

  const selectedPropertyIdRef = useRef(selectedPropertyId);
  useEffect(() => {
    selectedPropertyIdRef.current = selectedPropertyId;
  }, [selectedPropertyId]);

  const loginHref = `/?redirect=${encodeURIComponent(`${location.pathname}${location.search}` || '/join')}`;

  const resolvePropertyByCodeRpc = useCallback(async (code: string): Promise<OpenProperty | null> => {
    const { data, error } = await supabase.rpc('resolve_property_for_join_request', { p_code: code });
    if (error) {
      console.error('resolve_property_for_join_request', error);
      return null;
    }
    const row = firstRpcRow<Record<string, unknown>>(data);
    return normalizePropertyRow(row);
  }, []);

  useEffect(() => {
    const token = searchParams.get('token')?.trim();
    const propertyId = searchParams.get('propertyId')?.trim() || searchParams.get('property_id')?.trim();
    const code = searchParams.get('code')?.trim();
    const invite = searchParams.get('invite')?.trim();

    if (!token && !propertyId && !code && !invite) {
      setUrlResolveStatus('idle');
      setUrlResolveError(null);
      setDeepLinkLocked(false);
      verifiedDeepLinkPropertyRef.current = null;
      setLockedProperty(null);
      setInviteTokenFlow(false);
      setDirectInviteId(null);
      setPublicInviteCodeForSubmit(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setUrlResolveStatus('loading');
      setUrlResolveError(null);
      setDeepLinkLocked(false);
      verifiedDeepLinkPropertyRef.current = null;
      setLockedProperty(null);
      setResolvedProperty(null);
      setSelectedPropertyId('');
      selectedPropertyIdRef.current = '';
      setMsg(null);
      setCodeMatchHint(null);
      setInviteTokenFlow(false);
      setDirectInviteId(null);
      setPublicInviteCodeForSubmit(null);

      const isCodeOnly = !token && !propertyId && !!code && !invite;
      const enNow = enRef.current;

      try {
        let prop: OpenProperty | null = null;

        // --- Priority 1: directed invite token ---
        if (invite) {
          const { data, error } = await supabase.rpc('resolve_direct_invite_for_join', { p_token: invite });
          if (error) {
            console.error('resolve_direct_invite_for_join', error);
            if (!cancelled) navigate('/join/invalid?reason=invalid', { replace: true });
            return;
          }
          const row = data as { ok?: boolean; reason?: string } | null;
          const parsed = parseDirectInviteRpc(data);
          if (!parsed) {
            const reason =
              row?.reason === 'expired' ? 'expired' : row?.reason === 'exhausted' ? 'invalid' : 'invalid';
            if (!cancelled) navigate(`/join/invalid?reason=${reason}`, { replace: true });
            return;
          }
          prop = {
            id: parsed.property_id,
            name: parsed.property_name,
            slug: null,
            code: null,
            status: null,
          };
          setInviteTokenFlow(true);
          setDirectInviteId(parsed.direct_invite_id);
          setUnitNumber(parsed.unit_number?.trim() ?? '');
          setRequestedRole(mapIntendedToUserRole(parsed.intended_role));
          if (parsed.intended_email?.trim()) setEmail((e) => e || parsed.intended_email!.trim());
          if (parsed.intended_name?.trim()) setFullName((n) => n || parsed.intended_name!.trim());
        } else if (token) {
          const { data, error } = await supabase.rpc('resolve_join_invite_for_link', { p_token: token });
          if (error) {
            console.error('resolve_join_invite_for_link', error);
          } else {
            prop = parseInviteLinkRpc(data);
          }
        } else if (propertyId) {
          prop = await resolvePropertyByCodeRpc(propertyId);
        } else if (code) {
          const joinCode = code.trim();
          console.log('join code:', joinCode);

          const { data: pubData, error: pubErr } = await supabase.rpc('resolve_public_invite_code', {
            p_code: joinCode,
          });
          if (pubErr) {
            console.error('resolve_public_invite_code', pubErr);
          } else {
            const pub = parsePublicInviteRpc(pubData);
            if (pub) {
              prop = {
                id: pub.property_id,
                name: pub.property_name,
                slug: null,
                code: null,
                status: null,
              };
              setPublicInviteCodeForSubmit(pub.invite_code);
            }
          }

          if (!prop) {
            const result = await resolveJoinCodeFromProperties(joinCode);
            console.log('matched property:', result.ok ? result.property : null);
            if (!result.ok) {
              if (!cancelled) {
                navigate(`/join/invalid?reason=${result.reason}`, { replace: true });
              }
              return;
            }
            prop = result.property as OpenProperty;
          }
        }

        if (cancelled) return;

        if (prop) {
          verifiedDeepLinkPropertyRef.current = prop;
          setResolvedProperty(prop);
          setLockedProperty(prop);
          setSelectedPropertyId(prop.id);
          selectedPropertyIdRef.current = prop.id;
          setDeepLinkLocked(true);
          setUrlResolveStatus('ok');
        } else {
          setUrlResolveStatus('err');
          setUrlResolveError(
            enNow
              ? 'No valid property was found. Please contact your administrator for the correct invite link or QR code.'
              : '未识别到有效物业，请联系管理员获取正确邀请链接或二维码',
          );
        }
      } catch (e) {
        if (!cancelled) {
          if (isCodeOnly) {
            navigate('/join/invalid?reason=invalid', { replace: true });
          } else {
            setUrlResolveStatus('err');
            setUrlResolveError(
              enNow
                ? 'No valid property was found. Please contact your administrator for the correct invite link or QR code.'
                : '未识别到有效物业，请联系管理员获取正确邀请链接或二维码',
            );
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, resolvePropertyByCodeRpc, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName((prev) => prev || profile.full_name_en || '');
      setEmail((prev) => prev || profile.email || '');
      setPhone((prev) => prev || profile.phone || '');
    }
  }, [profile]);

  const fetchProperties = async () => {
    setLoadingList(true);
    const { data, error } = await supabase
      .from('properties')
      .select('id, name, code, slug, status')
      .order('name', { ascending: true });

    console.log('properties:', data);

    if (error) {
      console.error('fetch properties error full:', JSON.stringify(error, null, 2));
      setProperties([]);
      setLoadingList(false);
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    setProperties(rows.map((r) => normalizePropertyRow(r as Record<string, unknown>)).filter(Boolean) as OpenProperty[]);
    setLoadingList(false);
  };

  useEffect(() => {
    if (deepLinkLocked) {
      setLoadingList(false);
      return;
    }
    if (urlResolveStatus === 'loading') return;
    void fetchProperties();
  }, [deepLinkLocked, urlResolveStatus]);

  const selectedProperty = useMemo((): OpenProperty | null => {
    if (!selectedPropertyId) return null;
    if (resolvedProperty && samePropertyId(resolvedProperty.id, selectedPropertyId)) return resolvedProperty;
    return properties.find((x) => samePropertyId(x.id, selectedPropertyId)) ?? null;
  }, [selectedPropertyId, properties, resolvedProperty]);

  const selectedPropertyName = selectedProperty?.name ?? '';

  const handleApplyCode = async () => {
    if (deepLinkLocked) return;
    const inputCode = propertyCode.trim();
    const raw = inputCode.toLowerCase();
    if (!raw) return;

    setApplyingCode(true);
    setMsg(null);
    setCodeMatchHint(null);

    let list = properties;
    let matched: OpenProperty | null = matchPropertyByCode(list, inputCode) ?? null;

    if (!matched) {
      const { data, error } = await supabase.rpc('resolve_property_for_join_request', {
        p_code: inputCode,
      });

      if (error) {
        console.error('resolve_property_for_join_request', error);
        setMsg(en ? 'Could not look up property. Try again later.' : '无法查询物业，请稍后重试。');
        setApplyingCode(false);
        return;
      }

      const row = firstRpcRow<Record<string, unknown>>(data);
      matched = normalizePropertyRow(row);

      if (matched) {
        setProperties((prev) => {
          const next = prev.some((p) => samePropertyId(p.id, matched!.id)) ? prev : [...prev, matched!];
          list = next;
          return next;
        });
      }
    }

    if (matched) {
      const id = canonicalPropertyId(list, matched.id);
      setSelectedPropertyId(id);
      selectedPropertyIdRef.current = id;
      setResolvedProperty({ ...matched, id });
      setMsg(null);

      const norm =
        matched.slug?.toLowerCase() === raw
          ? matched.slug
          : matched.code?.toLowerCase() === raw
            ? matched.code
            : inputCode;
      setPropertyCode(norm);

      setCodeMatchHint(en ? `Matched: ${matched.name}` : `已匹配到物业：${matched.name}`);
    } else {
      setMsg(en ? 'No property matches this code.' : '未找到该物业代码。');
    }

    setApplyingCode(false);
  };

  const submit = async () => {
    let id: string;
    if (deepLinkLocked) {
      const v = verifiedDeepLinkPropertyRef.current;
      if (!v?.id?.trim()) {
        setMsg(en ? 'Property could not be verified. Please reload the page.' : '无法验证物业信息，请刷新页面后重试。');
        return;
      }
      id = v.id;
    } else {
      id = (selectedPropertyIdRef.current || selectedPropertyId).trim();
    }

    if (!session) {
      setMsg(en ? 'Please sign in to submit.' : '请先登录后再提交。');
      return;
    }
    if (!id) {
      setMsg(
        en
          ? 'No property is selected. Choose one from the list or enter a property code, then try again.'
          : '未选择物业。请先从列表选择或输入物业代码后再提交。',
      );
      return;
    }
    if (!fullName.trim() || !email.trim()) {
      setMsg(en ? 'Full name and email are required.' : '请填写姓名与邮箱。');
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const { data, error } = await supabase.rpc('submit_join_request', {
        p_property_id: id,
        p_requested_role: requestedRole,
        p_unit_number: unitNumber.trim() || null,
        p_note: note.trim() || null,
        p_full_name: fullName.trim(),
        p_email: email.trim().toLowerCase(),
        p_phone: phone.trim() || null,
        p_invite_code: directInviteId ? null : publicInviteCodeForSubmit ?? null,
        p_direct_invite_id: directInviteId,
        p_inferred_role:
          directInviteId || !publicInviteCodeForSubmit ? null : String(requestedRole),
        p_inferred_unit_number:
          directInviteId || !publicInviteCodeForSubmit ? null : unitNumber.trim() || null,
        p_move_in_date: null,
        p_language_pref: en ? 'en' : 'zh',
      });

      logPropertyEntrySubmitResult({
        userId: session.user.id,
        email: email.trim().toLowerCase(),
        propertyId: id,
        unitNo: unitNumber.trim() || null,
        data,
        error,
      });

      if (error) {
        setMsg(error.message || (en ? 'Submit failed.' : '提交失败'));
        return;
      }

      const row = data as {
        ok?: boolean;
        success?: boolean;
        error?: string;
        message?: string;
        message_zh?: string;
        join_request_id?: string;
      } | null;

      const succeeded = row != null && (row.ok === true || row.success === true);

      const rpcFriendlyText = (fallbackEn: string, fallbackZh: string) => {
        if (en) {
          if (row?.message) return row.message;
          return fallbackEn;
        }
        if (row?.message_zh) return row.message_zh;
        return fallbackZh;
      };

      if (!succeeded) {
        console.error('unexpected rpc result:', data);
        const errKey = row?.error;
        const rawMsg = row?.message;
        if (rawMsg === 'INVITE_LIMIT_REACHED' || rawMsg === 'INVALID_INVITE') {
          setMsg(
            rpcFriendlyText(
              'This invite is no longer valid or has reached its use limit.',
              'invite 无效或已达到使用次数上限。',
            ),
          );
          return;
        }
        if (errKey === 'already_member' || rawMsg === 'ALREADY_MEMBER') {
          setMsg(rpcFriendlyText('You are already a member of this property.', '你已经是该物业成员，无需重复申请。'));
          return;
        }
        if (errKey === 'already_pending' || errKey === 'pending_exists' || rawMsg === 'PENDING_EXISTS') {
          setMsg(
            rpcFriendlyText(
              'You already have a pending request for this property.',
              '你已提交过该物业的申请，请等待审核。',
            ),
          );
          return;
        }
        if (errKey === 'property_closed') {
          setMsg(rpcFriendlyText('This property is not accepting public applications.', '该物业当前不接受公开申请。'));
          return;
        }
        if (errKey === 'bad_property') {
          setMsg(rpcFriendlyText('Invalid property. Please refresh and try again.', '物业不存在或无效。'));
          return;
        }
        setMsg(en ? 'Could not submit. Please try again later.' : '操作失败，请稍后重试。');
        return;
      }

      setCodeMatchHint(null);

      if (row?.entry_path === 'auto_approved' && row.property_id) {
        const pid = canonicalPropertyId(properties, row.property_id);
        persistCurrentPropertyId(pid);
        setCurrentPropertyId(pid);
        await refreshMemberships();
        navigate('/', { replace: true });
        return;
      }

      navigate('/join/pending', { replace: true });
      return;
    } catch (err) {
      console.error('submit join request catch:', err);
      setMsg(err instanceof Error ? err.message : en ? 'Request failed.' : '请求失败');
    } finally {
      setLoading(false);
    }
  };

  const showDeepLinkSpinner = hasDeepParams && urlResolveStatus !== 'ok' && urlResolveStatus !== 'err';
  const showFormSpinner = session && !deepLinkLocked && (showDeepLinkSpinner || loadingList);
  const showDeepLinkResolved = hasDeepParams && urlResolveStatus === 'ok' && deepLinkLocked && !!lockedProperty;
  const showDeepLinkError = hasDeepParams && urlResolveStatus === 'err' && urlResolveError;

  const directResolved = isPublicCodeFlow && showDeepLinkResolved && lockedProperty;
  const inviteWelcome = inviteTokenFlow && showDeepLinkResolved && lockedProperty;

  /** 扫码直达：解析中全屏加载 */
  if ((isPublicCodeFlow || inviteTokenParam) && showDeepLinkSpinner) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 to-gray-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-[#1D9E75] animate-spin" aria-hidden />
        <p className="mt-4 text-sm text-gray-500">{en ? 'Loading…' : '加载中…'}</p>
        <p className="text-center text-xs text-gray-400 mt-12">ClearStrata</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 to-gray-50 flex items-start justify-center p-4 py-10">
      <div className="w-full max-w-lg">
        {inviteWelcome ? (
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
              {en ? `Welcome to ${lockedProperty.name}` : `欢迎加入 ${lockedProperty.name}`}
            </h1>
            <p className="text-sm text-emerald-800 mt-2 px-2 font-medium">
              {en ? 'We have pre-filled part of your application.' : '已为您预填部分申请信息'}
            </p>
            <p className="text-sm text-gray-600 mt-2 px-2">
              {en
                ? 'You will usually hear back within 24 hours after submitting.'
                : '提交申请后，通常 24 小时内完成审核'}
            </p>
          </div>
        ) : directResolved ? (
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
              {en ? `Welcome to ${lockedProperty.name}` : `欢迎加入 ${lockedProperty.name}`}
            </h1>
            <p className="text-sm text-gray-600 mt-2 px-2">
              {en
                ? 'You will usually hear back within 24 hours after submitting.'
                : '提交申请后，通常 24 小时内完成审核'}
            </p>
          </div>
        ) : (
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1D9E75] text-white mb-3 shadow-md">
              <Building2 size={28} />
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              {en ? 'Request to join a property' : '申请加入物业'}
            </h1>
            <p className="text-sm text-gray-600 mt-1 px-2">
              {en
                ? 'Choose a property and submit your details. Staff will review your request.'
                : '选择物业并填写资料，物业人员将审核您的申请。'}
            </p>
          </div>
        )}

        {showDeepLinkSpinner ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-10 h-10 text-[#1D9E75] animate-spin" />
          </div>
        ) : !session ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 text-center space-y-4">
            {showDeepLinkResolved && lockedProperty && !isPublicCodeFlow && !inviteTokenFlow && (
              <div className="space-y-3 text-left">
                <p className="text-sm text-gray-700">
                  {en ? `You are applying to join: ${lockedProperty.name}` : `您正在申请加入：${lockedProperty.name}`}
                </p>
                <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                  <div className="text-sm text-gray-500">{en ? 'Current property' : '当前物业'}</div>
                  <div className="text-base font-semibold text-gray-900">{lockedProperty.name}</div>
                </div>
              </div>
            )}
            {showDeepLinkError && (
              <p className="text-sm text-amber-900 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-left">{urlResolveError}</p>
            )}
            <p className="text-gray-700 text-sm">
              {en ? 'Sign in or register to submit a join request.' : '登录或注册后即可提交加入申请。'}
            </p>
            <Link
              to={loginHref}
              className="inline-flex justify-center w-full py-3 rounded-xl bg-[#1D9E75] text-white font-semibold hover:bg-[#178a66]"
            >
              {en ? 'Sign in' : '去登录'}
            </Link>
          </div>
        ) : showFormSpinner ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-10 h-10 text-[#1D9E75] animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6 space-y-4">
            {showDeepLinkResolved && lockedProperty && !isPublicCodeFlow && !inviteTokenFlow && (
              <div className="space-y-3 text-left">
                <p className="text-sm text-gray-700">
                  {en ? `You are applying to join: ${lockedProperty.name}` : `您正在申请加入：${lockedProperty.name}`}
                </p>
                <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                  <div className="text-sm text-gray-500">{en ? 'Current property' : '当前物业'}</div>
                  <div className="text-base font-semibold text-gray-900">{lockedProperty.name}</div>
                </div>
              </div>
            )}
            {showDeepLinkError && (
              <div className="space-y-3">
                <p className="text-sm text-amber-900 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-left">{urlResolveError}</p>
                <p className="text-xs text-gray-500 text-center">
                  <Link to="/join-request" className="text-[#1D9E75] font-medium hover:underline">
                    {en ? 'Apply without a link (manual)' : '无链接时手动申请'}
                  </Link>
                </p>
              </div>
            )}

            {!deepLinkLocked && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {en ? 'Property' : '物业'}
                  </label>
                  <select
                    value={selectedPropertyId || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedPropertyId(v);
                      selectedPropertyIdRef.current = v;
                      setResolvedProperty(null);
                      setMsg(null);
                      setCodeMatchHint(null);
                    }}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 bg-white"
                  >
                    <option value="">{en ? 'Select…' : '请选择…'}</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.slug ? ` (${p.slug})` : ''}
                        {p.code ? ` [${p.code}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {en ? 'Or enter property code (slug / code / ID)' : '或输入物业代码（slug / 物业代码 / ID）'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={propertyCode}
                      onChange={(e) => setPropertyCode(e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl"
                      placeholder={en ? 'e.g. bcs3736' : '例如 bcs3736'}
                    />
                    <button
                      type="button"
                      disabled={applyingCode}
                      onClick={() => void handleApplyCode()}
                      className="px-4 py-3 rounded-xl bg-gray-100 text-gray-800 font-medium text-sm shrink-0 disabled:opacity-50"
                    >
                      {applyingCode ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : en ? (
                        'Apply'
                      ) : (
                        '应用'
                      )}
                    </button>
                  </div>
                  {codeMatchHint && (
                    <p className="text-xs text-emerald-800 mt-1 font-medium">{codeMatchHint}</p>
                  )}
                  {selectedPropertyName && !codeMatchHint && (
                    <p className="text-xs text-emerald-700 mt-1">
                      {en ? 'Selected:' : '已选：'} {selectedPropertyName}
                    </p>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {en ? 'Requested role' : '期望角色'}
              </label>
              <select
                value={requestedRole}
                disabled={inviteTokenFlow}
                onChange={(e) => setRequestedRole(e.target.value as UserRole)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl disabled:bg-gray-100 disabled:text-gray-600"
              >
                {REQUEST_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {inviteTokenFlow && (
                <p className="text-xs text-gray-500 mt-1">
                  {en ? 'Role is set by your invitation.' : '角色由定向邀请指定。'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {en ? 'Full name' : '姓名'} <span className="text-red-500">*</span>
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {en ? 'Email' : '邮箱'} <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {en ? 'Phone' : '电话'}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {en ? 'Unit number' : '单元号'}
              </label>
              <input
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                placeholder="1204"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {en ? 'Note' : '备注'}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-y min-h-[88px]"
              />
            </div>

            <button
              type="button"
              onClick={() => void submit()}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#1D9E75] text-white font-semibold hover:bg-[#178a66] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : null}
              {loading ? (en ? 'Submitting…' : '提交中…') : en ? 'Submit request' : '提交申请'}
            </button>

            {msg && (
              <p
                className={`text-sm text-center rounded-xl px-3 py-2 ${
                  msg.includes('已提交') || msg.includes('等待审核') || msg.toLowerCase().includes('submitted')
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-amber-50 text-amber-900 border border-amber-200'
                }`}
              >
                {msg}
              </p>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">ClearStrata</p>
      </div>
    </div>
  );
}
