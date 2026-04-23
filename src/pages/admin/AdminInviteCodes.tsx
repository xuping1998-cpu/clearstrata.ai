import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Loader2, Plus, QrCode, Copy, Check } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import { supabase } from '../../lib/supabase';
import { BackButton } from '../../components/BackButton';
import { InviteQRCode } from '../../components/InviteQRCode';
import { buildPublicInviteEntryUrl } from '@/lib/publicInviteEntryUrl';

type InviteCodeRow = {
  id: string;
  code: string;
  label: string;
  used_count: number;
  max_uses: number;
  is_active: boolean;
  expires_at: string | null;
};

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8);
}

function expiresLocalToIsoOrNull(local: string): string | null {
  const t = local?.trim() ?? '';
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function AdminInviteCodes() {
  const { language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId } = useProperty();

  const [rows, setRows] = useState<InviteCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [disablingId, setDisablingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const [newLabel, setNewLabel] = useState('');
  const [newMaxUses, setNewMaxUses] = useState(5);
  const [newExpiresLocal, setNewExpiresLocal] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrPayload, setQrPayload] = useState<{ title: string; url: string } | null>(null);

  const origin = useMemo(() => (typeof window !== 'undefined' ? window.location.origin : ''), []);

  const load = useCallback(async () => {
    if (!currentPropertyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('property_invite_codes')
      .select('id, code, label, used_count, max_uses, is_active, expires_at')
      .eq('property_id', currentPropertyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setBanner(en ? 'Failed to load public invites.' : '加载公开邀请失败。');
      setRows([]);
    } else {
      setRows((data as InviteCodeRow[]) ?? []);
      setBanner(null);
    }
    setLoading(false);
  }, [currentPropertyId, en]);

  useEffect(() => {
    void load();
  }, [load]);

  const entryUrlForRow = (row: InviteCodeRow): string | null => {
    const pid = currentPropertyId?.trim();
    if (!pid) return null;
    return buildPublicInviteEntryUrl(origin, pid, row.code, 'qr');
  };

  const openQrModal = (row: InviteCodeRow) => {
    const url = entryUrlForRow(row);
    if (!url) {
      setBanner(en ? 'Select a property first.' : '请先选择物业。');
      return;
    }
    setQrPayload({
      title: row.label?.trim() || row.code,
      url,
    });
    setQrOpen(true);
  };

  const copyEntryLink = async (row: InviteCodeRow, key: string) => {
    const url = entryUrlForRow(row);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setBanner(en ? 'Copy failed.' : '复制失败');
    }
  };

  const createNew = async () => {
    if (!currentPropertyId) return;
    setCreating(true);
    setBanner(null);

    const maxUses = Number.isFinite(newMaxUses) ? Math.max(0, Math.floor(newMaxUses)) : 1;
    const expiresAt = expiresLocalToIsoOrNull(newExpiresLocal);

    for (let attempt = 0; attempt < 8; attempt++) {
      const code = generateCode();
      const { error } = await supabase.from('property_invite_codes').insert({
        property_id: currentPropertyId,
        code,
        label: newLabel.trim(),
        max_uses: maxUses,
        used_count: 0,
        is_active: true,
        expires_at: expiresAt,
      });

      if (!error) {
        setNewLabel('');
        setNewMaxUses(5);
        setNewExpiresLocal('');
        setBanner(en ? 'Public invite code created.' : '公开邀请码已创建。');
        setCreating(false);
        void load();
        return;
      }

      if (error.code !== '23505') {
        console.error(error);
        setBanner(error.message ?? (en ? 'Create failed.' : '创建失败。'));
        setCreating(false);
        return;
      }
    }

    setBanner(en ? 'Could not generate a unique code. Try again.' : '无法生成唯一邀请码，请重试。');
    setCreating(false);
  };

  const disableRow = async (id: string) => {
    if (!currentPropertyId) return;
    setDisablingId(id);
    const { error } = await supabase
      .from('property_invite_codes')
      .update({ is_active: false })
      .eq('id', id)
      .eq('property_id', currentPropertyId);

    setDisablingId(null);
    if (error) {
      alert(error.message);
      return;
    }
    void load();
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
    <div className="mx-auto max-w-5xl px-4 py-6">
      <BackButton />
      <div className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-gray-900">
          {en ? 'Public Invite Management' : '公开邀请管理'}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {en
            ? 'Create public codes (property_invite_codes). Share the /entry link for roster binding and join flow.'
            : '管理公开邀请码（property_invite_codes）。分享 /entry 链接，用于扫码入楼与入楼申请。'}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link to="/property-admin/invites" className="font-medium text-[#1D9E75] hover:underline">
            {en ? 'Direct Invite Management' : '定向邀请管理'}
          </Link>
          <Link to="/admin/join-requests" className="font-medium text-[#1D9E75] hover:underline">
            {en ? 'Join requests' : '加入申请审核'}
          </Link>
        </div>
      </div>

      {banner ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          {banner}
        </div>
      ) : null}

      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Plus size={20} className="text-[#1D9E75]" />
          {en ? 'Create public invite code' : '创建公开邀请码'}
        </h2>
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm">
            <span className="text-gray-700">{en ? 'Label' : '标签'}</span>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2"
              placeholder={en ? 'Optional' : '可选'}
            />
          </label>
          <label className="flex w-full max-w-[140px] flex-col gap-1 text-sm">
            <span className="text-gray-700">{en ? 'Max uses' : '最大次数'}</span>
            <input
              type="number"
              min={0}
              value={newMaxUses}
              onChange={(e) => setNewMaxUses(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
            <span className="text-[11px] text-gray-400">{en ? '0 = unlimited' : '0 表示不限'}</span>
          </label>
          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm">
            <span className="text-gray-700">{en ? 'Expires (local, optional)' : '过期时间（本地，可选）'}</span>
            <input
              type="datetime-local"
              value={newExpiresLocal}
              onChange={(e) => setNewExpiresLocal(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <button
            type="button"
            disabled={creating || !currentPropertyId}
            onClick={() => void createNew()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1D9E75] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#188562] disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={18} />}
            {en ? 'Create' : '创建'}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {en
            ? 'Code is auto-generated (6 chars). Entry link format: /entry?propertyId=…&inviteCode=…'
            : '邀请码自动生成（6 位）。链接格式：/entry?propertyId=…&inviteCode=…'}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-gray-700">
              <th className="px-4 py-3 font-semibold">{en ? 'Code' : '邀请码'}</th>
              <th className="px-4 py-3 font-semibold">{en ? 'Label' : '标签'}</th>
              <th className="px-4 py-3 font-semibold">{en ? 'Used / max' : '已用/上限'}</th>
              <th className="px-4 py-3 font-semibold">{en ? 'Expires' : '过期'}</th>
              <th className="px-4 py-3 font-semibold">{en ? 'Active' : '启用'}</th>
              <th className="px-4 py-3 font-semibold text-right">{en ? 'Actions' : '操作'}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#1D9E75]" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  {en ? 'No public invite codes yet.' : '暂无公开邀请码。'}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const ck = `copy-${row.id}`;
                return (
                  <tr key={row.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 font-mono text-gray-900">{row.code}</td>
                    <td className="px-4 py-3 text-gray-800">{row.label || '—'}</td>
                    <td className="px-4 py-3">
                      {row.used_count} / {row.max_uses}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{fmtExp(row.expires_at)}</td>
                    <td className="px-4 py-3">
                      {row.is_active ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                          {en ? 'Yes' : '是'}
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
                          {en ? 'No' : '否'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={!row.is_active || !entryUrlForRow(row)}
                          onClick={() => void copyEntryLink(row, ck)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {copiedKey === ck ? <Check size={16} /> : <Copy size={16} />}
                          {en ? 'Copy entry link' : '复制入楼链接'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openQrModal(row)}
                          disabled={!entryUrlForRow(row)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <QrCode size={16} />
                          {en ? 'QR' : '二维码'}
                        </button>
                        <button
                          type="button"
                          disabled={!row.is_active || disablingId === row.id}
                          onClick={() => void disableRow(row.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                        >
                          {disablingId === row.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Ban size={16} />
                          )}
                          {en ? 'Disable' : '停用'}
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

      {qrOpen && qrPayload ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-qr-title"
          onClick={() => setQrOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="invite-qr-title" className="text-lg font-semibold text-gray-900">
              {qrPayload.title}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {en ? 'Scan or share this /entry link.' : '扫码或分享以下 /entry 入楼链接。'}
            </p>
            <div className="mt-4 flex justify-center">
              <InviteQRCode value={qrPayload.url} />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setQrOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                {en ? 'Close' : '关闭'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
