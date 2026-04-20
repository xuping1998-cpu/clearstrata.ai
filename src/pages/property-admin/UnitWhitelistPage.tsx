import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { useProperty } from '@/contexts/PropertyContext';
import {
  generateBuildingUnitNumbers,
  hasInternalDuplicates,
  type BuildingUnitNumberFormat,
  validateBuildingUnitParams,
} from '@/lib/propertyAdmin/generateBuildingUnitNumbers';

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

/** 去重并 trim，保证导入条数与数据库一致 */
function dedupeUnitList(units: string[]): string[] {
  const m = new Map<string, string>();
  for (const u of units) {
    const t = u.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (!m.has(k)) m.set(k, t);
  }
  return [...m.values()];
}

async function fetchWhitelistCount(propertyId: string): Promise<number> {
  const { count, error } = await supabase
    .from('unit_whitelist')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId);
  if (error) {
    console.error('unit_whitelist count', error);
    return 0;
  }
  return count ?? 0;
}

function downloadUnitsExcel(units: string[], buildingLabel: string) {
  const aoa: string[][] = [['房号'], ...units.map((u) => [u])];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '房号');
  const name = buildingLabel.trim() ? `${buildingLabel.trim()}-房号模板.xlsx` : '房号模板.xlsx';
  XLSX.writeFile(wb, name);
}

