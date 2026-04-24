import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, Loader2, Plus, QrCode, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { InviteQRCode } from '../../components/InviteQRCode';

type InviteRow = {
  id: string;
  code: string;
  label: string;
  unit_no: string | null;
  role: string;
  used_count: number;
  max_uses: number;
  is_active: boolean;
};

type RoleOpt = 'owner' | 'council' | 'manager';

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8);
}

function parseCsvRows(text: string): Array<{ unit_no: string; role: RoleOpt }> {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: Array<{ unit_no: string; role: RoleOpt }> = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && /unit/i.test(line) && /role/i.test(line)) continue;
    const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
    if (parts.length < 1) continue;
    const unit = parts[0];
    const r = (parts[1] || 'owner').toLowerCase() as RoleOpt;
    if (!unit) continue;
    if (r !== 'owner' && r !== 'council' && r !== 'manager') continue;
    out.push({ unit_no: unit, role: r });
  }
  return out;
}

export function OwnerInviteCodesPanel({
  propertyId,
  language,
}: {
  propertyId: string;
  language: 'en' | 'zh';
}) {
  const en = language === 'en';
  const [rows, setRows] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [disablingId, setDisablingId] = useState<string | null>(null);

  const [manualUnit, setManualUnit] = useState('');
  const [manualRole, setManualRole] = useState<RoleOpt>('owner');
  const [manualLabel, setManualLabel] = useState('');
  const [manualMaxUses, setManualMaxUses] = useState(1);

  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(50);
  const [rangePrefix, setRangePrefix] = useState('');
  const [rangeRole, setRangeRole] = useState<RoleOpt>('owner');

  const [qrOpen, setQrOpen] = useState(false);
  const [qrPayload, setQrPayload] = useState<{ title: string; url: string } | null>(null);

  const entryBase = useMemo(
    () => (typeof window !== 'undefined' ? `${window.location.origin}/entry` : '/entry'),
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('property_invite_codes')
      .select('id, code, label, unit_no, role, used_count, max_uses, is_active')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });
    if (error) {
      setBanner(en ? 'Failed to load invite codes.' : '加载邀请码失败。');
      setRows([]);
    } else {
      setRows((data as InviteRow[]) ?? []);
      setBanner(null);
    }
    setLoading(false);
  }, [propertyId, en]);

  useEffect(() => {
    void load();
  }, [load]);

  const insertOne = async (unitNo: string | null, role: RoleOpt, label: string, maxUses: number) => {
    const u = unitNo?.trim() || null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = generateCode();
      const { error } = await supabase.from('property_invite_codes').insert({
        property_id: propertyId,
        code,
        label: label.trim(),
        unit_no: u,
        role,
        max_uses: Math.max(0, Math.floor(maxUses)),
        used_count: 0,
        is_active: true,
      });
      if (!error) return true;
      if (error.code !== '23505') {
        setBanner(error.message ?? (en ? 'Insert failed.' : '插入失败。'));
        return false;
      }
    }
    setBanner(en ? 'Could not allocate a unique code.' : '无法生成唯一邀请码。');
    return false;
  };

  const manualCreate = async () => {
    if (!manualUnit.trim()) {
      setBanner(en ? 'Unit number is required.' : '请填写房号。');
      return;
    }
    setCreating(true);
    setBanner(null);
    const ok = await insertOne(manualUnit, manualRole, manualLabel || manualUnit, manualMaxUses);
    setCreating(false);
    if (ok) {
      setManualUnit('');
      setManualLabel('');
      setManualMaxUses(1);
      setBanner(en ? 'Invite row created.' : '已新增邀请码。');
      void load();
    }
  };

  const onCsv = async (file: File | null) => {
    if (!file) return;
    setBulkBusy(true);
    setBanner(null);
    try {
      const text = await file.text();
      const parsed = parseCsvRows(text);
      if (parsed.length === 0) {
        setBanner(en ? 'No valid CSV rows (need unit_no, role).' : '无有效 CSV 行（需 unit_no, role）。');
        return;
      }
      let ok = 0;
      for (const row of parsed) {
        const inserted = await insertOne(row.unit_no, row.role, row.unit_no, 1);
        if (inserted) ok += 1;
      }
      setBanner(en ? `Imported ${ok} / ${parsed.length} rows.` : `已导入 ${ok} / ${parsed.length} 条。`);
      void load();
    } finally {
      setBulkBusy(false);
    }
  };

  const rangeGenerate = async () => {
    const a = Math.min(rangeStart, rangeEnd);
    const b = Math.max(rangeStart, rangeEnd);
    if (b - a > 2000) {
      setBanner(en ? 'Range too large (max 2000).' : '范围过大（最多 2000 条）。');
      return;
    }
    setBulkBusy(true);
    setBanner(null);
    let ok = 0;
    for (let n = a; n <= b; n++) {
      const unit = `${rangePrefix}${n}`;
      const inserted = await insertOne(unit, rangeRole, unit, 1);
      if (inserted) ok += 1;
    }
    setBulkBusy(false);
    setBanner(en ? `Generated ${ok} codes.` : `已生成 ${ok} 条邀请码。`);
    void load();
  };

  const openQr = (row: InviteRow) => {
    const url = `${entryBase}?propertyId=${encodeURIComponent(propertyId)}&inviteCode=${encodeURIComponent(row.code)}&source=qr`;
    setQrPayload({ title: row.label?.trim() || row.code, url });
    setQrOpen(true);
  };

  const disableRow = async (id: string) => {
    setDisablingId(id);
    const { error } = await supabase
      .from('property_invite_codes')
      .update({ is_active: false })
      .eq('id', id)
      .eq('property_id', propertyId);
    setDisablingId(null);
    if (error) {
      alert(error.message);
      return;
    }
    void load();
  };

  return (
    <div className="space-y-6">
      {banner && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">{banner}</div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {en ? 'Manual add (unit whitelist)' : '手动新增（房号白名单）'}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:items-end">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">{en ? 'Unit no.' : '房号 unit_no'}</span>
            <input
              value={manualUnit}
              onChange={(e) => setManualUnit(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2"
              placeholder="319"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">{en ? 'Role' : '角色'}</span>
            <select
              value={manualRole}
              onChange={(e) => setManualRole(e.target.value as RoleOpt)}
              className="rounded-lg border border-gray-300 px-3 py-2 bg-white"
            >
              <option value="owner">{en ? 'Owner' : '业主'}</option>
              <option value="council">{en ? 'Council' : '业委会'}</option>
              <option value="manager">{en ? 'Manager' : '物业经理'}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">{en ? 'Usage limit' : '使用上限'}</span>
            <input
              type="number"
              min={0}
              value={manualMaxUses}
              onChange={(e) => setManualMaxUses(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">{en ? 'Label (optional)' : '标签（可选）'}</span>
            <input
              value={manualLabel}
              onChange={(e) => setManualLabel(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={creating}
          onClick={() => void manualCreate()}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-medium text-white hover:bg-[#178a66] disabled:opacity-50"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={18} />}
          {en ? 'Create' : '创建'}
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">{en ? 'CSV import' : 'CSV 批量导入'}</h3>
        <p className="text-xs text-gray-500">
          {en ? 'Columns: unit_no, role (header optional). One row per unit.' : '列：unit_no, role（首行可为表头）。每行一个房号。'}
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100">
          <Upload size={16} />
          {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : en ? 'Choose CSV' : '选择 CSV 文件'}
          <input type="file" accept=".csv,text/csv" className="hidden" disabled={bulkBusy} onChange={(e) => void onCsv(e.target.files?.[0] ?? null)} />
        </label>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">{en ? 'Bulk generate by range' : '按数字范围一键生成'}</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="flex flex-col gap-1 text-sm">
            <span>{en ? 'Prefix' : '前缀'}</span>
            <input value={rangePrefix} onChange={(e) => setRangePrefix(e.target.value)} className="w-28 rounded-lg border px-2 py-1.5" placeholder="" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{en ? 'From' : '从'}</span>
            <input type="number" value={rangeStart} onChange={(e) => setRangeStart(Number(e.target.value))} className="w-24 rounded-lg border px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{en ? 'To' : '到'}</span>
            <input type="number" value={rangeEnd} onChange={(e) => setRangeEnd(Number(e.target.value))} className="w-24 rounded-lg border px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{en ? 'Role' : '角色'}</span>
            <select
              value={rangeRole}
              onChange={(e) => setRangeRole(e.target.value as RoleOpt)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 bg-white"
            >
              <option value="owner">owner</option>
              <option value="council">council</option>
              <option value="manager">manager</option>
            </select>
          </label>
          <button
            type="button"
            disabled={bulkBusy}
            onClick={() => void rangeGenerate()}
            className="rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-medium text-white hover:bg-[#178a66] disabled:opacity-50"
          >
            {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin inline" /> : null}
            {en ? 'Generate' : '生成'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 font-semibold">{en ? 'Code' : '邀请码'}</th>
              <th className="px-4 py-3 font-semibold">unit_no</th>
              <th className="px-4 py-3 font-semibold">role</th>
              <th className="px-4 py-3 font-semibold">{en ? 'Label' : '标签'}</th>
              <th className="px-4 py-3 font-semibold">{en ? 'Used / Limit' : '已用 / 上限'}</th>
              <th className="px-4 py-3 font-semibold">{en ? 'Active' : '启用'}</th>
              <th className="px-4 py-3 text-right font-semibold">{en ? 'Actions' : '操作'}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#1D9E75]" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {en ? 'No rows yet.' : '暂无数据。'}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100">
                  <td className="px-4 py-3 font-mono">{row.code}</td>
                  <td className="px-4 py-3">{row.unit_no?.trim() || '—'}</td>
                  <td className="px-4 py-3">{row.role}</td>
                  <td className="px-4 py-3">{row.label || '—'}</td>
                  <td className="px-4 py-3">
                    {row.used_count} / {row.max_uses}
                  </td>
                  <td className="px-4 py-3">{row.is_active ? (en ? 'Yes' : '是') : en ? 'No' : '否'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openQr(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium hover:bg-gray-50"
                      >
                        <QrCode size={14} /> QR
                      </button>
                      <button
                        type="button"
                        disabled={!row.is_active || disablingId === row.id}
                        onClick={() => void disableRow(row.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 disabled:opacity-50"
                      >
                        {disablingId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban size={14} />}
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

      {qrOpen && qrPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setQrOpen(false)} role="dialog">
          <div className="max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">{qrPayload.title}</h2>
            <p className="mt-1 text-xs text-gray-500 break-all">{qrPayload.url}</p>
            <div className="mt-4 flex justify-center">
              <InviteQRCode value={qrPayload.url} />
            </div>
            <button type="button" className="mt-4 w-full rounded-lg border px-4 py-2 text-sm" onClick={() => setQrOpen(false)}>
              {en ? 'Close' : '关闭'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
