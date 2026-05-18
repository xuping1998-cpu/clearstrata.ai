import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import {
  computeMarketBenchmark,
  fetchVendorSearchResults,
  hasValidPriceEvidence,
  type VendorEvidenceRow,
} from '../../lib/procurement/vendorMarketBenchmark';

interface AiPricingPanelProps {
  jobId: string;
  propertyId: string;
  language: string;
}

export type TrafficLightResult = {
  color: 'green' | 'yellow' | 'red';
  reason: 'fair' | 'slightly_low' | 'severely_low' | 'slightly_high' | 'severely_high';
};

export function getTrafficLight(
  amount: number,
  low: number,
  high: number,
): TrafficLightResult {
  const lowThreshold50 = low * 0.5;
  const highThreshold120 = high * 1.2;
  const highThreshold150 = high * 1.5;

  if (amount < lowThreshold50) return { color: 'red', reason: 'severely_low' };
  if (amount < low) return { color: 'yellow', reason: 'slightly_low' };
  if (amount <= high) return { color: 'green', reason: 'fair' };
  if (amount <= highThreshold120) return { color: 'green', reason: 'fair' };
  if (amount <= highThreshold150) return { color: 'yellow', reason: 'slightly_high' };
  return { color: 'red', reason: 'severely_high' };
}

export function TrafficLightBadge({
  light,
  language,
}: {
  light: TrafficLightResult;
  language: string;
}) {
  const l = language === 'en';

  const labels: Record<TrafficLightResult['reason'], { en: string; zh: string }> = {
    fair: { en: 'Fair Price', zh: '价格合理' },
    slightly_low: { en: 'Verify Scope', zh: '偏低，请确认范围' },
    severely_low: { en: 'Abnormally Low', zh: '严重偏低，请确认范围' },
    slightly_high: { en: 'Slightly High', zh: '略高，建议确认范围' },
    severely_high: { en: 'Overpriced', zh: '严重偏高，建议重新询价' },
  };

  const colorConfig = {
    green: { bg: 'bg-clearstrata-brand-100', text: 'text-clearstrata-brand-800', dot: 'bg-clearstrata-ui-primary' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
    red: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
  };

  const c = colorConfig[light.color];
  const label = l ? labels[light.reason].en : labels[light.reason].zh;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {label}
    </span>
  );
}

function formatVendorRange(v: VendorEvidenceRow): string {
  const cur = v.price_currency || 'CAD';
  return `${cur} $${Number(v.price_low).toLocaleString()} – $${Number(v.price_high).toLocaleString()}`;
}

export function AiPricingPanel({ jobId, language }: AiPricingPanelProps) {
  const l = language === 'en';
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<VendorEvidenceRow[]>([]);
  const [benchmark, setBenchmark] = useState<ReturnType<typeof computeMarketBenchmark>>({ case: 'none' });

  const loadEvidence = useCallback(async () => {
    setLoading(true);
    const rows = await fetchVendorSearchResults(jobId);
    setVendors(rows);
    setBenchmark(computeMarketBenchmark(rows));
    setLoading(false);
  }, [jobId]);

  useEffect(() => {
    void loadEvidence();
  }, [loadEvidence]);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 text-blue-700">
          <Loader2 className="animate-spin" size={18} />
          <span className="text-sm font-medium">
            {l ? 'Loading public market pricing evidence...' : '正在加载公开市场报价证据...'}
          </span>
        </div>
      </div>
    );
  }

  if (benchmark.case === 'none') {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-blue-600" size={18} />
            <span className="text-sm font-semibold text-blue-900">
              {l ? 'Public Market Pricing Benchmark' : '市场公开报价参考'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void loadEvidence()}
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <RefreshCw size={12} />
            {l ? 'Refresh' : '刷新'}
          </button>
        </div>
        <p className="text-xs text-blue-800/70 mt-2">
          {l ? 'Run supplier search first.' : '尚未执行市场搜索，请先搜索供应商。'}
        </p>
      </div>
    );
  }

  if (benchmark.case === 'no_prices') {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-blue-600" size={18} />
            <span className="text-sm font-semibold text-blue-900">
              {l ? 'Public Market Pricing Benchmark' : '市场公开报价参考'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void loadEvidence()}
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <RefreshCw size={12} />
            {l ? 'Refresh' : '刷新'}
          </button>
        </div>
        <p className="text-sm font-medium text-blue-900">
          {l ? 'Comparable suppliers found' : '已找到可比供应商'}
        </p>
        <p className="text-xs text-blue-800/70 mt-1">
          {l
            ? 'Public pricing unavailable. Formal RFQ required.'
            : '公开价格不可获得，请发送正式询价'}
        </p>
        <p className="text-[11px] text-blue-700/60 mt-1">
          {l
            ? `Based on ${benchmark.vendors.length} comparable supplier(s) on file.`
            : `已记录 ${benchmark.vendors.length} 家可比供应商，暂无公开价格证据。`}
        </p>
      </div>
    );
  }

  const pricedCount = benchmark.pricedVendors.length;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-blue-600" size={18} />
          <span className="text-sm font-semibold text-blue-900">
            {l ? 'Public Market Pricing Benchmark' : '市场公开报价参考'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void loadEvidence()}
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <RefreshCw size={12} />
          {l ? 'Refresh' : '刷新'}
        </button>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-bold text-blue-700">
          CAD ${benchmark.marketLow.toLocaleString()}
        </span>
        <span className="text-gray-500 text-lg">–</span>
        <span className="text-2xl font-bold text-blue-700">
          ${benchmark.marketHigh.toLocaleString()}
        </span>
      </div>

      <p className="text-xs text-blue-800/70 mb-3">
        {l
          ? `Based on ${pricedCount} public comparable supplier quote(s) with verifiable source URLs.`
          : `基于 ${pricedCount} 家具有公开来源 URL 的可比供应商报价。`}
      </p>

      <ul className="space-y-2">
        {benchmark.pricedVendors.map((v) => (
          <li
            key={v.id ?? v.company_name}
            className="bg-white/80 rounded-md px-3 py-2 border border-blue-200/50 text-xs"
          >
            <div className="font-medium text-gray-900">{v.company_name}</div>
            <div className="text-blue-800 mt-0.5">{formatVendorRange(v)}</div>
            {v.price_unit && <div className="text-gray-500">{v.price_unit}</div>}
            {v.price_source_url && (
              <a
                href={v.price_source_url.startsWith('http') ? v.price_source_url : `https://${v.price_source_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline mt-1"
              >
                <ExternalLink size={11} />
                {l ? 'Source' : '来源'}
              </a>
            )}
          </li>
        ))}
      </ul>

      {vendors.some((v) => !hasValidPriceEvidence(v)) && (
        <p className="text-[11px] text-blue-700/60 mt-2">
          {l
            ? 'Other comparable suppliers on file have no public price evidence (formal RFQ required).'
            : '其余可比供应商暂无公开价格证据，需正式询价。'}
        </p>
      )}
    </div>
  );
}
