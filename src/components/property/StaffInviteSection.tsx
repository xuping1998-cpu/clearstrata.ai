import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Phase 2B — Staff invitations:
 *   - Submit / resend / edit-resend / cancel call `send-staff-invite`.
 *   - Records list reads `public.staff_invites` directly (RLS gates SELECT to
 *     council / admin / property_admin of this property).
 *   - Status text is product-facing (no raw "pending" / "待审核").
 *   - This panel is the sole UI surface for staff invites; staff records are
 *     NEVER merged into the internal members list (`UserManagementTab`).
 */

export type StaffInviteType = 'lawyer' | 'auditor' | 'finance' | 'accountant';

const STAFF_TYPE_OPTIONS: ReadonlyArray<{
  value: StaffInviteType;
  zh: string;
  en: string;
}> = [
  { value: 'lawyer', zh: '律师', en: 'Legal Counsel' },
  { value: 'auditor', zh: '审计', en: 'Auditor' },
  { value: 'finance', zh: '财务', en: 'Finance' },
  { value: 'accountant', zh: '会计', en: 'Accountant' },
];

const STAFF_TYPE_LABEL: Record<StaffInviteType, { zh: string; en: string }> = {
  lawyer: { zh: '律师', en: 'Legal Counsel' },
  auditor: { zh: '审计', en: 'Auditor' },
  finance: { zh: '财务', en: 'Finance' },
  accountant: { zh: '会计', en: 'Accountant' },
};

type InviteStatus = 'pending' | 'accepted' | 'cancelled' | 'expired';

const STATUS_LABEL: Record<InviteStatus, { zh: string; en: string }> = {
  pending: { zh: '已发送，等待接受', en: 'Sent, waiting for acceptance' },
  accepted: { zh: '已启用', en: 'Active' },
  cancelled: { zh: '已撤销', en: 'Cancelled' },
  expired: { zh: '已过期', en: 'Expired' },
};

const STATUS_BADGE: Record<InviteStatus, string> = {
  pending: 'bg-blue-50 text-blue-700 border border-blue-200',
  accepted: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  cancelled: 'bg-gray-100 text-gray-600 border border-gray-200',
  expired: 'bg-amber-50 text-amber-800 border border-amber-200',
};

interface StaffInviteRow {
  id: string;
  email: string;
  full_name: string | null;
  staff_type: StaffInviteType | string;
  status: InviteStatus | string;
  created_at: string;
  expires_at: string | null;
}

type InvokePayload = {
  ok?: boolean;
  code?: string;
  message?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function payloadFromUnknown(value: unknown): InvokePayload | null {
  const o = asRecord(value);
  if (!o) return null;
  const nested = asRecord(o.error) ?? asRecord(o.data);
  const code =
    typeof o.code === 'string'
      ? o.code
      : typeof nested?.code === 'string'
        ? nested.code
        : undefined;
  const message =
    typeof o.message === 'string'
      ? o.message
      : typeof nested?.message === 'string'
        ? nested.message
        : typeof o.error === 'string'
          ? o.error
          : undefined;
  const ok = o.ok === true ? true : o.ok === false ? false : undefined;
  if (code == null && message == null && ok == null) return null;
  return { ok, code, message };
}

async function extractInvokePayload(
  data: unknown,
  error: unknown,
): Promise<InvokePayload> {
  const fromData = payloadFromUnknown(data);
  if (fromData?.code || fromData?.message || fromData?.ok === true) {
    return fromData;
  }

  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.clone().json()) as unknown;
      const fromCtx = payloadFromUnknown(body);
      if (fromCtx) return fromCtx;
    } catch {
      /* body already consumed or not JSON */
    }
  }

  if (error && typeof error === 'object' && 'context' in error) {
    const fromCtx = payloadFromUnknown((error as { context: unknown }).context);
    if (fromCtx) return fromCtx;
  }

  return fromData ?? {};
}

function isGenericInvokeMessage(msg: string | undefined): boolean {
  if (!msg) return true;
  return /non-2xx status code/i.test(msg);
}

