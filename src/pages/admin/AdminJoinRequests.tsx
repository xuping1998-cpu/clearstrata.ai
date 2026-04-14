import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check, Loader2, X, ClipboardList } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import { canApproveJoinRequest } from '../../lib/propertyPermissions';
import { samePropertyId } from '../../lib/propertyIdMatch';
import type { UserRole } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import { dedupePendingJoinRequestsByPropertyEmail } from '../../lib/joinRequestGuards';
import { sendJoinDecisionEmail } from '../../lib/sendJoinDecisionEmail';
import { logPropertyEntryApproveResult } from '../../lib/propertyEntryGateLog';
import { firstRpcJsonRow, joinRpcErrorCode } from '../../lib/propertyEntryUnified';
import {
  approveJoinRequest,
  rejectJoinRequest,
  CLEARSTRATA_PROPERTY_MEMBERS_CHANGED,
} from '../../lib/unifiedPropertyEntry';
import { BackButton } from '../../components/BackButton';

/**
 * Pending list — selected columns must exist on `public.join_requests`
 * (see `20260410120000_property_members_saas.sql` and follow-up migrations).
 */
const JOIN_REQUESTS_SELECT_PENDING =
  'id, property_id, user_id, requested_role, full_name, email, phone, unit_number, note, status, created_at';

type JoinRequestRow = {
  id: string;
  property_id: string;
  user_id: string | null;
  requested_role: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  unit_number: string | null;
  note: string | null;
  status: string;
  created_at: string;
};

function roleLabel(role: string | undefined, en: boolean): string {
  if (!role) return '—';
  const labels: Record<string, [string, string]> = {
    owner: ['Owner', '业主'],
    tenant: ['Tenant', '租户'],
    viewer: ['Viewer', '访客'],
    manager: ['Property manager', '物业经理'],
    council: ['Council', '业委会'],
    admin: ['Administrator', '管理员'],
    property_admin: ['Property admin', '物业管理员'],
  };
  const pair = labels[role] ?? [role, role];
  return en ? pair[0] : pair[1];
}

/** Postgres `RAISE EXCEPTION 'code'` / PostgREST 错误文案中嵌入的业务码 */
function extractJoinApproveBusinessCode(msg: string | undefined): string | undefined {
  if (!msg) return undefined;
  const re =
    /\b(not_authenticated|forbidden|not_found|already_processed|missing_email|missing_unit_number|applicant_not_found|profile_missing|user_mismatch|property_mismatch|unit_already_bound)\b/;
  return msg.match(re)?.[1];
}

function friendlyReviewFailure(code: string | undefined, en: boolean): string {
  const c = (code || '').trim();
  const table: Record<string, [string, string]> = {
    not_found: ['This request is no longer available.', '该申请已不存在或已处理。'],
    already_processed: ['This request was already processed.', '该申请已处理过。'],
    forbidden: ['You do not have permission to do this.', '您没有权限执行此操作。'],
    not_authenticated: ['Please sign in again.', '请重新登录。'],
    invalid_reviewer: ['Session mismatch. Please sign in again.', '登录状态异常，请重新登录后再试。'],
    unit_already_bound: [
      'This unit is already linked to another account.',
      '该房号已绑定其他用户，无法重复绑定。',
    ],
    missing_unit_number: [
      'A unit number is required before approval.',
      '审批前请填写房号（或在申请中提供房号）。',
    ],
    applicant_not_found: [
      'No user account matches this email yet.',
      '未找到与该邮箱对应的用户账号（需先注册并完成邮箱验证）。',
    ],
    missing_email: ['This request has no email on file.', '该申请缺少邮箱。'],
    property_mismatch: [
      'This request does not belong to the property you are reviewing.',
      '该申请不属于当前正在审核的物业。',
    ],
    user_mismatch: ['The applicant user does not match the email profile.', '申请用户与邮箱对应账号不一致。'],
    profile_missing: ['Account has no profile row.', '缺少 profiles 记录。'],
  };
  const row = table[c];
  if (row) return en ? row[0] : row[1];
  return en ? 'Something went wrong. Please try again.' : '操作失败，请稍后重试。';
}

/** 审批 RPC 失败时的可读文案（含 PostgREST 传输错误与 jsonb 内 message）。 */
function joinApproveUserMessage(
  data: unknown,
  code: string | undefined,
  transportError: { message: string; code?: string } | null,
  en: boolean,
): string {
  if (transportError) {
    const bc = extractJoinApproveBusinessCode(transportError.message);
    if (bc) return friendlyReviewFailure(bc, en);
    const bits = [transportError.message, transportError.code].filter(Boolean);
    if (bits.length) return bits.join(' ');
    return en ? 'Request failed.' : '请求失败';
  }
  const row = firstRpcJsonRow(data) as {
    message?: string;
    message_zh?: string;
    hint?: string;
    detail?: string;
  } | null;
  if (!en && row?.message_zh) return String(row.message_zh);
  if (row?.message) return String(row.message);
  if (row?.detail) return String(row.detail);
  if (row?.hint) return String(row.hint);
  return friendlyReviewFailure(code, en);
}

