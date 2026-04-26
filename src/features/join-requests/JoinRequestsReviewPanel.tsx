import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2, X, ClipboardList } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import { canApproveJoinRequest, canReviewJoinRequests } from '../../lib/propertyPermissions';
import { samePropertyId } from '../../lib/propertyIdMatch';
import type { UserRole } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import { dedupePendingJoinRequestsByPropertyEmail } from '../../lib/joinRequestGuards';
import { sendJoinDecisionEmail } from '../../lib/sendJoinDecisionEmail';
import { logPropertyEntryApproveResult } from '../../lib/propertyEntryGateLog';
import { firstRpcJsonRow, joinRpcErrorCode } from '../../lib/rpcJsonRow';
import { approveJoinRequest, rejectJoinRequest } from '../../lib/unifiedPropertyEntry';
import { StatusAlert, StatusBadge } from '@/components/status';

export const JOIN_REQUESTS_SELECT_PENDING =
  'id, property_id, user_id, requested_role, full_name, email, phone, unit_no, note, status, created_at, invite_code, review_flag, review_reason, whitelist_matched, unit_occupied, source';

export type JoinRequestRow = {
  id: string;
  property_id: string;
  user_id: string | null;
  requested_role: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  unit_no: string | null;
  note: string | null;
  status: string;
  created_at: string;
  invite_code?: string | null;
  review_flag?: string | null;
  review_reason?: string | null;
  whitelist_matched?: boolean | null;
  unit_occupied?: boolean | null;
  source?: string | null;
};

