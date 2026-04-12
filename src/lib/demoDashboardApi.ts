import { supabase } from './supabase';
import type { DashboardAiRiskSummary, DashboardKpi, RecentAiAuditInvoiceItem } from '../types/dashboard';
import { formatCurrency } from './budget/dashboardApi';
import type { DashboardBudgetSummary } from './budget/dashboardApi';

function num(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v);
  return 0;
}

function parseBudgetSummary(raw: unknown): DashboardBudgetSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.ok === false) return null;
  const scopeRaw = o.budget_scope;
  const budget_scope =
    scopeRaw === 'package' ? 'package' : scopeRaw === 'property_year' ? 'property_year' : undefined;
  return {
    fiscal_year: num(o.fiscal_year),
    property_id: String(o.property_id ?? ''),
    active_package_id: o.active_package_id == null ? null : String(o.active_package_id),
    budget_scope,
    total_budget: num(o.total_budget),
    committed: num(o.committed),
    actual: num(o.actual),
    budget_utilization: num(o.budget_utilization),
    committed_utilization: num(o.committed_utilization),
    remaining_budget: num(o.remaining_budget),
  };
}

/** Demo home: budget summary via public RPC (BCS3736 allowlist). */
export async function fetchDemoDashboardBudgetSummary(
  propertyCode: string,
  fiscalYear: number,
): Promise<{ data: DashboardBudgetSummary | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('demo_dashboard_budget_summary', {
    p_code: propertyCode,
    p_year: fiscalYear,
  });
  if (error) {
    return { data: null, error: new Error(error.message) };
  }
  const raw = data as Record<string, unknown> | null;
  if (raw && raw.ok === false) {
    return { data: null, error: new Error(String(raw.message ?? 'not_found')) };
  }
  return { data: parseBudgetSummary(data), error: null };
}

function parseAiRisk(raw: unknown): DashboardAiRiskSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  return {
    monthlyAbnormalInvoices: num(o.monthlyAbnormalInvoices),
    pendingRiskItems: num(o.pendingRiskItems),
    highRiskCount: num(o.highRiskCount),
    criticalRiskCount: num(o.criticalRiskCount),
    abnormalInvoiceCount: num(o.abnormalInvoiceCount),
    overBudgetCount: num(o.overBudgetCount),
    bypassApprovalCount: num(o.bypassApprovalCount),
    lastUpdatedAt: o.lastUpdatedAt == null ? null : String(o.lastUpdatedAt),
  };
}

function parseRecentItems(raw: unknown): RecentAiAuditInvoiceItem[] {
  if (!Array.isArray(raw)) return [];
  const out: RecentAiAuditInvoiceItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    out.push({
      invoice_id: String(r.invoice_id ?? ''),
      vendor_name: r.vendor_name == null ? null : String(r.vendor_name),
      total_amount: r.total_amount == null ? null : Number(r.total_amount),
      invoice_date: r.invoice_date == null ? null : String(r.invoice_date),
      status: r.status == null ? null : String(r.status),
      risk_level: String(r.risk_level ?? ''),
      risk_score: num(r.risk_score),
      summary: String(r.summary ?? '').trim() || '—',
      over_budget: r.over_budget === true,
      bypass_approval: r.bypass_approval === true,
    });
  }
  return out;
}

export async function fetchDemoAiHomeSnapshot(
  propertyCode: string,
  fiscalYear: number,
  recentLimit = 12,
): Promise<{
  aiRisk: DashboardAiRiskSummary | null;
  recentItems: RecentAiAuditInvoiceItem[];
  error: Error | null;
}> {
  const { data, error } = await supabase.rpc('demo_ai_home_snapshot', {
    p_code: propertyCode,
    p_fiscal_year: fiscalYear,
    p_recent_limit: recentLimit,
  });
  if (error) {
    return { aiRisk: null, recentItems: [], error: new Error(error.message) };
  }
  const raw = data as Record<string, unknown> | null;
  if (raw && raw.ok === false) {
    return { aiRisk: null, recentItems: [], error: new Error(String(raw.message ?? 'not_found')) };
  }
  return {
    aiRisk: parseAiRisk(raw?.aiRisk),
    recentItems: parseRecentItems(raw?.recentItems),
    error: null,
  };
}

/** KPI strip aligned with `fetchDashboardKpis` for demo RPC data. */
export function buildDemoDashboardKpis(
  fiscalYear: number,
  language: 'en' | 'zh',
  summary: DashboardBudgetSummary | null,
  ai: DashboardAiRiskSummary | null,
): DashboardKpi[] {
  const totalBudget = summary?.total_budget ?? 0;
  const actual = summary?.actual ?? 0;
  const fyHint = language === 'en' ? `FY ${fiscalYear}` : `${fiscalYear} 财年`;
  const monthlyAbnormalCount = ai?.monthlyAbnormalInvoices ?? 0;
  const highRiskSlot = ai?.highRiskCount ?? 0;
  const overBudgetSlot = ai?.overBudgetCount ?? 0;
  const bypassSlot = ai?.bypassApprovalCount ?? 0;

  const L =
    language === 'en'
      ? {
          annual_budget: 'Annual budget',
          annual_actual: 'Spend (YTD)',
          over_budget: 'Over budget (hard)',
          over_budget_hint: 'Category vs annual line',
          bypass: 'Paid w/o approval',
          bypass_hint: 'Process breach',
          monthly_abnormal: 'Abnormal invoices (this month)',
          monthly_hint: 'AI risk score & level',
          high_risk: 'High-risk (AI)',
          high_hint: 'AI audit — high / critical',
        }
      : {
          annual_budget: '本年预算',
          annual_actual: '本年已支出',
          over_budget: '超预算（硬约束）',
          over_budget_hint: '类别相对年度预算线',
          bypass: '未审批付款',
          bypass_hint: '流程违规',
          monthly_abnormal: '本月异常发票',
          monthly_hint: 'AI 风险评估',
          high_risk: '高风险（AI）',
          high_hint: 'AI 审计 · 高/严重',
        };

  return [
    {
      key: 'annual_budget',
      label: L.annual_budget,
      value: formatCurrency(totalBudget, language),
      hint: fyHint,
      link: '/demo/finance?tab=summary',
    },
    {
      key: 'annual_actual',
      label: L.annual_actual,
      value: formatCurrency(actual, language),
      hint: fyHint,
      link: '/demo/finance?tab=summary',
    },
    {
      key: 'over_budget',
      label: L.over_budget,
      value: overBudgetSlot,
      hint: L.over_budget_hint,
      link: '/demo/finance?tab=summary',
    },
    {
      key: 'bypass_approval',
      label: L.bypass,
      value: bypassSlot,
      hint: L.bypass_hint,
      link: '/demo/finance?tab=summary',
    },
    {
      key: 'monthly_abnormal_invoices',
      label: L.monthly_abnormal,
      value: monthlyAbnormalCount,
      hint: L.monthly_hint,
      link: '/demo/finance?tab=summary',
    },
    {
      key: 'high_risk_alerts',
      label: L.high_risk,
      value: highRiskSlot,
      hint: L.high_hint,
      link: '/demo/finance?tab=summary',
    },
  ];
}