function downloadUnitsCsv(units: string[], buildingLabel: string) {
  const body = ['房号', ...units.map((u) => String(u).replace(/\r?\n/g, ''))].join('\r\n');
  const csv = `\uFEFF${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = buildingLabel.trim() ? `${buildingLabel.trim()}-房号模板.csv` : '房号模板.csv';
  a.click();
  URL.revokeObjectURL(url);
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

  const [genStartFloor, setGenStartFloor] = useState(1);
  const [genEndFloor, setGenEndFloor] = useState(12);
  const [genUnitsPerFloor, setGenUnitsPerFloor] = useState(10);
  const [genFormat, setGenFormat] = useState<BuildingUnitNumberFormat>('concat2');
  const [genStartUnit, setGenStartUnit] = useState(1);
  const [genExcluded, setGenExcluded] = useState('');
  const [genBuildingName, setGenBuildingName] = useState('');
  const [generatedUnits, setGeneratedUnits] = useState<string[] | null>(null);
  const [genBusy, setGenBusy] = useState(false);

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

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 8000);
  }, []);

  /**
   * 执行 upsert（调用方已 confirm）。写入前后统计行数：新增 = newCount - oldCount，已存在 = 批次去重后条数 - 新增。
   */
  const performUpsertWhitelistUnits = useCallback(
    async (units: string[], nonNumericForMsg = 0) => {
      if (!currentPropertyId) return false;
      const unique = dedupeUnitList(units);
      if (unique.length === 0) {
        setError('没有可导入的房号');
        return false;
      }

      const oldCount = await fetchWhitelistCount(currentPropertyId);

      for (let i = 0; i < unique.length; i += UPSERT_CHUNK) {
        const chunk = unique.slice(i, i + UPSERT_CHUNK).map((unit_no) => ({
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
          await load();
          return false;
        }
      }

      const newCount = await fetchWhitelistCount(currentPropertyId);
      const inserted = Math.max(0, newCount - oldCount);
      const duplicates = Math.max(0, unique.length - inserted);

      const line1 = `成功导入 ${unique.length} 个房号`;
      const line2 =
        duplicates > 0
          ? `其中 ${duplicates} 个已存在（自动启用）`
          : `全部为新增（共 ${inserted} 个）`;
      const warnMsg = nonNumericForMsg > 0 ? `\n（含 ${nonNumericForMsg} 个非纯数字房号）` : '';
      showToast(`${line1}\n${line2}${warnMsg}`);
      await load();
      return true;
    },
    [currentPropertyId, load, showToast],
  );

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
    const { error: upErr } = await supabase.from('unit_whitelist').update({ is_active: !r.is_active }).eq('id', r.id);
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

      const toImport = dedupeUnitList(units);
      if (toImport.length === 0) {
        setError('没有可导入的房号');
        setFileBusy(false);
        return;
      }

      if (!window.confirm(`即将导入 ${toImport.length} 个房号，是否确认？`)) {
        setFileBusy(false);
        return;
      }

      await performUpsertWhitelistUnits(toImport, nonNumeric);
    } catch (e) {
      console.error(e);
      setError('读取文件失败');
    }
    setFileBusy(false);
  };

  const buildGenParams = () => ({
    startFloor: Number(genStartFloor),
    endFloor: Number(genEndFloor),
    unitsPerFloor: Number(genUnitsPerFloor),
    format: genFormat,
    startUnitPerFloor: Number(genStartUnit),
    excludedFloorsRaw: genExcluded,
  });

  const onGenerateUnits = () => {
    setError(null);
    const params = buildGenParams();
    const v = validateBuildingUnitParams(params);
    if (v) {
      setError(v);
      setGeneratedUnits(null);
      return;
    }
    const list = generateBuildingUnitNumbers(params);
    if (list.length === 0) {
      setError('没有可生成的房号');
      setGeneratedUnits(null);
      return;
    }
    setGeneratedUnits(list);
  };

  const onApplyGeneratedToWhitelist = async () => {
    if (!generatedUnits?.length) return;
    const toApply = dedupeUnitList(generatedUnits);
    if (toApply.length === 0) return;
    if (!window.confirm(`即将导入 ${toApply.length} 个房号，是否确认？`)) {
      return;
    }
    setGenBusy(true);
    setError(null);
    await performUpsertWhitelistUnits(toApply, 0);
    setGenBusy(false);
  };

  const handleGenerateAndImport = async () => {
    setError(null);
    const params = buildGenParams();
    const v = validateBuildingUnitParams(params);
    if (v) {
      setError(v);
      return;
    }
    const units = generateBuildingUnitNumbers(params);
    const toWrite = dedupeUnitList(units);
    if (!toWrite.length) {
      window.alert('没有可生成的房号');
      return;
    }
    if (!window.confirm(`即将生成并导入 ${toWrite.length} 个房号，是否继续？`)) {
      return;
    }
    setGenBusy(true);
    const ok = await performUpsertWhitelistUnits(toWrite, 0);
    setGenBusy(false);
    if (ok) {
      setGeneratedUnits(toWrite);
    }
  };

  const previewDup = generatedUnits ? hasInternalDuplicates(generatedUnits) : false;
  const previewUniqueSize = generatedUnits
    ? new Set(generatedUnits.map((u) => u.toLowerCase())).size
    : 0;

  if (!currentPropertyId) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 text-center text-gray-600">请先选择物业。</div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/property-admin/settings" className="text-sm font-medium text-[#1D9E75] hover:underline">
            ← 物业设置
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
        <div className="mb-4 whitespace-pre-line rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          {toast}
        </div>
      ) : null}

      <div className="mb-8 space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
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

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">自动生成房号模板</h2>
          <p className="mt-1 text-xs text-gray-500">
            按楼层规则生成清单，可下载为与本页「批量导入」相同格式（单列表头「房号」），再上传或直接写入白名单。
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-xs font-medium text-gray-600">
              起始楼层
              <input
                type="number"
                value={genStartFloor}
                onChange={(e) => setGenStartFloor(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                min={-5}
              />
            </label>
            <label className="block text-xs font-medium text-gray-600">
              结束楼层
              <input
                type="number"
                value={genEndFloor}
                onChange={(e) => setGenEndFloor(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-gray-600">
              每层户数
              <input
                type="number"
                value={genUnitsPerFloor}
                onChange={(e) => setGenUnitsPerFloor(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                min={1}
              />
            </label>
            <label className="block text-xs font-medium text-gray-600 sm:col-span-2 lg:col-span-1">
              房号位数规则
              <select
                value={genFormat}
                onChange={(e) => setGenFormat(e.target.value as BuildingUnitNumberFormat)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="concat2">2 位尾号（如 101、304、1203）</option>
                <option value="floorTimes100">3 位尾号（如 1001、1002、1201）</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-gray-600">
              每层起始户号
              <input
                type="number"
                value={genStartUnit}
                onChange={(e) => setGenStartUnit(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                min={0}
              />
            </label>
            <label className="block text-xs font-medium text-gray-600">
              排除楼层（可选）
              <input
                value={genExcluded}
                onChange={(e) => setGenExcluded(e.target.value)}
                placeholder="例如 4,13"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-gray-600 sm:col-span-2">
              楼栋名（可选，用于导出文件名）
              <input
                value={genBuildingName}
                onChange={(e) => setGenBuildingName(e.target.value)}
                placeholder="例如 BCS3736"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onGenerateUnits}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              生成房号
            </button>
            <button
              type="button"
              disabled={genBusy || fileBusy || busy}
              onClick={() => void handleGenerateAndImport()}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
            >
              {genBusy ? '导入中…' : '生成并导入整栋楼'}
            </button>
            {generatedUnits && generatedUnits.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => downloadUnitsExcel(generatedUnits, genBuildingName)}
                  className="rounded-lg border border-[#1D9E75] bg-emerald-50 px-4 py-2 text-sm font-semibold text-[#1D9E75] hover:bg-emerald-100"
                >
                  下载 Excel
                </button>
                <button
                  type="button"
                  onClick={() => downloadUnitsCsv(generatedUnits, genBuildingName)}
                  className="rounded-lg border border-[#1D9E75] bg-emerald-50 px-4 py-2 text-sm font-semibold text-[#1D9E75] hover:bg-emerald-100"
                >
                  下载 CSV
                </button>
                <button
                  type="button"
                  disabled={genBusy || fileBusy || busy}
                  onClick={() => void onApplyGeneratedToWhitelist()}
                  className="rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white hover:bg-[#178f68] disabled:opacity-50"
                >
                  {genBusy ? '写入中…' : '直接填入导入区'}
                </button>
              </>
            ) : null}
          </div>

          {generatedUnits && generatedUnits.length > 0 ? (
            <div className="mt-5 rounded-lg border border-gray-100 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">
                房号预览（共 {generatedUnits.length} 个）
              </h3>
              <p className="mt-1 text-xs text-gray-600">
                去重后条目数：{previewUniqueSize}
                {previewDup || previewUniqueSize !== generatedUnits.length ? (
                  <span className="ml-2 text-amber-700">（存在重复项，请检查参数）</span>
                ) : (
                  <span className="ml-2 text-emerald-700">· 无重复</span>
                )}
              </p>
              <p className="mt-2 font-mono text-xs leading-relaxed text-gray-800">
                {generatedUnits.slice(0, 20).join('、')}
                {generatedUnits.length > 20 ? ' …' : ''}
              </p>
            </div>
          ) : null}
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