export function roleLabel(role: string | undefined, en: boolean): string {
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

export type JoinRequestsReviewPanelProps = {
  /** When true, omits page-scale heading / invite link row (e.g. embedded in 人员管理). */
  embedded?: boolean;
  /** Only pending rows with public-invite v2 flags (白名单/占号异常). */
  anomalyOnly?: boolean;
};

function anomalyLabel(flag: string | null | undefined, en: boolean): string {
  const f = (flag || '').trim();
  const m: Record<string, [string, string]> = {
    not_in_whitelist: [
      'Unit not on the whitelist for this property',
      '房号不在白名单',
    ],
    unit_occupied: [
      'Unit is already bound to another account',
      '房号已被其他账户占用',
    ],
    manual_review: ['Pending manual review', '待人工审核'],
  };
  const row = m[f];
  if (row) return en ? row[0] : row[1];
  return en ? '—' : '—';
}

export function JoinRequestsReviewPanel({ embedded = false, anomalyOnly = false }: JoinRequestsReviewPanelProps) {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const en = language === 'en';
  const { ready, currentPropertyId, roleInProperty, memberships } = useProperty();

  const effectiveRole: UserRole | null = useMemo(() => {
    if (!currentPropertyId) return null;
    const hit = memberships.find((m) => samePropertyId(m.propertyId, currentPropertyId));
    return hit?.role ?? null;
  }, [currentPropertyId, memberships]);

  const reviewRole: UserRole | null = roleInProperty ?? effectiveRole;
  const canViewPanel = canReviewJoinRequests(reviewRole);
  const canApproveRequests = canApproveJoinRequest(reviewRole);

  const [rows, setRows] = useState<JoinRequestRow[]>([]);
  const pendingRows = useMemo(() => dedupePendingJoinRequestsByPropertyEmail(rows), [rows]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [unitOverride, setUnitOverride] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadJoinRequests = useCallback(
    async (opts?: { preserveSuccessBanner?: boolean; silent?: boolean }): Promise<void> => {
      if (!opts?.silent) setPageError(null);
      if (!opts?.preserveSuccessBanner) setSuccessBanner(null);
      setLoading(true);
      try {
        let q = supabase
          .from('join_requests')
          .select(JOIN_REQUESTS_SELECT_PENDING)
          .eq('property_id', currentPropertyId as string)
          .eq('status', 'pending');
        if (anomalyOnly) {
          q = q.in('review_flag', ['not_in_whitelist', 'unit_occupied', 'manual_review']);
        }
        const { data, error } = await q.order('created_at', { ascending: false });

        if (error) {
          setRows([]);
          const msg = [error.message, error.code ? `(${error.code})` : '', error.details ? String(error.details) : '']
            .filter(Boolean)
            .join(' ');
          if (opts?.silent) {
            console.warn('[JoinRequestsReviewPanel] loadJoinRequests failed (silent)', msg);
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
          console.warn('[JoinRequestsReviewPanel] loadJoinRequests catch (silent)', e);
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
    [currentPropertyId, en, anomalyOnly],
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
    if (!currentPropertyId || !canViewPanel) {
      setLoading(false);
      setRows([]);
      setPageError(null);
      return;
    }
    void loadJoinRequests();
  }, [ready, memberships.length, currentPropertyId, canViewPanel, loadJoinRequests]);

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
    console.info('[JoinRequestsReviewPanel] approve_join_request', {
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
      console.error('approve_join_request failed:', result.data, result.error);
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
      console.warn('[JoinRequestsReviewPanel] refresh join list after approve', e);
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
      <div className="flex flex-col items-center py-12">
        <Loader2 className="w-10 h-10 text-[#1D9E75] animate-spin" aria-hidden />
        <p className="text-center text-sm text-gray-500 mt-3">{t('loading_property_context')}</p>
      </div>
    );
  }

  if (memberships.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        {t('no_manageable_property')}
      </div>
    );
  }

  if (!currentPropertyId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        {t('current_property_not_loaded')}
      </div>
    );
  }

  if (!canViewPanel) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 space-y-2">
        <p className="font-medium">
          {en
            ? 'You do not have permission to view join requests for this property.'
            : '你没有查看当前物业加入申请的权限。'}
        </p>
        <p className="text-red-800/90 text-xs">
          {en ? 'Your role on this property' : '当前物业角色'}: {String(reviewRole ?? '—')} (
          {en ? 'required' : '需要'}: property_admin / council / manager / admin)
        </p>
      </div>
    );
  }

  return (
    <div className={embedded ? 'space-y-4' : 'max-w-3xl mx-auto px-0 py-0 space-y-4'}>
      {!embedded && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="text-[#1D9E75]" size={26} />
              {anomalyOnly
                ? en
                  ? 'Exception queue (entry checks)'
                  : '待审核人员'
                : en
                  ? 'Join request review'
                  : '加入申请'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {anomalyOnly
                ? en
                  ? 'Queue for public /entry cases that need manual review (e.g. unit checks).'
                  : '未通过入楼自动校验、需人工处理的申请，将在此列队。'
                : en
                  ? 'Only pending join requests for this property.'
                  : '仅展示本物业待处理的加入申请。'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {en ? 'Reviewer role (this property)' : '审核角色（当前物业）'}:{' '}
              {roleLabel(reviewRole ?? undefined, en)}
            </p>
          </div>
          <Link
            to="/property-admin/invites"
            className="text-sm font-medium text-clearstrata-ui-primary hover:underline shrink-0"
          >
            {en ? 'Invite codes' : '邀请码管理'}
          </Link>
        </div>
      )}

      {embedded && (
        <p className="text-xs text-gray-500">
          {en ? 'Reviewer role' : '审核角色'}: {roleLabel(reviewRole ?? undefined, en)}
        </p>
      )}

      {pageError && (
        <StatusAlert tone="danger">{pageError}</StatusAlert>
      )}

      {successBanner && (
        <StatusAlert tone="success">{successBanner}</StatusAlert>
      )}

      {!canApproveRequests && (
        <StatusAlert tone="warning">
          {en
            ? 'Only an active council member on this property can approve join requests (「通过」). You may still reject pending requests if your role allows.'
            : '仅本物业在任业委会（council）成员可使用「通过」审批；若您的角色允许，仍可拒绝待处理申请。'}
        </StatusAlert>
      )}

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-[60] max-w-md -translate-x-1/2 px-4 w-[min(100%,28rem)]"
          role="status"
        >
          <StatusAlert
            tone={toast.kind === 'success' ? 'success' : 'danger'}
            variant="solid"
            className="shadow-lg"
          >
            {toast.text}
          </StatusAlert>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-10 h-10 text-clearstrata-ui-primary animate-spin" aria-hidden />
        </div>
      ) : pendingRows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500 text-sm">
          {anomalyOnly
            ? en
              ? 'No exception cases in the queue right now.'
              : '当前暂无待审核的异常入楼申请。'
            : t('join_requests_empty_pending')}
        </div>
      ) : (
        <ul className="space-y-4">
          {pendingRows.map((r) => {
            const rf = (r.review_flag || '').trim();
            const isAnomaly = ['not_in_whitelist', 'unit_occupied', 'manual_review'].includes(rf);
            return (
            <li key={r.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
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
                  {r.unit_no || '—'}
                </p>
                {(r.invite_code && String(r.invite_code).trim()) || anomalyOnly || isAnomaly ? (
                  <p>
                    <span className="text-gray-500">{en ? 'Invite code' : '邀请码'}: </span>
                    <span className="font-mono text-gray-800">
                      {r.invite_code && String(r.invite_code).trim() ? r.invite_code : '—'}
                    </span>
                  </p>
                ) : null}
                {anomalyOnly || isAnomaly ? (
                  <p>
                    <span className="text-gray-500">{en ? 'Exception' : '异常原因'}: </span>
                    <span className="font-medium text-amber-900">{anomalyLabel(r.review_flag, en)}</span>
                  </p>
                ) : null}
                {(r.whitelist_matched != null || r.unit_occupied != null) && (anomalyOnly || isAnomaly) ? (
                  <p className="text-xs text-gray-600">
                    {en ? 'Whitelist' : '白名单'}:{' '}
                    {r.whitelist_matched ? (en ? 'on list' : '在名单内') : en ? 'not on list' : '未在名单'}
                    {r.unit_occupied != null
                      ? ` · ${en ? 'Unit tied' : '房号状态'}: ${r.unit_occupied ? (en ? 'occupied' : '已被占用/疑似占用') : en ? 'free' : '未占'}`
                      : ''}
                  </p>
                ) : null}
                {r.review_reason && (anomalyOnly || isAnomaly) ? (
                  <p>
                    <span className="text-gray-500">{en ? 'Detail' : '说明'}: </span>
                    {r.review_reason}
                  </p>
                ) : null}
                {r.note && (
                  <p>
                    <span className="text-gray-500">{en ? 'Note' : '备注'}: </span>
                    {r.note}
                  </p>
                )}
                <p className="text-xs text-gray-400 pt-1">
                  {en ? 'Submitted' : '提交时间'} {fmt(r.created_at)}
                </p>
                <p className="pt-2 flex flex-wrap gap-2">
                  <StatusBadge tone="warning" size="sm">
                    {isAnomaly ? (en ? 'Review (exception)' : '待审（异常）') : en ? 'Pending' : '待审核'}
                  </StatusBadge>
                </p>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs text-gray-500 mb-1">
                    {en ? 'Unit override (optional)' : '房号覆盖（可选）'}
                  </label>
                  <input
                    value={unitOverride[r.id] ?? ''}
                    onChange={(e) => setUnitOverride((m) => ({ ...m, [r.id]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder={r.unit_no ?? ''}
                  />
                </div>
                <div className="flex gap-2 sm:items-end">
                  <button
                    type="button"
                    disabled={actingId === r.id || !user?.id || !canApproveRequests}
                    onClick={() => void approve(r.id, r.unit_no)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-clearstrata-ui-primary text-white text-sm font-semibold hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive disabled:opacity-50"
                  >
                    {actingId === r.id ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
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
          );
          })}
        </ul>
      )}

      {rejectFor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 sm:p-6">
            <h3 className="font-semibold text-gray-900 mb-3">{en ? 'Reject application' : '拒绝申请'}</h3>
            <label className="block text-sm text-gray-600 mb-1">{en ? 'Reason (optional)' : '原因（可选）'}</label>
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
