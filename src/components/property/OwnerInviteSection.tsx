import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Owner Invitations panel — directed two-step owner invite.
 *   - Submit calls Edge Function `send-owner-invite`.
 *   - List reads `public.owner_invites` directly (RLS gates SELECT to
 *     council / admin / property_admin of this property; manager excluded).
 *   - Independent of staff_invites / join_requests / QR entry.
 */

type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

const STATUS_LABEL: Record<InviteStatus, { zh: string; en: string }> = {
  pending: { zh: '已发送，等待接受', en: 'Sent, waiting for acceptance' },
  accepted: { zh: '已启用', en: 'Active' },
  expired: { zh: '已过期', en: 'Expired' },
  revoked: { zh: '已撤销', en: 'Revoked' },
};

const STATUS_BADGE: Record<InviteStatus, string> = {
  pending: 'bg-blue-50 text-blue-700 border border-blue-200',
  accepted: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  expired: 'bg-amber-50 text-amber-800 border border-amber-200',
  revoked: 'bg-gray-100 text-gray-600 border border-gray-200',
};

interface OwnerInviteRow {
  id: string;
  email: string;
  full_name: string | null;
  unit_no: string | null;
  status: InviteStatus | string;
  created_at: string;
  expires_at: string | null;
  accepted_at: string | null;
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
  if (raw === 'pending' || raw === 'accepted' || raw === 'expired' || raw === 'revoked') {
    return raw;
  }
  return null;
}

/** Map send-owner-invite conflict codes to explicit bilingual messages. */
function resolveSendErrorMessage(
  code: string | undefined,
  fallback: string,
  en: boolean,
): string {
  switch (code) {
    case 'email_is_staff':
      return en
        ? 'This email is already a staff member. To invite them as an owner, remove the staff membership first.'
        : '该邮箱已是本物业职员。如需邀请为业主，请先在成员管理移除其职员身份。';
    case 'email_already_member':
      return en
        ? 'This email is already an active member with another role and cannot receive an owner invitation.'
        : '该邮箱已是本物业其他身份成员，不能发送业主邀请。';
    case 'already_owner':
      return en
        ? 'This email is already an owner of this property.'
        : '该邮箱已经是本物业业主。';
    default:
      return fallback;
  }
}