export default function AdminJoinRequests() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const en = language === 'en';
  const location = useLocation();
  const { ready, currentPropertyId, roleInProperty, memberships, refreshMemberships } = useProperty();

  /** samePropertyId 对齐 PropertyContext，避免 UUID 大小写导致角色丢失 */
  const effectiveRole: UserRole | null = useMemo(() => {
    if (!currentPropertyId) return null;
    const hit = memberships.find((m) => samePropertyId(m.propertyId, currentPropertyId));
    return hit?.role ?? null;
  }, [currentPropertyId, memberships]);

  /** 审核权限：仅 `property_members.role`（优先 roleInProperty，其次 membership 命中） */
  const reviewRole: UserRole | null = roleInProperty ?? effectiveRole;
  const canReview = canApproveJoinRequest(reviewRole);

  const [rows, setRows] = useState<JoinRequestRow[]>([]);
  /** 同一物业 + 邮箱去重展示（与库 unique partial 索引一致；历史重复数据仍只显示一条） */
  const pendingRows = useMemo(() => dedupePendingJoinRequestsByPropertyEmail(rows), [rows]);
  /** 数据加载：初始 true；任意路径必须在 finally 中 setLoading(false) */
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [unitOverride, setUnitOverride] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  /** 底部短时提示（成功 / 失败均展示具体文案） */
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  /**
   * 加载 pending join_requests。
   * @param opts.preserveSuccessBanner 为 true 时不清空顶部成功横幅（审批通过后刷新列表用）。
   * @param opts.silent 为 true 时列表失败不写入 pageError（避免审批已成功却被「加载失败」盖住）。
   */
  const loadJoinRequests = useCallback(
    async (opts?: { preserveSuccessBanner?: boolean; silent?: boolean }): Promise<void> => {
      if (!opts?.silent) setPageError(null);
      if (!opts?.preserveSuccessBanner) setSuccessBanner(null);
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('join_requests')
          .select(JOIN_REQUESTS_SELECT_PENDING)
          .eq('property_id', currentPropertyId as string)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (error) {
          setRows([]);
          const msg = [error.message, error.code ? `(${error.code})` : '', error.details ? String(error.details) : '']
            .filter(Boolean)
            .join(' ');
          if (opts?.silent) {
            console.warn('[AdminJoinRequests] loadJoinRequests failed (silent)', msg);
          } else {
            setPageError(
              en
                ? `Could not load requests: ${msg}`
                : `无法加载申请列表（可能被 RLS 拦截）：${msg}`,
            );
          }
          return;
        }
        setRows((data as JoinRequestRow[]) ?? []);
      } catch (e) {
        setRows([]);
        if (opts?.silent) {
          console.warn('[AdminJoinRequests] loadJoinRequests catch (silent)', e);
        } else {
          setPageError(
            en
              ? `Unexpected error: ${e instanceof Error ? e.message : String(e)}`
              : `加载异常：${e instanceof Error ? e.message : String(e)}`,
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [currentPropertyId, en],
  );

  useEffect(() => {
    if (!ready) {
      setLoading(false);
      return;
    }
    if (memberships.length === 0) {
      setLoading(false);
      setRows([]);
      setPageError(null);
      return;
    }
    if (!currentPropertyId || !canReview) {
      setLoading(false);
      setRows([]);
      setPageError(null);
      return;
    }
    void loadJoinRequests();
  }, [ready, memberships.length, currentPropertyId, canReview, loadJoinRequests]);

  const approve = async (id: string, unitFromRequest: string | null) => {
    if (!user?.id) {
      const msg = en ? 'Please sign in again.' : '请重新登录后再试。';
      setPageError(msg);
      setToast({ kind: 'error', text: msg });
      return;
    }
    setActingId(id);
    setPageError(null);
    setSuccessBanner(null);
    const effectiveUnit = unitOverride[id]?.trim() || unitFromRequest?.trim() || null;
    if (!currentPropertyId) {
      const msg = en ? 'No property selected.' : '未选择物业。';
      setPageError(msg);
      setToast({ kind: 'error', text: msg });
      setActingId(null);
      return;
    }

    const jrRow = pendingRows.find((r) => r.id === id) ?? rows.find((r) => r.id === id);
    const result = await approveJoinRequest(supabase, {
      joinRequestId: id,
      propertyId: currentPropertyId,
      unitNumberOverride: effectiveUnit,
    });
    setActingId(null);

    const rpcRow = firstRpcJsonRow(result.data);
    console.info('[AdminJoinRequests] approve_join_request_final', {
      requestId: id,
      propertyId: currentPropertyId,
      effectiveUnit,
      targetEmail: (rpcRow?.email as string | undefined) ?? jrRow?.email ?? null,
      resolvedProfileId: (rpcRow?.user_id as string | undefined) ?? null,
      rpcData: result.data,
      rpcError: result.error,
    });

    if (!result.ok) {
      const code = result.error?.code ?? joinRpcErrorCode(result.data);
      const msg =
        result.error?.message ||
        joinApproveUserMessage(result.data, code, result.error ? { message: result.error.message, code: result.error.code } : null, en);
      console.error('approve_join_request_final failed:', result.data, result.error);
      setPageError(msg);
      setToast({ kind: 'error', text: msg });
      return;
    }

    logPropertyEntryApproveResult({
      reviewerId: user.id,
      data: result.data,
      unitNoFallback: effectiveUnit,
    });

    const successZh = '审批通过，用户已加入物业';
    const successEn = 'Approved. The user has been added to this property.';
    setPageError(null);
    setSuccessBanner(en ? successEn : successZh);
    setToast({ kind: 'success', text: en ? successEn : successZh });

    try {
      await loadJoinRequests({ preserveSuccessBanner: true, silent: true });
    } catch (e) {
      console.warn('[AdminJoinRequests] refresh join list after approve', e);
    }
    try {
      await refreshMemberships();
    } catch (e) {
      console.warn('[AdminJoinRequests] refreshMemberships after approve', e);
    }
    try {
      window.dispatchEvent(new CustomEvent(CLEARSTRATA_PROPERTY_MEMBERS_CHANGED));
    } catch {
      /* ignore */
    }
    void sendJoinDecisionEmail({
      joinRequestId: id,
      decision: 'approved',
      locale: en ? 'en' : 'zh',
    });
  };

  const openReject = (id: string) => {
    setRejectFor(id);
    setRejectReason('');
  };

  const confirmReject = async () => {
    if (!rejectFor || !user?.id) {
      if (!user?.id) setPageError(en ? 'Please sign in again.' : '请重新登录后再试。');
      return;
    }
    setActingId(rejectFor);
    setPageError(null);
    setSuccessBanner(null);
    const { ok, data, error } = await rejectJoinRequest(supabase, {
      joinRequestId: rejectFor,
      reviewerId: user.id,
      rejectionReason: rejectReason.trim() || null,
    });
    setActingId(null);
    if (error) {
      console.error('reject_join_request error:', error, data);
      const msg = joinApproveUserMessage(data, undefined, error, en);
      setPageError(msg);
      setToast({ kind: 'error', text: msg });
      return;
    }
    if (!ok) {
      const code = joinRpcErrorCode(data);
      console.error('reject_join_request unexpected:', data);
      const msg = joinApproveUserMessage(data, code, null, en);
      setPageError(msg);
      setToast({ kind: 'error', text: msg });
      return;
    }
    const rejectedId = rejectFor;
    setRejectFor(null);
    setRejectReason('');
    const rejMsg = en ? 'Application rejected.' : '已拒绝申请';
    setSuccessBanner(rejMsg);
    setToast({ kind: 'success', text: rejMsg });
    void loadJoinRequests();
    void sendJoinDecisionEmail({
      joinRequestId: rejectedId,
      decision: 'rejected',
      locale: en ? 'en' : 'zh',
    });
  };

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(en ? 'en-CA' : 'zh-CN');
    } catch {
      return iso;
    }
  };

  if (!ready) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <BackButton />
        <div className="flex justify-center py-16">
          <Loader2 className="w-10 h-10 text-[#1D9E75] animate-spin" aria-hidden />
        </div>
        <p className="text-center text-sm text-gray-500">{t('loading_property_context')}</p>
      </div>
    );
  }

  if (memberships.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <BackButton />
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {t('no_manageable_property')}
        </div>
      </div>
    );
  }

  if (!currentPropertyId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <BackButton />
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {t('current_property_not_loaded')}
        </div>
      </div>
    );
  }

  if (!canReview) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <BackButton />
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 space-y-2">
          <p className="font-medium">
            {en
              ? 'You do not have permission to review join requests for this property.'
              : '你没有审核当前物业加入申请的权限。'}
          </p>
          <p className="text-red-800/90 text-xs">
            {en ? 'Role in this property (property_members)' : '当前物业角色（property_members）'}:{' '}
            {String(reviewRole ?? '—')} ({en ? 'required' : '需要'}: property_admin / council / manager)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <BackButton />
      <div className="mt-2 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="text-[#1D9E75]" size={28} />
            {en ? 'Join requests' : '加入申请审核'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {en ? 'Pending applications for this property.' : '当前物业待审核的加入申请。'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {en ? 'Reviewer role (this property)' : '审核角色（当前物业）'}: {roleLabel(reviewRole ?? undefined, en)}
          </p>
        </div>
        <Link
          to={{ pathname: '/admin/invites', search: location.search }}
          className="text-sm font-medium text-[#1D9E75] hover:underline shrink-0"
        >
          {en ? 'Invite codes' : '邀请码管理'}
        </Link>
      </div>

      {pageError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {pageError}
        </div>
      )}

      {successBanner && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {successBanner}
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-[60] max-w-md -translate-x-1/2 px-4 w-[min(100%,28rem)]`}
          role="status"
        >
          <div
            className={`rounded-xl border px-4 py-3 text-sm shadow-lg ${
              toast.kind === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                : 'border-red-200 bg-red-50 text-red-950'
            }`}
          >
            {toast.text}
          </div>
        </div>
      )}

      {(reviewRole === 'admin' || reviewRole === 'council') && (
        <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
          {en ? (
            <>
              Pending{' '}
              <span className="font-medium">property_members</span> approvals (new owners) are on{' '}
              <Link to="/owner-info?tab=users" className="font-medium text-[#1D9E75] hover:underline">
                Owner info → User management
              </Link>
              .
            </>
          ) : (
            <>
              在{' '}
              <Link to="/owner-info?tab=users" className="font-medium text-[#1D9E75] hover:underline">
                业主信息 → 用户管理
              </Link>{' '}
              处理 <span className="font-medium">property_members</span> 待审批（pending）成员。
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-10 h-10 text-[#1D9E75] animate-spin" aria-hidden />
        </div>
      ) : pendingRows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500 text-sm">
          {t('join_requests_empty_pending')}
        </div>
      ) : (
        <ul className="space-y-4">
          {pendingRows.map((r) => (
            <li
              key={r.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5"
            >
              <div className="text-sm space-y-1 text-gray-800">
                <p>
                  <span className="text-gray-500">{en ? 'Name' : '姓名'}: </span>
                  <span className="font-medium">{r.full_name || '—'}</span>
                </p>
                <p>
                  <span className="text-gray-500">Email: </span>
                  {r.email || '—'}
                </p>
                <p>
                  <span className="text-gray-500">{en ? 'Phone' : '电话'}: </span>
                  {r.phone || '—'}
                </p>
                <p>
                  <span className="text-gray-500">{en ? 'Role' : '角色'}: </span>
                  {roleLabel(r.requested_role, en)}
                </p>
                <p>
                  <span className="text-gray-500">{en ? 'Unit' : '单元'}: </span>
                  {r.unit_number || '—'}
                </p>
                {r.note && (
                  <p>
                    <span className="text-gray-500">{en ? 'Note' : '备注'}: </span>
                    {r.note}
                  </p>
                )}
                <p className="text-xs text-gray-400 pt-1">
                  {en ? 'Submitted' : '提交时间'} {fmt(r.created_at)}
                </p>
                <p className="pt-2">
                  <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-900 border border-amber-100 px-2.5 py-0.5 text-xs font-medium">
                    {en ? 'Pending' : '待审核'}
                  </span>
                </p>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs text-gray-500 mb-1">
                    {en ? 'Unit override (optional)' : '房号覆盖（可选）'}
                  </label>
                  <input
                    value={unitOverride[r.id] ?? ''}
                    onChange={(e) =>
                      setUnitOverride((m) => ({ ...m, [r.id]: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder={r.unit_number ?? ''}
                  />
                </div>
                <div className="flex gap-2 sm:items-end">
                  <button
                    type="button"
                    disabled={actingId === r.id || !user?.id}
                    onClick={() => void approve(r.id, r.unit_number)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1D9E75] text-white text-sm font-semibold hover:bg-[#178a66] disabled:opacity-50"
                  >
                    {actingId === r.id ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Check size={18} />
                    )}
                    {en ? 'Approve' : '通过'}
                  </button>
                  <button
                    type="button"
                    disabled={actingId === r.id || !user?.id}
                    onClick={() => openReject(r.id)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-800 text-sm font-semibold hover:bg-gray-200 disabled:opacity-50"
                  >
                    <X size={18} />
                    {en ? 'Reject' : '拒绝'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {rejectFor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 sm:p-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              {en ? 'Reject application' : '拒绝申请'}
            </h3>
            <label className="block text-sm text-gray-600 mb-1">
              {en ? 'Reason (optional)' : '原因（可选）'}
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setRejectFor(null)}
                className="px-4 py-2 rounded-xl text-gray-700 bg-gray-100 text-sm font-medium"
              >
                {en ? 'Cancel' : '取消'}
              </button>
              <button
                type="button"
                onClick={() => void confirmReject()}
                disabled={actingId === rejectFor}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {en ? 'Confirm reject' : '确认拒绝'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
