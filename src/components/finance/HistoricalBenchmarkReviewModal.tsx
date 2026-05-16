import { useCallback, useEffect, useState } from 'react';
import { Loader2, X, RefreshCw } from 'lucide-react';
import {
  type BenchmarkReviewPayload,
  benchmarkConfidenceLabel,
  benchmarkResultLabel,
  benchmarkServiceLabel,
  parseBenchmarkReviewFromContext,
  runHistoricalBenchmarkReview,
} from '../../lib/audit/historicalBenchmarkReview';
import { supabase } from '../../lib/supabase';

type InvoiceLite = {
  id: string;
  vendor_name: string;
  total_amount: number;
  currency?: string | null;
};

type Props = {
  open: boolean;
  invoice: InvoiceLite | null;
  propertyId: string;
  languageEn: boolean;
  onClose: () => void;
};

export function HistoricalBenchmarkReviewModal({ open, invoice, propertyId, languageEn, onClose }: Props) {
  const l = languageEn;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<BenchmarkReviewPayload | null>(null);

  const loadCached = useCallback(async () => {
    if (!invoice?.id || !propertyId) return null;
    const { data } = await supabase
      .from('invoice_ai_audit_contexts')
      .select('context_json')
      .eq('invoice_id', invoice.id)
      .eq('property_id', propertyId)
      .maybeSingle();
    if (data?.context_json && typeof data.context_json === 'object') {
      return parseBenchmarkReviewFromContext(data.context_json as Record<string, unknown>);
    }
    return null;
  }, [invoice?.id, propertyId]);

  const runReview = useCallback(
    async (forceRefresh: boolean) => {
      if (!invoice?.id || !propertyId) return;
      setLoading(true);
      setError(null);
      try {
        if (!forceRefresh) {
          const cached = await loadCached();
          if (cached?.generatedAt) {
            setReview(cached);
            setLoading(false);
            return;
          }
        }
        const res = await runHistoricalBenchmarkReview({
          invoiceId: invoice.id,
          propertyId,
          forceRefresh,
        });
        if (!res.success || !res.benchmarkReview) {
          setError(res.error ?? (l ? 'Benchmark review failed.' : '补询价失败。'));
          setReview(null);
        } else {
          setReview(res.benchmarkReview);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : l ? 'Request failed' : '请求失败');
      } finally {
        setLoading(false);
      }
    },
    [invoice?.id, propertyId, loadCached, l],
  );

  useEffect(() => {
    if (!open || !invoice) {
      setReview(null);
      setError(null);
      return;
    }
    void runReview(false);
  }, [open, invoice?.id, runReview]);

  if (!open || !invoice) return null;

  const periodSuffix = review?.periodLabelEn
    ? l
      ? review.periodLabelEn
      : (review.periodLabelZh ?? review.periodLabelEn)
    : l
      ? 'per billing period'
      : '每账单周期';

  const fmtMoney = (n: number | null) =>
    n == null ? '—' : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const serviceDisplay =
    review?.serviceTypeLabelZh && !l
      ? review.serviceTypeLabelZh
      : review?.serviceTypeLabelEn && l
        ? review.serviceTypeLabelEn
        : benchmarkServiceLabel(review?.serviceType ?? null, l);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={l ? 'Close' : '关闭'}
        onClick={onClose}
      />
      <div className="relative z-[81] w-full max-w-md rounded-xl bg-white shadow-xl ring-1 ring-amber-200/80">
        <div className="flex items-start justify-between gap-2 border-b border-amber-100 bg-amber-50/80 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-amber-950">
              {l ? 'Historical Benchmark Review' : '历史补询价'}
            </h2>
            <p className="mt-0.5 truncate text-xs text-amber-900/75" title={invoice.vendor_name}>
              {invoice.vendor_name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-amber-900/70 hover:bg-amber-100"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="px-4 py-4 text-sm text-gray-800">
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-8 text-amber-900">
              <Loader2 className="size-8 animate-spin" aria-hidden />
              <p className="text-xs">{l ? 'Running market benchmark…' : '正在查询市场 benchmark…'}</p>
            </div>
          ) : error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">{error}</p>
          ) : review && !review.supported ? (
            <div className="space-y-2 py-4 text-center">
              <p className="font-medium text-gray-900">
                {l ? 'Automatic market comparison not available' : '暂不支持自动市场比价'}
              </p>
              <p className="text-xs text-gray-600">{l ? 'Manual review recommended.' : '建议人工复核。'}</p>
              {review.rationale ? (
                <p className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-left text-xs text-gray-500">
                  {review.rationale}
                </p>
              ) : null}
            </div>
          ) : review ? (
            <dl className="space-y-3 text-xs">
              <div>
                <dt className="text-gray-500">{l ? 'Detected service' : '检测服务'}</dt>
                <dd className="font-medium text-gray-900">{serviceDisplay}</dd>
                <dd className="text-[11px] text-gray-500">
                  {l ? 'Confidence' : '置信度'}：{benchmarkConfidenceLabel(review.benchmarkConfidence, l)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">{l ? 'Market reference' : '市场参考'}</dt>
                <dd className="font-semibold tabular-nums text-amber-950">
                  {fmtMoney(review.benchmarkLow)}–{fmtMoney(review.benchmarkHigh)} {review.currency} /{' '}
                  {periodSuffix}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">{l ? 'Invoice amount' : '当前发票'}</dt>
                <dd className="font-semibold tabular-nums text-gray-900">
                  {fmtMoney(review.invoiceAmount)} {invoice.currency ?? review.currency}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">{l ? 'Assessment' : '判断'}</dt>
                <dd className="font-medium text-gray-900">{benchmarkResultLabel(review.result, l)}</dd>
                {review.variancePercent != null ? (
                  <dd className="text-[11px] text-gray-500">
                    {l ? 'Variance vs midpoint' : '相对区间中位'}：{review.variancePercent > 0 ? '+' : ''}
                    {review.variancePercent}%
                  </dd>
                ) : null}
              </div>
              <div className="border-t border-gray-100 pt-3">
                <dt className="text-gray-500">{l ? 'Basis' : '依据'}</dt>
                <dd className="text-[11px] leading-relaxed text-gray-600">
                  {l
                    ? 'AI estimate from current market benchmarks for historical audit reference only — not formal procurement approval.'
                    : 'AI基于当前市场 benchmark 估算，仅供历史审计参考，不代表正式采购审批。'}
                  {review.benchmarkBasis ? (
                    <span className="mt-1 block text-gray-500">{review.benchmarkBasis}</span>
                  ) : null}
                </dd>
              </div>
            </dl>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-4 py-3">
          {review ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => void runReview(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50 disabled:opacity-50"
            >
              <RefreshCw className="size-3.5" aria-hidden />
              {l ? 'Refresh' : '重新询价'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-200"
          >
            {l ? 'Close' : '关闭'}
          </button>
        </div>
      </div>
    </div>
  );
}