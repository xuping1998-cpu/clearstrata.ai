/**
 * Historical ledger retrospective market benchmark (not formal procurement approval).
 */

import { supabase } from '../supabase';

export const BENCHMARK_SERVICE_TYPES = [
  'strata_management',
  'cleaning',
  'landscaping',
  'snow_removal',
  'elevator_maintenance',
  'fire_inspection',
  'telecom',
  'waste_disposal',
  'security_monitoring',
  'plumbing_repair',
  'hvac_repair',
] as const;

export type BenchmarkServiceType = (typeof BENCHMARK_SERVICE_TYPES)[number];

/** MVP: full ai-pricing benchmark path */
export const BENCHMARK_MVP_SERVICE_TYPES: readonly BenchmarkServiceType[] = [
  'strata_management',
  'telecom',
  'security_monitoring',
];

export type BenchmarkRangeResult = 'below_range' | 'within_range' | 'above_range' | 'unsupported';

export type BenchmarkReviewPayload = {
  serviceType: BenchmarkServiceType | 'unsupported' | null;
  serviceTypeLabelZh: string;
  serviceTypeLabelEn: string;
  confidence: number;
  rationale: string;
  benchmarkLow: number | null;
  benchmarkHigh: number | null;
  currency: string;
  benchmarkBasis: string;
  benchmarkConfidence: string;
  notes: string;
  invoiceAmount: number;
  result: BenchmarkRangeResult;
  variancePercent: number | null;
  supported: boolean;
  generatedAt: string;
  periodLabelZh?: string;
  periodLabelEn?: string;
};

const SERVICE_LABELS: Record<BenchmarkServiceType, { zh: string; en: string }> = {
  strata_management: { zh: '物业管理费', en: 'Strata management fee' },
  cleaning: { zh: '清洁服务', en: 'Cleaning' },
  landscaping: { zh: '园艺景观', en: 'Landscaping' },
  snow_removal: { zh: '除雪服务', en: 'Snow removal' },
  elevator_maintenance: { zh: '电梯维保', en: 'Elevator maintenance' },
  fire_inspection: { zh: '消防检查', en: 'Fire inspection' },
  telecom: { zh: '电信 / 网络', en: 'Telecom / internet' },
  waste_disposal: { zh: '垃圾处理', en: 'Waste disposal' },
  security_monitoring: { zh: '安防监控', en: 'Security monitoring' },
  plumbing_repair: { zh: '管道维修', en: 'Plumbing repair' },
  hvac_repair: { zh: '暖通维修', en: 'HVAC repair' },
};

export function benchmarkServiceLabel(
  type: BenchmarkServiceType | 'unsupported' | null | undefined,
  languageEn: boolean,
): string {
  if (!type || type === 'unsupported') {
    return languageEn ? 'Unclassified' : '未识别';
  }
  const row = SERVICE_LABELS[type];
  return languageEn ? row.en : row.zh;
}

export function parseBenchmarkReviewFromContext(
  contextJson: Record<string, unknown> | null | undefined,
): BenchmarkReviewPayload | null {
  if (!contextJson || typeof contextJson !== 'object') return null;
  const raw = contextJson.benchmarkReview;
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  const generatedAt = typeof b.generatedAt === 'string' ? b.generatedAt : '';
  if (!generatedAt) return null;
  const result = String(b.result ?? 'unsupported') as BenchmarkRangeResult;
  return {
    serviceType: (b.serviceType as BenchmarkReviewPayload['serviceType']) ?? null,
    serviceTypeLabelZh: String(b.serviceTypeLabelZh ?? ''),
    serviceTypeLabelEn: String(b.serviceTypeLabelEn ?? ''),
    confidence: typeof b.confidence === 'number' ? b.confidence : 0,
    rationale: String(b.rationale ?? ''),
    benchmarkLow: typeof b.benchmarkLow === 'number' ? b.benchmarkLow : null,
    benchmarkHigh: typeof b.benchmarkHigh === 'number' ? b.benchmarkHigh : null,
    currency: String(b.currency ?? 'CAD'),
    benchmarkBasis: String(b.benchmarkBasis ?? ''),
    benchmarkConfidence: String(b.benchmarkConfidence ?? ''),
    notes: String(b.notes ?? ''),
    invoiceAmount: typeof b.invoiceAmount === 'number' ? b.invoiceAmount : 0,
    result,
    variancePercent: typeof b.variancePercent === 'number' ? b.variancePercent : null,
    supported: b.supported === true,
    generatedAt,
    periodLabelZh: typeof b.periodLabelZh === 'string' ? b.periodLabelZh : undefined,
    periodLabelEn: typeof b.periodLabelEn === 'string' ? b.periodLabelEn : undefined,
  };
}

export function compareInvoiceToBenchmark(
  amount: number,
  low: number,
  high: number,
): { result: Exclude<BenchmarkRangeResult, 'unsupported'>; variancePercent: number } {
  const mid = (low + high) / 2;
  let result: Exclude<BenchmarkRangeResult, 'unsupported'>;
  if (amount < low) result = 'below_range';
  else if (amount > high) result = 'above_range';
  else result = 'within_range';
  const variancePercent = mid > 0 ? Math.round(((amount - mid) / mid) * 1000) / 10 : 0;
  return { result, variancePercent };
}

export function benchmarkResultLabel(result: BenchmarkRangeResult, languageEn: boolean): string {
  if (result === 'below_range') return languageEn ? 'Below market range' : '低于市场区间';
  if (result === 'within_range') return languageEn ? 'Within market range' : '在市场区间内';
  if (result === 'above_range') return languageEn ? 'Above market range' : '高于市场区间';
  return languageEn ? 'Manual review suggested' : '建议人工复核';
}

export function benchmarkConfidenceLabel(conf: string, languageEn: boolean): string {
  const c = conf.toLowerCase();
  if (c === 'high') return languageEn ? 'High' : '高';
  if (c === 'medium') return languageEn ? 'Medium' : '中';
  if (c === 'low') return languageEn ? 'Low' : '低';
  return conf || (languageEn ? '—' : '—');
}

export type RunHistoricalBenchmarkResponse = {
  success: boolean;
  benchmarkReview?: BenchmarkReviewPayload;
  error?: string;
};

export async function runHistoricalBenchmarkReview(params: {
  invoiceId: string;
  propertyId: string;
  forceRefresh?: boolean;
}): Promise<RunHistoricalBenchmarkResponse> {
  const { data, error } = await supabase.functions.invoke('historical-benchmark-review', {
    body: {
      invoice_id: params.invoiceId,
      property_id: params.propertyId,
      force_refresh: params.forceRefresh === true,
    },
  });
  if (error) {
    return { success: false, error: error.message };
  }
  const payload = data as RunHistoricalBenchmarkResponse & { error?: string } | null;
  if (!payload) {
    return { success: false, error: 'Empty response from benchmark service' };
  }
  if (payload.success === false) {
    return { success: false, error: payload.error ?? 'Benchmark review failed' };
  }
  return payload;
}
