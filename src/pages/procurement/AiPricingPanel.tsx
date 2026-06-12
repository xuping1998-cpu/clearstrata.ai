import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  computeMarketBenchmark,
  fetchVendorSearchResults,
  type VendorEvidenceRow,
} from '../../lib/procurement/vendorMarketBenchmark';

/** When all priced vendors share one non-empty price_unit, return it; else omit unit. */
function unifiedMarketPriceUnit(vendors: VendorEvidenceRow[]): string | null {
  const units = vendors
    .map((v) => (typeof v.price_unit === 'string' ? v.price_unit.trim() : ''))
    .filter(Boolean);
  if (units.length === 0 || units.length !== vendors.length) return null;
  const first = units[0]!;
  return units.every((u) => u === first) ? first : null;
}

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

export function AiPricingPanel({ jobId, language }: AiPricingPanelProps) {
  const l = language === 'en';
  const [loading, setLoading] = useState(true);
  const [benchmark, setBenchmark] = useState<ReturnType<typeof computeMarketBenchmark>>({ case: 'none' });

  const loadEvidence = useCallback(async () => {
    setLoading(true);
    const rows = await fetchVendorSearchResults(jobId);
    setBenchmark(computeMarketBenchmark(rows));
    setLoading(false);
  }, [jobId]);

  useEffect(() => {
    void loadEvidence();
  }, [loadEvidence]);

  useEffect(() => {
    const channel = supabase
      .channel(`vendor_search_results:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendor_search_results',
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          void loadEvidence();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [jobId, loadEvidence]);

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

  if (benchmark.case === 'unreliable') {
    const msg =
      benchmark.reason === 'quotes_too_wide'
        ? l
          ? 'Market quotes vary too widely to form a reliable benchmark.'
          : '市场报价差异过大，暂无法形成有效参考价。'
        : l
          ? 'Not enough comparable quotes to form a reliable benchmark.'
          : '当前可比报价不足，暂无法形成可靠市场参考。';
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
        <p className="text-sm font-medium text-amber-700">{msg}</p>
        <p className="text-[11px] text-blue-700/60 mt-1">
          {l
            ? `${benchmark.vendors.length} comparable supplier(s) on file.`
            : `已记录 ${benchmark.vendors.length} 家可比供应商。`}
        </p>
      </div>
    );
  }

  const pricedCount = benchmark.pricedVendors.length;
  const sharedUnit = benchmark.priceUnit ?? unifiedMarketPriceUnit(benchmark.pricedVendors);
  const rangeCore = `CAD $${benchmark.marketLow.toLocaleString()} – $${benchmark.marketHigh.toLocaleString()}`;
  const rangeDisplay = sharedUnit ? `${rangeCore} / ${sharedUnit}` : rangeCore;

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

      <p className="text-2xl font-bold text-blue-700 mb-1">{rangeDisplay}</p>

      <p className="text-xs text-blue-800/70">
        {l
          ? `Based on ${pricedCount} supplier market reference quote(s).`
          : `基于 ${pricedCount} 家供应商的市场参考报价`}
      </p>
    </div>
  );
}