function mapStaffInviteError(
  code: string | undefined,
  backendMessage: string | undefined,
  en: boolean,
): string {
  if (code === 'STAFF_INVITE_PENDING_EXISTS') {
    return en
      ? 'A staff invitation for this email is already pending. You can resend, edit and resend, or cancel it.'
      : '该邮箱已有一封等待接受的职员邀请。你可以选择「重新发送」「修改并重发」或「撤销」。';
  }
  if (code === 'STAFF_INVITE_ALREADY_ACCEPTED') {
    return en
      ? 'This staff invitation has already been accepted and cannot be changed or resent.'
      : '该职员邀请已经接受，不能修改或重新发送。';
  }
  if (code === 'ALREADY_STAFF') {
    return en
      ? 'This user is already an active staff member of this property.'
      : '该用户已经是本物业职员。';
  }
  if (code === 'EXISTING_OTHER_ROLE' || code === 'EXISTING_OTHER_STAFF_TYPE') {
    if (backendMessage && !isGenericInvokeMessage(backendMessage)) {
      return backendMessage;
    }
  }
  if (backendMessage && !isGenericInvokeMessage(backendMessage)) {
    return backendMessage;
  }
  return en
    ? 'Failed to send staff invitation. Please try again later.'
    : '发送职员邀请失败，请稍后重试。';
}

function formatDate(value: string | null | undefined, en: boolean): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(en ? 'en-CA' : 'zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function asInviteStatus(raw: string): InviteStatus | null {
  if (
    raw === 'pending' ||
    raw === 'accepted' ||
    raw === 'cancelled' ||
    raw === 'expired'
  ) {
    return raw;
  }
  return null;
}

function asStaffType(raw: string): StaffInviteType | null {
  if (
    raw === 'lawyer' ||
    raw === 'auditor' ||
    raw === 'finance' ||
    raw === 'accountant'
  ) {
    return raw;
  }
  return null;
}

