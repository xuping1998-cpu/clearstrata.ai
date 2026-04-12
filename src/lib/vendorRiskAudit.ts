import { supabase } from './supabase';
import { runAllHardDetectors } from './vendorRiskHardSignals';
import type { HardSignalCandidate, VendorRiskSignalRow, VendorSignalType } from './vendorRiskTypes';

function normalizeRiskLevel(s: unknown): 'low' | 'medium' | 'high' | 'critical' {
  const x = String(s || '').toLowerCase();
  if (x === 'low' || x === 'medium' || x === 'high' || x === 'critical') return x;
  return 'medium';
}

function clampScore(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

async function explainWithAi(candidate: HardSignalCandidate): Promise<{
  risk_level: string;
  risk_score: number;
  summary_zh: string;
  summary_en: string;
  reasons: unknown[];
  recommendations: unknown[];
}> {
  const { data, error } = await supabase.functions.invoke('explain-vendor-risk-signal', {
    body: {
      vendor_name: candidate.vendor_name,
      signal_type: candidate.signal_type,
      evidence_json: candidate.evidence_json,
      provisional_risk_score: candidate.provisional_risk_score,
    },
  });
  if (error) {
    return {
      risk_level: candidate.provisional_risk_score >= 75 ? 'high' : 'medium',
      risk_score: candidate.provisional_risk_score,
      summary_zh: '基于系统规则引擎与数据指标，建议对该供应商相关支出与采购流程进行人工复核。',
      summary_en: 'Based on rule-based metrics, manual review of this vendor’s spend and procurement flow is suggested.',
      reasons: ['规则引擎已生成结构化证据，建议结合附件进一步核查。'],
      recommendations: ['由物业经理补充市场比价或招标记录（如适用）。', '业委会可抽样复核审批链与支持文件。'],
    };
  }
  const payload = data as { success?: boolean; ai?: Record<string, unknown> } | null;
  const ai = payload?.ai ?? {};
  return {
    risk_level: normalizeRiskLevel(ai.risk_level),
    risk_score: clampScore(ai.risk_score ?? candidate.provisional_risk_score),
    summary_zh: String(ai.summary_zh ?? '').slice(0, 2000),
    summary_en: String(ai.summary_en ?? '').slice(0, 2000),
    reasons: Array.isArray(ai.reasons) ? ai.reasons : [],
    recommendations: Array.isArray(ai.recommendations) ? ai.recommendations : [],
  };
}

async function upsertOpenSignal(
  propertyId: string,
  candidate: HardSignalCandidate,
  ai: {
    risk_level: string;
    risk_score: number;
    summary_zh: string;
    summary_en: string;
    reasons: unknown[];
    recommendations: unknown[];
  },
): Promise<{ ok: boolean; error?: string }> {
  const { data: existing } = await supabase
    .from('vendor_risk_signals')
    .select('id')
    .eq('property_id', propertyId)
    .eq('vendor_name', candidate.vendor_name)
    .eq('signal_type', candidate.signal_type)
    .eq('status', 'open')
    .maybeSingle();

  const row = {
    property_id: propertyId,
    vendor_name: candidate.vendor_name,
    signal_type: candidate.signal_type as VendorSignalType,
    risk_level: ai.risk_level,
    risk_score: ai.risk_score,
    summary_zh: ai.summary_zh,
    summary_en: ai.summary_en,
    evidence_json: candidate.evidence_json,
    ai_reasons: ai.reasons,
    ai_recommendations: ai.recommendations,
    status: 'open' as const,
  };

  if (existing?.id) {
    const { error } = await supabase.from('vendor_risk_signals').update(row).eq('id', existing.id);
    return error ? { ok: false, error: error.message } : { ok: true };
  }
  const { error } = await supabase.from('vendor_risk_signals').insert(row);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * 拉取近 12 月发票与采购数据 → 硬规则 → AI 解释 → 写入 vendor_risk_signals（open 覆盖）。
 */
export async function runVendorRiskScanForProperty(
  propertyId: string,
  options?: { maxSignals?: number; delayMs?: number },
): Promise<{ processed: number; errors: string[] }> {
  const maxSignals = options?.maxSignals ?? 20;
  const delayMs = options?.delayMs ?? 200;
  const errors: string[] = [];
  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

  const [invRes, jobRes] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, vendor_name, total_amount, category, created_at')
      .eq('property_id', propertyId)
      .gte('created_at', since),
    supabase
      .from('procurement_jobs')
      .select('id, category, created_at, selected_quote_id')
      .eq('property_id', propertyId)
      .gte('created_at', since),
  ]);

  if (invRes.error) errors.push(`invoices: ${invRes.error.message}`);
  if (jobRes.error) errors.push(`jobs: ${jobRes.error.message}`);

  const jobs = (jobRes.data ?? []) as {
    id: string;
    category: string | null;
    created_at: string | null;
    selected_quote_id: string | null;
  }[];
  const jobIds = jobs.map((j) => j.id);
  let quotes: {
    id: string;
    job_id: string;
    vendor_name: string;
    quoted_amount: number | null;
  }[] = [];

  if (jobIds.length > 0) {
    const { data: qData, error: qErr } = await supabase
      .from('procurement_quotes')
      .select('id, job_id, vendor_name, quoted_amount')
      .in('job_id', jobIds);
    if (qErr) errors.push(`quotes: ${qErr.message}`);
    else quotes = (qData ?? []) as typeof quotes;
  }

  const invoices = (invRes.data ?? []) as {
    id: string;
    vendor_name: string | null;
    total_amount: number | null;
    category: string | null;
    created_at: string;
  }[];

  const candidates = runAllHardDetectors(invoices, jobs, quotes).slice(0, maxSignals);
  let processed = 0;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]!;
    const ai = await explainWithAi(c);
    const up = await upsertOpenSignal(propertyId, c, ai);
    if (!up.ok) errors.push(`${c.vendor_name}/${c.signal_type}: ${up.error ?? 'save failed'}`);
    else processed += 1;
    if (i < candidates.length - 1 && delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return { processed, errors };
}

export async function fetchVendorRiskSignals(
  propertyId: string,
): Promise<VendorRiskSignalRow[]> {
  const { data, error } = await supabase
    .from('vendor_risk_signals')
    .select('*')
    .eq('property_id', propertyId)
    .eq('status', 'open')
    .order('risk_score', { ascending: false })
    .limit(200);

  if (error) {
    console.warn('[fetchVendorRiskSignals]', error.message);
    return [];
  }
  return (data ?? []) as VendorRiskSignalRow[];
}

export type VendorRiskHomeSummary = {
  totalOpen: number;
  highOrCritical: number;
  needsReview: number;
};

/** 首页轻量：open 信号计数 */
export async function fetchVendorRiskHomeSummary(propertyId: string): Promise<VendorRiskHomeSummary> {
  const { data, error } = await supabase
    .from('vendor_risk_signals')
    .select('risk_level')
    .eq('property_id', propertyId)
    .eq('status', 'open');

  if (error || !data) {
    return { totalOpen: 0, highOrCritical: 0, needsReview: 0 };
  }
  let highOrCritical = 0;
  let needsReview = 0;
  for (const r of data) {
    const lv = String(r.risk_level || '').toLowerCase();
    if (lv === 'high' || lv === 'critical') highOrCritical += 1;
    if (lv === 'medium' || lv === 'high' || lv === 'critical') needsReview += 1;
  }
  return {
    totalOpen: data.length,
    highOrCritical,
    needsReview,
  };
}
