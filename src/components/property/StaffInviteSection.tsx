import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Phase 2B — Staff invitations:
 *   - Real submit calls Supabase Edge Function `send-staff-invite`.
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
  cancelled: { zh: '已取消', en: 'Cancelled' },
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
  const [busy, setBusy] = useState(false);
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
      const { data, error } = await supabase.functions.invoke(
        'send-staff-invite',
        {
          body: {
            propertyId,
            staffEmail: email,
            staffName: staffName.trim() || undefined,
            staffType,
          },
        },
      );
      if (error) {
        const payload = (data ?? null) as { message?: string } | null;
        const msg =
          payload?.message ||
          error.message ||
          (en
            ? 'Failed to send staff invitation. Please try again later.'
            : '发送职员邀请失败，请稍后重试。');
        console.error('[send-staff-invite]', error, data);
        setFeedback({ ok: false, msg });
        return;
      }
      const payload = (data ?? null) as
        | { ok?: boolean; message?: string }
        | null;
      if (!payload?.ok) {
        const msg =
          payload?.message ||
          (en
            ? 'Failed to send staff invitation. Please try again later.'
            : '发送职员邀请失败，请稍后重试。');
        console.error('[send-staff-invite] response', payload);
        setFeedback({ ok: false, msg });
        return;
      }
      setFeedback({
        ok: true,
        msg: en
          ? 'Staff invitation sent. Please ask the recipient to check their email.'
          : '职员邀请已发送，请提醒对方查收邮件。',
      });
      setStaffName('');
      setStaffEmail('');
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
  }, [propertyId, staffName, staffEmail, staffType, en, loadRows]);

  const sendDisabled = busy;
  const sendLabel = busy
    ? en
      ? 'Sending...'
      : '发送中...'
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
            className={`text-sm ${
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
        onRefresh={() => void loadRows()}
      />
    </div>
  );
}

function StaffInviteList({
  rows,
  loading,
  error,
  en,
  onRefresh,
}: {
  rows: StaffInviteRow[];
  loading: boolean;
  error: string | null;
  en: boolean;
  onRefresh: () => void;
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
                return (
                  <tr key={row.id} className="border-b border-gray-100">
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
