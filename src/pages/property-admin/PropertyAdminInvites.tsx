import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Copy, Check, Loader2, Plus, QrCode, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import { supabase } from '../../lib/supabase';
import { InviteQRCode } from '../../components/InviteQRCode';

/**
 * 定向邀请 — `property_direct_invites`。
 * 链接：`/join?invite=TOKEN`（与公开邀请 `/entry?propertyId&inviteCode` 分离）。
 */
type DirectInviteRow = {
  id: string;
  invite_token: string;
  label: string;
  unit_number: string | null;
  intended_role: string | null;
  intended_email: string | null;
  intended_name: string | null;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

type InviteStatus = 'active' | 'disabled' | 'expired' | 'used_up';

function genInviteToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

function deriveStatus(row: {
  is_active: boolean;
  expires_at: string | null;
  used_count: number;
  max_uses: number;
}): InviteStatus {
  if (!row.is_active) return 'disabled';
  if (row.expires_at) {
    const t = new Date(row.expires_at).getTime();
    if (!Number.isNaN(t) && t < Date.now()) return 'expired';
  }
  if (row.max_uses > 0 && row.used_count >= row.max_uses) return 'used_up';
  return 'active';
}

function statusLabel(s: InviteStatus, en: boolean): string {
  const m: Record<InviteStatus, [string, string]> = {
    active: ['Active', '可用'],
    disabled: ['Disabled', '已停用'],
    expired: ['Expired', '已过期'],
    used_up: ['Used up', '次数用尽'],
  };
  return en ? m[s][0] : m[s][1];
}

function statusBadgeClass(s: InviteStatus): string {
  switch (s) {
    case 'active':
      return 'bg-emerald-100 text-emerald-900';
    case 'disabled':
      return 'bg-gray-200 text-gray-700';
    case 'expired':
      return 'bg-amber-100 text-amber-900';
    case 'used_up':
      return 'bg-violet-100 text-violet-900';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function PropertyAdminInvites() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId } = useProperty();

  const [directRows, setDirectRows] = useState<DirectInviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);

  const [dirModalOpen, setDirModalOpen] = useState(false);

  const [dLabel, setDLabel] = useState('');
  const [dUnit, setDUnit] = useState('');
  const [dRole, setDRole] = useState('owner');
  const [dEmail, setDEmail] = useState('');
  const [dName, setDName] = useState('');
  const [dMax, setDMax] = useState(1);
  const [dExpires, setDExpires] = useState('');
  const [dCreating, setDCreating] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [qrTitle, setQrTitle] = useState('');
  const [qrPurpose, setQrPurpose] = useState('');
  const [qrFile, setQrFile] = useState('');
  const [qrKindLabel, setQrKindLabel] = useState('');

  const base = useMemo(() => (typeof window !== 'undefined' ? window.location.origin : ''), []);

  const load = useCallback(async () => {
    if (!currentPropertyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('property_direct_invites')
      .select(
        'id, invite_token, label, unit_number, intended_role, intended_email, intended_name, max_uses, used_count, expires_at, is_active, created_at',
      )
      .eq('property_id', currentPropertyId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      setDirectRows([]);
    } else {
      setDirectRows((data as DirectInviteRow[]) ?? []);
    }
    setLoading(false);
  }, [currentPropertyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setBanner(en ? 'Copy failed.' : '复制失败');
    }
  };

  const createDirect = async () => {
    if (!currentPropertyId || !user?.id) return;
    setDCreating(true);
    setBanner(null);
    let expiresAt: string | null = null;
    if (dExpires) {
      const d = new Date(dExpires);
      if (!Number.isNaN(d.getTime())) expiresAt = d.toISOString();
    }
    for (let i = 0; i < 8; i++) {
      const token = genInviteToken();
      const { error } = await supabase.from('property_direct_invites').insert({
        property_id: currentPropertyId,
        invite_token: token,
        label: dLabel.trim(),
        unit_number: dUnit.trim() || null,
        intended_role: dRole.trim() || null,
        intended_email: dEmail.trim() || null,
        intended_name: dName.trim() || null,
        max_uses: Number.isFinite(dMax) ? Math.max(0, Math.floor(dMax)) : 1,
        used_count: 0,
        expires_at: expiresAt,
        is_active: true,
        created_by: user.id,
      });
      if (!error) {
        setDLabel('');
        setDUnit('');
        setDRole('owner');
        setDEmail('');
        setDName('');
        setDMax(1);
        setDExpires('');
        setDirModalOpen(false);
        setBanner(en ? 'Directed invite created.' : '定向邀请已创建。');
        setDCreating(false);
        void load();
        return;
      }
      if (error.code !== '23505') {
        setBanner(error.message ?? (en ? 'Create failed.' : '创建失败。'));
        setDCreating(false);
        return;
      }
    }
    setBanner(en ? 'Could not generate unique token.' : '无法生成唯一 token。');
    setDCreating(false);
  };

  const disableDirect = async (id: string) => {
    if (!currentPropertyId) return;
    setBusyId(id);
    await supabase.from('property_direct_invites').update({ is_active: false }).eq('id', id).eq('property_id', currentPropertyId);
    setBusyId(null);
    void load();
  };

  const deleteDirect = async (id: string) => {
    if (!currentPropertyId) return;
    if (!window.confirm(en ? 'Delete this directed invite?' : '确定删除该定向邀请？')) return;
    setBusyId(id);
    const { error } = await supabase.from('property_direct_invites').delete().eq('id', id).eq('property_id', currentPropertyId);
    setBusyId(null);
    if (error) setBanner(error.message);
    else void load();
  };

  const openQrDirect = (row: DirectInviteRow) => {
    const url = `${base}/join?invite=${encodeURIComponent(row.invite_token)}`;
    setQrUrl(url);
    setQrTitle(row.label?.trim() || row.invite_token.slice(0, 10) + '…');
    setQrPurpose(en ? 'Directed invite — pre-filled application.' : '定向邀请 — 预填申请信息。');
    setQrFile(`clearstrata-direct-${row.id.slice(0, 8)}.png`);
    setQrKindLabel(en ? 'Directed' : '定向');
    setQrOpen(true);
  };

  const fmtExp = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString(en ? 'en-CA' : 'zh-CN');
    } catch {
      return iso;
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {en ? 'Direct Invite Management' : '定向邀请管理'}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {en
              ? 'Directed links for specific people (property_direct_invites). Public codes are under Public Invite Management.'
              : '面向指定人员的定向邀请（property_direct_invites）。公开邀请码请在「公开邀请管理」中维护。'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-sm">
          <Link to="/admin/invite-codes" className="font-medium text-[#1D9E75] hover:underline">
            {en ? 'Public Invite Management' : '公开邀请管理'}
          </Link>
          <Link to="/property-admin/settings" className="font-medium text-[#1D9E75] hover:underline">
            ← {en ? 'Property settings' : '物业设置'}
          </Link>
        </div>
      </div>

      {banner ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">{banner}</div>
      ) : null}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setDirModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1D9E75] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#188562]"
        >
          <Plus size={18} />
          {en ? 'Create directed invite' : '创建定向邀请'}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-2 py-3 font-semibold">{en ? 'Label' : '标签'}</th>
              <th className="px-2 py-3 font-semibold">{en ? 'Unit' : '单元'}</th>
              <th className="px-2 py-3 font-semibold">{en ? 'Role' : '意向角色'}</th>
              <th className="px-2 py-3 font-semibold">email</th>
              <th className="px-2 py-3 font-semibold">{en ? 'Used / max' : '已用/上限'}</th>
              <th className="px-2 py-3 font-semibold">{en ? 'Status' : '状态'}</th>
              <th className="px-2 py-3 font-semibold">{en ? 'Expires' : '过期时间'}</th>
              <th className="px-2 py-3 font-semibold text-right">{en ? 'Actions' : '操作'}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-12 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#1D9E75]" />
                </td>
              </tr>
            ) : directRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-gray-500">
                  {en ? 'No directed invites.' : '暂无定向邀请。'}
                </td>
              </tr>
            ) : (
              directRows.map((r) => {
                const st = deriveStatus(r);
                const link = `${base}/join?invite=${encodeURIComponent(r.invite_token)}`;
                return (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="px-2 py-2.5 align-top">{r.label || '—'}</td>
                    <td className="px-2 py-2.5 align-top">{r.unit_number || '—'}</td>
                    <td className="px-2 py-2.5 align-top">{r.intended_role || '—'}</td>
                    <td className="px-2 py-2.5 align-top text-xs break-all max-w-[140px]">{r.intended_email || '—'}</td>
                    <td className="px-2 py-2.5 align-top">
                      {r.used_count} / {r.max_uses}
                    </td>
                    <td className="px-2 py-2.5 align-top">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(st)}`}>
                        {statusLabel(st, en)}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 align-top text-xs whitespace-nowrap">{fmtExp(r.expires_at)}</td>
                    <td className="px-2 py-2.5 text-right align-top">
                      <div className="flex flex-wrap justify-end gap-1">
                        <button
                          type="button"
                          className="rounded border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50"
                          onClick={() => void copyText(link, `d-${r.id}`)}
                        >
                          {copied === `d-${r.id}` ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                        <button
                          type="button"
                          className="rounded border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50"
                          onClick={() => openQrDirect(r)}
                        >
                          <QrCode size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={st !== 'active' || busyId === r.id}
                          className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900 disabled:opacity-40"
                          onClick={() => void disableDirect(r.id)}
                        >
                          <Ban size={14} className="inline" />
                        </button>
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-800 hover:bg-red-100 disabled:opacity-50"
                          onClick={() => void deleteDirect(r.id)}
                        >
                          <Trash2 size={14} className="inline" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {dirModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setDirModalOpen(false)}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900">{en ? 'Create directed invite' : '创建定向邀请'}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="text-gray-700">{en ? 'Label' : '标签'}</span>
                <input value={dLabel} onChange={(e) => setDLabel(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>
              <label className="block text-sm">
                <span className="text-gray-700">{en ? 'Unit' : '单元号'}</span>
                <input value={dUnit} onChange={(e) => setDUnit(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>
              <label className="block text-sm">
                <span className="text-gray-700">{en ? 'Intended role' : '意向角色'}</span>
                <select value={dRole} onChange={(e) => setDRole(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                  <option value="owner">owner</option>
                  <option value="tenant">tenant</option>
                  <option value="resident">resident</option>
                  <option value="viewer">viewer</option>
                </select>
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-gray-700">{en ? 'Intended email' : '意向邮箱'}</span>
                <input type="email" value={dEmail} onChange={(e) => setDEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-gray-700">{en ? 'Intended name' : '意向姓名'}</span>
                <input value={dName} onChange={(e) => setDName(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>
              <label className="block text-sm">
                <span className="text-gray-700">{en ? 'Max uses' : '最大次数'}</span>
                <input type="number" min={0} value={dMax} onChange={(e) => setDMax(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-gray-700">{en ? 'Expires (optional)' : '过期时间（可选）'}</span>
                <input type="datetime-local" value={dExpires} onChange={(e) => setDExpires(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setDirModalOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                {en ? 'Cancel' : '取消'}
              </button>
              <button
                type="button"
                disabled={dCreating || !currentPropertyId}
                onClick={() => void createDirect()}
                className="rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-medium text-white hover:bg-[#188562] disabled:opacity-50"
              >
                {dCreating ? <Loader2 className="h-4 w-4 animate-spin inline" /> : null} {en ? 'Create' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {qrOpen && qrUrl ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={() => setQrOpen(false)}>
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <InviteQRCode
              value={qrUrl}
              title={qrTitle}
              purpose={qrPurpose}
              label={qrKindLabel}
              downloadFileName={qrFile}
              size={200}
            />
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setQrOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-800 hover:bg-gray-50">
                {en ? 'Close' : '关闭'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <p className="mt-10 text-center text-xs text-gray-400">ClearStrata</p>
    </div>
  );
}
