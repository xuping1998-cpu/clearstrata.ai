import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, Loader2, RefreshCw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useProperty } from '../contexts/PropertyContext';
import { fetchVendorRiskSignals, runVendorRiskScanForProperty } from '../lib/vendorRiskAudit';
import type { VendorRiskSignalRow } from '../lib/vendorRiskTypes';

const SIGNAL_LABELS_ZH: Record<string, string> = {
  price_outlier_persistent: '长期价格偏高（规则）',
  vendor_concentration_high: '支出集中度偏高',
  quote_competition_weak: '报价竞争偏弱',
  relationship_risk_pattern: '关系风险模式（需复核）',
};

const SIGNAL_LABELS_EN: Record<string, string> = {
  price_outlier_persistent: 'Persistent price outlier (rules)',
  vendor_concentration_high: 'High spend concentration',
  quote_competition_weak: 'Weak quote competition',
  relationship_risk_pattern: 'Relationship risk pattern (review)',
};

function riskBadgeClass(level: string): string {
  const x = level.toLowerCase();
  if (x === 'critical' || x === 'high') return 'bg-red-100 text-red-900';
  if (x === 'medium') return 'bg-amber-100 text-amber-950';
  return 'bg-slate-100 text-slate-800';
}

export function VendorRiskSignals() {
  const { language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId } = useProperty();
  const [rows, setRows] = useState<VendorRiskSignalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentPropertyId) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await fetchVendorRiskSignals(currentPropertyId);
      setRows(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [currentPropertyId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleScan() {
    if (!currentPropertyId) return;
    setScanning(true);
    setScanMsg(null);
    try {
      const r = await runVendorRiskScanForProperty(currentPropertyId, { maxSignals: 18, delayMs: 250 });
      setScanMsg(
        en
          ? `Updated ${r.processed} signal(s).${r.errors.length ? ' Some errors logged.' : ''}`
          : `已处理 ${r.processed} 条信号。${r.errors.length ? ' 部分步骤有错误。' : ''}`,
      );
      if (r.errors.length) console.warn('vendor risk scan', r.errors);
      await load();
    } catch (e) {
      setScanMsg(en ? 'Scan failed.' : '扫描失败。');
    } finally {
      setScanning(false);
    }
  }

  if (!currentPropertyId) {
    return (
      <div className="p-6 text-gray-600">{en ? 'Select a property first.' : '请先选择物业。'}</div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:underline"
        >
          <ChevronLeft className="size-4" />
          {en ? 'Home' : '首页'}
        </Link>
        <button
          type="button"
          onClick={() => void handleScan()}
          disabled={scanning}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          {scanning ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {en ? 'Run data scan + AI' : '运行数据扫描与 AI 解释'}
        </button>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">
        {en ? 'Vendor risk signals' : '供应商风险信号'}
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        {en
          ? 'Risk hints from data patterns and AI wording — not legal findings. Use for board review and follow-up only.'
          : '以下为基于数据模式与 AI 整理的风险提示，不构成违法或不当行为认定，仅供业委会与物业复核使用。'}
      </p>

      {scanMsg ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          {scanMsg}
        </div>
      ) : null}
      {err ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-10 flex justify-center text-gray-500">
          <Loader2 className="size-8 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-6 py-10 text-center text-gray-600">
          {en ? 'No open vendor risk signals. Run a scan after invoices and procurement data exist.' : '暂无未关闭的供应商风险信号。有发票与采购数据后可点击上方扫描。'}
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-lg font-semibold text-gray-900">{r.vendor_name}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {(en ? SIGNAL_LABELS_EN : SIGNAL_LABELS_ZH)[r.signal_type] ?? r.signal_type}
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${riskBadgeClass(r.risk_level)}`}>
                  {r.risk_level}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-800">
                {en ? r.summary_en || r.summary_zh : r.summary_zh}
              </p>
              <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600">
                <span className="font-semibold text-gray-700">{en ? 'Evidence (JSON)' : '证据摘要（JSON）'}: </span>
                <code className="break-all">{JSON.stringify(r.evidence_json)}</code>
              </div>
              {Array.isArray(r.ai_recommendations) && r.ai_recommendations.length > 0 ? (
                <ul className="mt-3 list-inside list-disc text-sm text-gray-700">
                  {r.ai_recommendations.slice(0, 8).map((x, i) => (
                    <li key={i}>{String(x)}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default VendorRiskSignals;
