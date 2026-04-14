import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { useProperty } from '@/contexts/PropertyContext';

type WhitelistRow = {
  id: string;
  property_id: string;
  unit_no: string;
  is_active: boolean;
  created_at: string;
};

const UPSERT_CHUNK = 250;

function normalizeUnit(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .replace(/\s+/g, '');
}

function parseUnitsFromWorkbook(data: ArrayBuffer): { units: string[]; nonNumeric: number } {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('empty_workbook');
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error('empty_sheet');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
  }) as unknown[][];
  const seen = new Set<string>();
  const units: string[] = [];
  let nonNumeric = 0;
  for (const row of rows) {
    const cell = Array.isArray(row) ? row[0] : undefined;
    const u = normalizeUnit(cell);
    if (!u) continue;
    if (/^\d+$/.test(u) === false) nonNumeric += 1;
    const key = u.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    units.push(u);
  }
  return { units, nonNumeric };
}

export function UnitWhitelistPage() {
  const { currentPropertyId } = useProperty();
  const [rows, setRows] = useState<WhitelistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentPropertyId) return;
    setLoading(true);
    setError(null);
    const { data, error: selErr } = await supabase
      .from('unit_whitelist')
      .select('id,property_id,unit_no,is_active,created_at')
      .eq('property_id', currentPropertyId)
      .order('unit_no', { ascending: true });
    if (selErr) {
      console.error('unit_whitelist select', selErr);
      setError(selErr.message || '加载失败');
      setRows([]);
    } else {
      setRows((data ?? []) as WhitelistRow[]);
    }
    setLoading(false);
  }, [currentPropertyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.unit_no.toLowerCase().includes(q));
  }, [rows, search]);

  const activeCount = useMemo(() => rows.filter((r) => r.is_active).length, [rows]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 5000);
  };

  const onAddManual = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentPropertyId) return;
    const u = manual.trim();
    if (!u) {
      setError('请输入房号');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: insErr } = await supabase.from('unit_whitelist').insert({
      property_id: currentPropertyId,
      unit_no: u,
      is_active: true,
    });
    setBusy(false);
    if (insErr) {
      if (insErr.code === '23505') {
        setError('该房号已在列表中');
      } else {
        setError(insErr.message || '添加失败');
      }
      return;
    }
    setManual('');
    showToast('已添加房号');
    await load();
  };

  const onDelete = async (id: string) => {
    if (!window.confirm('确定从白名单删除该房号？')) return;
    setBusy(true);
    setError(null);
    const { error: delErr } = await supabase.from('unit_whitelist').delete().eq('id', id);
    setBusy(false);
    if (delErr) {
      setError(delErr.message || '删除失败');
      return;
    }
    showToast('已删除');
    await load();
  };

  const onToggleActive = async (r: WhitelistRow) => {
    setBusy(true);
    setError(null);
    const { error: upErr } = await supabase
      .from('unit_whitelist')
      .update({ is_active: !r.is_active, updated_at: new Date().toISOString() })
      .eq('id', r.id);
    setBusy(false);
    if (upErr) {
      setError(upErr.message || '更新失败');
      return;
    }
    showToast(r.is_active ? '已禁用' : '已重新启用');
    await load();
  };

  const onFile = async (file: File | null) => {
    if (!file || !currentPropertyId) return;
    setFileBusy(true);
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      let units: string[];
      let nonNumeric = 0;
      try {
        const parsed = parseUnitsFromWorkbook(buf);
        units = parsed.units;
        nonNumeric = parsed.nonNumeric;
      } catch (e) {
        console.error(e);
        setError('文件格式错误或无法读取工作表');
        setFileBusy(false);
        return;
      }
      if (units.length === 0) {
        setError('文件中没有有效房号（请使用第一列，每行一个房号）');
        setFileBusy(false);
        return;
      }

      const { data: existingRows } = await supabase
        .from('unit_whitelist')
        .select('unit_no')
        .eq('property_id', currentPropertyId);
      const existing = new Set(
        (existingRows ?? []).map((x: { unit_no: string }) => String(x.unit_no).trim().toLowerCase()),
      );
      const already = units.filter((u) => existing.has(u.toLowerCase())).length;

      let written = 0;
      for (let i = 0; i < units.length; i += UPSERT_CHUNK) {
        const chunk = units.slice(i, i + UPSERT_CHUNK).map((unit_no) => ({
          property_id: currentPropertyId,
          unit_no,
          is_active: true,
        }));
        const { error: upErr } = await supabase.from('unit_whitelist').upsert(chunk, {
          onConflict: 'property_id,unit_no',
        });
        if (upErr) {
          console.error('unit_whitelist upsert', upErr);
          setError(upErr.message || '批量写入失败');
          setFileBusy(false);
          await load();
          return;
        }
        written += chunk.length;
      }

      const skippedMsg =
        already > 0 ? `；其中约 ${already} 条与已有房号重复，已合并为启用状态` : '';
      const warnMsg = nonNumeric > 0 ? `（含 ${nonNumeric} 个非纯数字房号，已一并导入）` : '';
      showToast(`成功处理 ${written} 条${skippedMsg}${warnMsg}`);
      await load();
    } catch (e) {
      console.error(e);
      setError('读取文件失败');
    }
    setFileBusy(false);
  };

  if (!currentPropertyId) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 text-center text-gray-600">请先选择物业。</div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/property-admin" className="text-sm font-medium text-[#1D9E75] hover:underline">
            ← 物业后台
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">房号白名单</h1>
          <p className="mt-1 text-sm text-gray-600">
            维护可扫码 / 绑定的房号。当本物业存在至少一条<strong>启用</strong>记录时，仅列表内房号可通过营销扫码与住户绑定。
          </p>
        </div>
        <p className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-800">
          当前已录入房号：<span className="font-semibold text-[#1D9E75]">{rows.length}</span> 个（启用{' '}
          <span className="font-semibold">{activeCount}</span> 个）
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</div>
      ) : null}
      {toast ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          {toast}
        </div>
      ) : null}

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">手动添加</h2>
          <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={onAddManual}>
            <div className="min-w-[160px] flex-1">
              <label htmlFor="unit-manual" className="block text-xs font-medium text-gray-500">
                输入房号
              </label>
              <input
                id="unit-manual"
                value={manual}
                onChange={(ev) => setManual(ev.target.value)}
                placeholder="例如 304"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-[#1D9E75]/30 focus:border-[#1D9E75] focus:ring-2"
                disabled={busy}
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white hover:bg-[#178f68] disabled:opacity-50"
            >
              添加
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Excel / CSV 批量导入</h2>
          <p className="mt-1 text-xs text-gray-500">第一列为房号；支持 .xlsx、.xls、.csv</p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            disabled={fileBusy}
            className="mt-3 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#1D9E75] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#178f68]"
            onChange={(ev) => {
              const f = ev.target.files?.[0] ?? null;
              ev.target.value = '';
              void onFile(f);
            }}
          />
          {fileBusy ? <p className="mt-2 text-xs text-gray-500">正在导入…</p> : null}
        </section>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-600">
          搜索房号
          <input
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
            placeholder="过滤列表…"
            className="ml-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]"
          />
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="text-sm font-medium text-[#1D9E75] hover:underline"
        >
          刷新
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16 text-gray-500">加载中…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">房号</th>
                  <th className="px-4 py-3">是否启用</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-gray-500">
                      {rows.length === 0 ? '暂无记录，请添加或导入房号。' : '无匹配结果。'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-mono font-medium text-gray-900">{r.unit_no}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            r.is_active ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800' : 'rounded-full bg-gray-200 px-2 py-0.5 text-gray-600'
                          }
                        >
                          {r.is_active ? '启用' : '已禁用'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onToggleActive(r)}
                          className="mr-2 text-[#1D9E75] hover:underline disabled:opacity-50"
                        >
                          {r.is_active ? '禁用' : '启用'}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onDelete(r.id)}
                          className="text-red-600 hover:underline disabled:opacity-50"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
