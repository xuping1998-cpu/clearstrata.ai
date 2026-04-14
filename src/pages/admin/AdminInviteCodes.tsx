import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Loader2, Plus, QrCode } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import { supabase } from '../../lib/supabase';
import { BackButton } from '../../components/BackButton';
import { InviteQRCode } from '../../components/InviteQRCode';

type InviteCodeRow = {
  id: string;
  code: string;
  label: string;
  used_count: number;
  max_uses: number;
  is_active: boolean;
};

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8);
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

  const [qrOpen, setQrOpen] = useState(false);
  const [qrPayload, setQrPayload] = useState<{ title: string; url: string } | null>(null);

  const inviteBase = useMemo(
    () => (typeof window !== 'undefined' ? `${window.location.origin}/join` : '/join'),
    [],
  );

  const load = useCallback(async () => {
    if (!currentPropertyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('property_invite_codes')
      .select('id, code, label, used_count, max_uses, is_active')
      .eq('property_id', currentPropertyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setBanner(en ? 'Failed to load invite codes.' : '加载邀请码失败。');
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

  const openQrModal = (row: InviteCodeRow) => {
    const pid = currentPropertyId ?? '';
    const url = pid
      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/entry?propertyId=${encodeURIComponent(pid)}&inviteCode=${encodeURIComponent(row.code)}&source=qr`
      : `${inviteBase}?code=${encodeURIComponent(row.code)}`;
    setQrPayload({
      title: row.label?.trim() || row.code,
      url,
    });
    setQrOpen(true);
  };

  const createNew = async () => {
    if (!currentPropertyId) return;
    setCreating(true);
    setBanner(null);

    const maxUses = Number.isFinite(newMaxUses) ? Math.max(0, Math.floor(newMaxUses)) : 1;

    for (let attempt = 0; attempt < 8; attempt++) {
      const code = generateCode();
      const { error } = await supabase.from('property_invite_codes').insert({
        property_id: currentPropertyId,
        code,
        label: newLabel.trim(),
        max_uses: maxUses,
        used_count: 0,
        is_active: true,
      });

      if (!error) {
        setNewLabel('');
        setNewMaxUses(5);
        setBanner(en ? 'Invite code created.' : '邀请码已创建。');
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <BackButton />
      <div className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-gray-900">
          {en ? 'Invite codes (QR)' : '邀请码（二维码）'}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {en
            ? 'Manage labeled invite codes and share QR links for this property.'
            : '管理带标签的邀请码，并生成本物业的二维码分享链接。'}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link to="/admin/invites" className="font-medium text-[#1D9E75] hover:underline">
            {en ? 'Classic invites' : '经典邀请码'}
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
          {en ? 'New invite code' : '新建邀请码'}
        </h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
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
            ? 'Code is generated automatically (6 alphanumeric characters).'
            : '邀请码将自动生成（6 位字母数字）。'}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-gray-700">
              <th className="px-4 py-3 font-semibold">{en ? 'Code' : '邀请码'}</th>
              <th className="px-4 py-3 font-semibold">{en ? 'Label' : '标签'}</th>
              <th className="px-4 py-3 font-semibold">{en ? 'Used' : '已用'}</th>
              <th className="px-4 py-3 font-semibold">{en ? 'Max' : '上限'}</th>
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
                  {en ? 'No invite codes yet.' : '暂无邀请码。'}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-gray-900">{row.code}</td>
                  <td className="px-4 py-3 text-gray-800">{row.label || '—'}</td>
                  <td className="px-4 py-3">{row.used_count}</td>
                  <td className="px-4 py-3">{row.max_uses}</td>
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
                        onClick={() => openQrModal(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50"
                      >
                        <QrCode size={16} />
                        {en ? 'Generate QR' : '生成二维码'}
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
                        {en ? 'Disable' : '禁用'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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
              {en ? 'Scan or share this link.' : '扫码或分享以下链接。'}
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