export function OwnerInviteSection({ propertyId }: { propertyId: string }) {
  const { language } = useLanguage();
  const en = language === 'en';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [unitNo, setUnitNo] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const [rows, setRows] = useState<OwnerInviteRow[]>([]);
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
        .from('owner_invites')
        .select('id,email,full_name,unit_no,status,created_at,expires_at,accepted_at')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!mountedRef.current) return;
      if (error) {
        console.error('[OwnerInviteSection] load owner_invites', error);
        setListError(en ? 'Failed to load owner invitation records.' : '加载业主邀请记录失败。');
        setRows([]);
      } else {
        setRows((data ?? []) as OwnerInviteRow[]);
      }
    } finally {
      if (mountedRef.current) setListLoading(false);
    }
  }, [propertyId, en]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const send = useCallback(async () => {
    setFeedback(null);

    const name = fullName.trim();
    const mail = email.trim();
    const unit = unitNo.trim();

    if (!name) {
      setFeedback({ ok: false, msg: en ? 'Please enter the owner name.' : '请填写业主姓名。' });
      return;
    }
    if (!mail.includes('@')) {
      setFeedback({ ok: false, msg: en ? 'Please enter a valid email address.' : '请填写有效的邮箱地址。' });
      return;
    }
    if (!unit) {
      setFeedback({ ok: false, msg: en ? 'Please enter the unit number.' : '请填写房号。' });
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-owner-invite', {
        body: { propertyId, fullName: name, email: mail, unitNo: unit },
      });
      const payload = (data ?? null) as { ok?: boolean; code?: string; message?: string } | null;

      if (error && !payload) {
        setFeedback({
          ok: false,
          msg: en ? 'Failed to send owner invitation. Please try again later.' : '发送业主邀请失败，请稍后重试。',
        });
        return;
      }
      if (!payload?.ok) {
        const fallback =
          payload?.message ||
          (en ? 'Failed to send owner invitation. Please try again later.' : '发送业主邀请失败，请稍后重试。');
        setFeedback({ ok: false, msg: resolveSendErrorMessage(payload?.code, fallback, en) });
        return;
      }

      setFeedback({
        ok: true,
        msg: en
          ? 'Owner invitation sent. Please ask the recipient to check their email.'
          : '业主邀请已发送，请提醒对方查收邮件。',
      });
      setFullName('');
      setEmail('');
      setUnitNo('');
      void loadRows();
    } catch (e) {
      console.error('[send-owner-invite] threw', e);
      setFeedback({ ok: false, msg: en ? 'Network error. Please try again later.' : '网络异常，请稍后重试。' });
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }, [propertyId, fullName, email, unitNo, en, loadRows]);

  const sendLabel = busy
    ? en
      ? 'Sending...'
      : '发送中...'
    : en
      ? 'Send owner invite'
      : '发送业主邀请';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl space-y-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-gray-900">{en ? 'Owner Invitations' : '业主邀请'}</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            {en
              ? 'Invite an owner by name, email and unit number. They click the email link and enter the property directly — no password or code required.'
              : '输入业主姓名、邮箱和房号发送邀请。业主点击邮件链接即可直接进入物业，无需密码或验证码。'}
          </p>
        </div>

        <div className="space-y-3 pt-1">
          <div>
            <label htmlFor="owner-invite-name" className="block text-sm font-medium text-gray-700 mb-1">
              {en ? 'Owner name' : '业主姓名'} <span className="text-red-500">*</span>
            </label>
            <input
              id="owner-invite-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder={en ? 'e.g. Jane Smith' : '例如：张三'}
              disabled={busy}
              required
            />
          </div>

          <div>
            <label htmlFor="owner-invite-email" className="block text-sm font-medium text-gray-700 mb-1">
              {en ? 'Owner email' : '业主邮箱'} <span className="text-red-500">*</span>
            </label>
            <input
              id="owner-invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="owner@example.com"
              disabled={busy}
              required
            />
          </div>

          <div>
            <label htmlFor="owner-invite-unit" className="block text-sm font-medium text-gray-700 mb-1">
              {en ? 'Unit no.' : '房号'} <span className="text-red-500">*</span>
            </label>
            <input
              id="owner-invite-unit"
              type="text"
              value={unitNo}
              onChange={(e) => setUnitNo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder={en ? 'e.g. 1203' : '例如：1203'}
              disabled={busy}
              required
            />
          </div>
        </div>

        {feedback ? (
          <p
            className={`text-sm ${feedback.ok ? 'text-green-700' : 'text-red-700'}`}
            role={feedback.ok ? 'status' : 'alert'}
          >
            {feedback.msg}
          </p>
        ) : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => void send()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#35C3D6] text-white text-sm font-medium hover:bg-[#2bb0c2] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {sendLabel}
        </button>
      </div>

      <OwnerInviteList
        rows={rows}
        loading={listLoading}
        error={listError}
        en={en}
        onRefresh={() => void loadRows()}
      />
    </div>
  );
}

function OwnerInviteList({
  rows,
  loading,
  error,
  en,
  onRefresh,
}: {
  rows: OwnerInviteRow[];
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
          {en ? 'Owner Invitation Records' : '业主邀请记录'}
        </h3>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {en ? 'Refresh' : '刷新'}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && sorted.length === 0 && !error ? (
        <p className="text-sm text-gray-500">{en ? 'No owner invitations yet.' : '暂无业主邀请记录。'}</p>
      ) : null}

      {sorted.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-3 font-medium">{en ? 'Name' : '姓名'}</th>
                <th className="py-2 pr-3 font-medium">{en ? 'Email' : '邮箱'}</th>
                <th className="py-2 pr-3 font-medium">{en ? 'Unit' : '房号'}</th>
                <th className="py-2 pr-3 font-medium">{en ? 'Status' : '状态'}</th>
                <th className="py-2 pr-3 font-medium whitespace-nowrap">{en ? 'Sent at' : '发送时间'}</th>
                <th className="py-2 pr-3 font-medium whitespace-nowrap">{en ? 'Expires at' : '过期时间'}</th>
                <th className="py-2 pr-3 font-medium whitespace-nowrap">{en ? 'Accepted at' : '接受时间'}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const statusKey = asInviteStatus(String(row.status));
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
                return (
                  <tr key={row.id} className="border-b border-gray-100">
                    <td className="py-2 pr-3 text-gray-900">
                      {row.full_name?.trim() || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs text-gray-700 break-all">{row.email}</td>
                    <td className="py-2 pr-3 text-gray-700">
                      {row.unit_no?.trim() || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}>
                        {statusText}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-xs text-gray-600 whitespace-nowrap">
                      {formatDate(row.created_at, en)}
                    </td>
                    <td className="py-2 pr-3 text-xs text-gray-600 whitespace-nowrap">
                      {formatDate(row.expires_at, en)}
                    </td>
                    <td className="py-2 pr-3 text-xs text-gray-600 whitespace-nowrap">
                      {formatDate(row.accepted_at, en)}
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