export function StaffInviteSection({ propertyId }: { propertyId: string }) {
  const { language } = useLanguage();
  const en = language === 'en';

  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffType, setStaffType] = useState<StaffInviteType | ''>('');
  const [editInviteId, setEditInviteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );

  const [rows, setRows] = useState<StaffInviteRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadRows = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const { data, error } = await supabase
        .from('staff_invites')
        .select('id,email,full_name,staff_type,status,created_at,expires_at')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!mountedRef.current) return;
      if (error) {
        console.error('[StaffInviteSection] load staff_invites', error);
        setListError(
          en
            ? 'Failed to load staff invitation records.'
            : '加载职员邀请记录失败。',
        );
        setRows([]);
      } else {
        setRows((data ?? []) as StaffInviteRow[]);
      }
    } finally {
      if (mountedRef.current) setListLoading(false);
    }
  }, [propertyId, en]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const optionLabel = useCallback(
    (opt: (typeof STAFF_TYPE_OPTIONS)[number]) => (en ? opt.en : opt.zh),
    [en],
  );

  const resetForm = useCallback(() => {
    setStaffName('');
    setStaffEmail('');
    setStaffType('');
    setEditInviteId(null);
  }, []);

  const invokeStaffInvite = useCallback(
    async (body: Record<string, unknown>): Promise<InvokePayload> => {
      const { data, error } = await supabase.functions.invoke(
        'send-staff-invite',
        { body },
      );
      const payload = await extractInvokePayload(data, error);
      if (error && payload.ok !== true) {
        console.error('[send-staff-invite]', error, data, payload);
        return {
          ok: false,
          code: payload.code,
          message: mapStaffInviteError(payload.code, payload.message, en),
        };
      }
      if (payload.ok === false) {
        console.error('[send-staff-invite] response', payload);
        return {
          ok: false,
          code: payload.code,
          message: mapStaffInviteError(payload.code, payload.message, en),
        };
      }
      if (payload.ok !== true) {
        return {
          ok: false,
          message: mapStaffInviteError(payload.code, payload.message, en),
        };
      }
      return payload;
    },
    [en],
  );

  const send = useCallback(async () => {
    setFeedback(null);

    const email = staffEmail.trim();
    if (!email.includes('@')) {
      setFeedback({
        ok: false,
        msg: en
          ? 'Please enter a valid staff email address.'
          : '请填写有效的职员邮箱地址。',
      });
      return;
    }
    if (!staffType) {
      setFeedback({
        ok: false,
        msg: en ? 'Please choose a staff type.' : '请选择职员类型。',
      });
      return;
    }

    setBusy(true);
    try {
      const body: Record<string, unknown> = editInviteId
        ? {
            action: 'edit_resend',
            propertyId,
            inviteId: editInviteId,
            staffEmail: email,
            staffName: staffName.trim() || undefined,
            staffType,
          }
        : {
            propertyId,
            staffEmail: email,
            staffName: staffName.trim() || undefined,
            staffType,
          };
      const payload = await invokeStaffInvite(body);
      if (payload.ok !== true) {
        setFeedback({
          ok: false,
          msg:
            payload.message ||
            (en
              ? 'Failed to send staff invitation. Please try again later.'
              : '发送职员邀请失败，请稍后重试。'),
        });
        return;
      }
      setFeedback({
        ok: true,
        msg: en
          ? 'Staff invitation sent. Please ask the recipient to check their email.'
          : '职员邀请已发送，请提醒对方查收邮件。',
      });
      resetForm();
      void loadRows();
    } catch (e) {
      console.error('[send-staff-invite] threw', e);
      setFeedback({
        ok: false,
        msg: en
          ? 'Network error. Please try again later.'
          : '网络异常，请稍后重试。',
      });
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }, [
    propertyId,
    staffName,
    staffEmail,
    staffType,
    editInviteId,
    en,
    loadRows,
    invokeStaffInvite,
    resetForm,
  ]);

  const resendInvite = useCallback(
    async (row: StaffInviteRow) => {
      setFeedback(null);
      setActingId(row.id);
      try {
        const payload = await invokeStaffInvite({
          action: 'resend',
          propertyId,
          inviteId: row.id,
        });
        if (payload.ok !== true) {
          setFeedback({
            ok: false,
            msg:
              payload.message ||
              (en
                ? 'Failed to resend the staff invitation.'
                : '重新发送职员邀请失败。'),
          });
          return;
        }
        setFeedback({
          ok: true,
          msg: en
            ? 'Staff invitation resent. Please ask the recipient to check their email.'
            : '职员邀请已重新发送，请提醒对方查收邮件。',
        });
        if (editInviteId === row.id) resetForm();
        void loadRows();
      } catch (e) {
        console.error('[send-staff-invite] resend threw', e);
        setFeedback({
          ok: false,
          msg: en
            ? 'Network error. Please try again later.'
            : '网络异常，请稍后重试。',
        });
      } finally {
        if (mountedRef.current) setActingId(null);
      }
    },
    [propertyId, en, invokeStaffInvite, loadRows, editInviteId, resetForm],
  );

  const cancelInvite = useCallback(
    async (row: StaffInviteRow) => {
      const ok = window.confirm(
        en
          ? `Cancel the staff invitation sent to ${row.email}?\nThe existing invitation link will become invalid immediately.`
          : `确定撤销发送给 ${row.email} 的职员邀请吗？\n撤销后，原邀请链接将立即失效。`,
      );
      if (!ok) return;
      setFeedback(null);
      setActingId(row.id);
      try {
        const payload = await invokeStaffInvite({
          action: 'cancel',
          propertyId,
          inviteId: row.id,
        });
        if (payload.ok !== true) {
          setFeedback({
            ok: false,
            msg:
              payload.message ||
              (en
                ? 'Failed to cancel the staff invitation.'
                : '撤销职员邀请失败。'),
          });
          return;
        }
        setFeedback({
          ok: true,
          msg: en
            ? 'Staff invitation cancelled. The previous link is no longer valid.'
            : '职员邀请已撤销，原邀请链接已失效。',
        });
        if (editInviteId === row.id) resetForm();
        void loadRows();
      } catch (e) {
        console.error('[send-staff-invite] cancel threw', e);
        setFeedback({
          ok: false,
          msg: en
            ? 'Network error. Please try again later.'
            : '网络异常，请稍后重试。',
        });
      } finally {
        if (mountedRef.current) setActingId(null);
      }
    },
    [propertyId, en, invokeStaffInvite, loadRows, editInviteId, resetForm],
  );

  const startEdit = useCallback((row: StaffInviteRow) => {
    setFeedback(null);
    setEditInviteId(row.id);
    setStaffName(row.full_name?.trim() ?? '');
    setStaffEmail(row.email);
    const t = asStaffType(String(row.staff_type));
    setStaffType(t ?? '');
  }, []);

  const sendDisabled = busy;
  const sendLabel = busy
    ? en
      ? 'Sending...'
      : '发送中...'
    : editInviteId
      ? en
        ? 'Save & Resend'
        : '保存并重新发送'
      : en
        ? 'Send staff invitation'
        : '发送职员邀请';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl space-y-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-gray-900">
            {en ? 'Staff Invitations' : '职员邀请'}
          </h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            {en
              ? 'Invite professional collaborators such as legal counsel, auditors, finance, or accountants to the property back-office.'
              : '邀请律师、审计、财务或会计等专业协作人员加入本物业后台。'}
          </p>
          <p className="text-xs text-amber-700 leading-relaxed">
            {en
              ? 'Invited staff receive read-only access and may view this property’s finance invoices, meeting materials, and owner/resident records. Only invite vetted professionals you have engaged.'
              : '受邀职员将获得只读访问权限，可能查看本物业财务发票、会议资料、业主/住户资料等。请仅邀请已受委托的专业人员。'}
          </p>
        </div>

        {editInviteId ? (
          <div className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-700 leading-relaxed">
              {en
                ? 'Editing and resending creates a new invitation. The previous link will stop working.'
                : '修改并重发会创建新的邀请记录，原邀请链接将立即失效。'}
            </p>
            <button
              type="button"
              onClick={resetForm}
              disabled={busy}
              className="shrink-0 text-xs text-slate-600 hover:text-slate-900 disabled:opacity-50"
            >
              {en ? 'Cancel edit' : '取消编辑'}
            </button>
          </div>
        ) : null}

        <div className="space-y-3 pt-1">
          <div>
            <label
              htmlFor="staff-invite-name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {en ? 'Staff name (optional)' : '职员姓名（可选）'}
            </label>
            <input
              id="staff-invite-name"
              type="text"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder={en ? 'e.g. Jane Smith' : '例如：张律师'}
              disabled={busy}
            />
          </div>

          <div>
            <label
              htmlFor="staff-invite-email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {en ? 'Staff email' : '职员邮箱'}{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              id="staff-invite-email"
              type="email"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="staff@example.com"
              disabled={busy}
              required
            />
          </div>

          <div>
            <label
              htmlFor="staff-invite-type"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {en ? 'Staff type' : '职员类型'}{' '}
              <span className="text-red-500">*</span>
            </label>
            <select
              id="staff-invite-type"
              value={staffType}
              onChange={(e) =>
                setStaffType(e.target.value as StaffInviteType | '')
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              disabled={busy}
              required
            >
              <option value="">
                {en ? 'Select a staff type…' : '请选择职员类型…'}
              </option>
              {STAFF_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {optionLabel(opt)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {feedback ? (
          <p
            className={`text-sm whitespace-pre-line ${
              feedback.ok ? 'text-green-700' : 'text-red-700'
            }`}
            role={feedback.ok ? 'status' : 'alert'}
          >
            {feedback.msg}
          </p>
        ) : null}

        <button
          type="button"
          disabled={sendDisabled}
          onClick={() => void send()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {sendLabel}
        </button>
      </div>

      <StaffInviteList
        rows={rows}
        loading={listLoading}
        error={listError}
        en={en}
        actingId={actingId}
        editInviteId={editInviteId}
        onRefresh={() => void loadRows()}
        onEdit={(row) => startEdit(row)}
        onResend={(row) => void resendInvite(row)}
        onCancel={(row) => void cancelInvite(row)}
      />
    </div>
  );
}

function StaffInviteList({
  rows,
  loading,
  error,
  en,
  actingId,
  editInviteId,
  onRefresh,
  onEdit,
  onResend,
  onCancel,
}: {
  rows: StaffInviteRow[];
  loading: boolean;
  error: string | null;
  en: boolean;
  actingId: string | null;
  editInviteId: string | null;
  onRefresh: () => void;
  onEdit: (row: StaffInviteRow) => void;
  onResend: (row: StaffInviteRow) => void;
  onCancel: (row: StaffInviteRow) => void;
}) {
  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      }),
    [rows],
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-gray-900">
          {en ? 'Staff Invitation Records' : '职员邀请记录'}
        </h3>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {en ? 'Refresh' : '刷新'}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && sorted.length === 0 && !error ? (
        <p className="text-sm text-gray-500">
          {en ? 'No staff invitations yet.' : '暂无职员邀请记录。'}
        </p>
      ) : null}

      {sorted.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-3 font-medium">
                  {en ? 'Name' : '姓名'}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {en ? 'Email' : '邮箱'}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {en ? 'Staff type' : '职员类型'}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {en ? 'Status' : '状态'}
                </th>
                <th className="py-2 pr-3 font-medium whitespace-nowrap">
                  {en ? 'Sent at' : '发送时间'}
                </th>
                <th className="py-2 pr-3 font-medium whitespace-nowrap">
                  {en ? 'Expires at' : '过期时间'}
                </th>
                <th className="py-2 pr-3 font-medium whitespace-nowrap">
                  {en ? 'Action' : '操作'}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const statusKey = asInviteStatus(String(row.status));
                const typeKey = asStaffType(String(row.staff_type));
                const statusText = statusKey
                  ? en
                    ? STATUS_LABEL[statusKey].en
                    : STATUS_LABEL[statusKey].zh
                  : en
                    ? 'Unknown'
                    : '未知';
                const statusClass = statusKey
                  ? STATUS_BADGE[statusKey]
                  : 'bg-gray-100 text-gray-600 border border-gray-200';
                const typeText = typeKey
                  ? en
                    ? STAFF_TYPE_LABEL[typeKey].en
                    : STAFF_TYPE_LABEL[typeKey].zh
                  : String(row.staff_type);
                const rowBusy = actingId === row.id;
                const showPendingActions = statusKey === 'pending';
                const showExpiredResend = statusKey === 'expired';
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-gray-100 ${
                      editInviteId === row.id ? 'bg-slate-50' : ''
                    }`}
                  >
                    <td className="py-2 pr-3 text-gray-900">
                      {row.full_name?.trim() || (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs text-gray-700 break-all">
                      {row.email}
                    </td>
                    <td className="py-2 pr-3 text-gray-700">{typeText}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}
                      >
                        {statusText}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-xs text-gray-600 whitespace-nowrap">
                      {formatDate(row.created_at, en)}
                    </td>
                    <td className="py-2 pr-3 text-xs text-gray-600 whitespace-nowrap">
                      {formatDate(row.expires_at, en)}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {showPendingActions ? (
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEdit(row)}
                            disabled={rowBusy}
                            className="inline-flex items-center rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {en ? 'Edit & resend' : '修改并重发'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onResend(row)}
                            disabled={rowBusy}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {rowBusy ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : null}
                            {en ? 'Resend' : '重新发送'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onCancel(row)}
                            disabled={rowBusy}
                            className="inline-flex items-center rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            {en ? 'Cancel' : '撤销'}
                          </button>
                        </div>
                      ) : showExpiredResend ? (
                        <button
                          type="button"
                          onClick={() => onResend(row)}
                          disabled={rowBusy}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {rowBusy ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : null}
                          {en ? 'Resend' : '重新发送'}
                        </button>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
