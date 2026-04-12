import type {
  DashboardAiRiskSummary,
  DashboardKpi,
  DashboardKpisResponse,
  RecentAiAuditInvoiceItem,
} from '../types/dashboard';
import { fetchDashboardBudgetSummary, formatCurrency, type DashboardBudgetSummary } from './budget/dashboardApi';
import { supabase } from './supabase';

function isThisCalendarMonth(isoDate: string): boolean {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

type ResultRow = {
  invoice_id: string;
  risk_score: number;
  risk_level: string;
  updated_at: string;
  over_budget?: boolean | null;
  bypass_approval?: boolean | null;
};

async function loadInvoiceMeta(
  propertyId: string,
  invoiceIds: string[],
): Promise<Map<string, { fiscal_year: number | null; invoice_date: string | null; created_at: string | null }>> {
  const map = new Map<string, { fiscal_year: number | null; invoice_date: string | null; created_at: string | null }>();
  if (invoiceIds.length === 0) return map;
  const CHUNK = 120;
  for (let i = 0; i < invoiceIds.length; i += CHUNK) {
    const slice = invoiceIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('invoices')
      .select('id, fiscal_year, invoice_date, created_at')
      .eq('property_id', propertyId)
      .in('id', slice);
    if (error) {
      console.warn('[dashboard] invoices meta', error.message);
      return map;
    }
    for (const row of data ?? []) {
      map.set(row.id as string, {
        fiscal_year: row.fiscal_year as number | null,
        invoice_date: row.invoice_date as string | null,
        created_at: row.created_at as string | null,
      });
    }
  }
  return map;
}

/**
 * AI risk aggregates from `invoice_ai_audit_results` (synced from AI audits).
 */
export async function fetchDashboardAiRiskSummary(
  propertyId: string,
  fiscalYear: number,
): Promise<DashboardAiRiskSummary | null> {
  try {
    const { data: rows, error } = await supabase
      .from('invoice_ai_audit_results')
      .select('invoice_id, risk_score, risk_level, updated_at, over_budget, bypass_approval')
      .eq('property_id', propertyId);

    if (error) {
      console.warn('[fetchDashboardAiRiskSummary]', error.message);
      return null;
    }

    const list = (rows ?? []) as ResultRow[];
    const invoiceIds = [...new Set(list.map((r) => r.invoice_id))];
    const invMeta = await loadInvoiceMeta(propertyId, invoiceIds);

    const fyRows = list.filter((r) => {
      const m = invMeta.get(r.invoice_id);
      return m && m.fiscal_year != null && Number(m.fiscal_year) === fiscalYear;
    });

    let lastUpdatedAt: string | null = null;
    for (const r of fyRows) {
      if (!r.updated_at) continue;
      if (!lastUpdatedAt || new Date(r.updated_at) > new Date(lastUpdatedAt)) {
        lastUpdatedAt = r.updated_at;
      }
    }

    const score = (r: ResultRow) => Number(r.risk_score) || 0;
    const level = (r: ResultRow) => String(r.risk_level || '').toLowerCase();

    const abnormalInvoiceCount = new Set(
      fyRows.filter((r) => score(r) > 0.6).map((r) => r.invoice_id),
    ).size;

    const monthlyAbnormalInvoices = new Set(
      fyRows.filter((r) => {
        if (score(r) <= 0.6 && !['medium', 'high', 'critical'].includes(level(r))) return false;
        const m = invMeta.get(r.invoice_id);
        const raw = m?.invoice_date || m?.created_at;
        return raw ? isThisCalendarMonth(raw) : false;
      }).map((r) => r.invoice_id),
    ).size;

    const pendingRiskItems = new Set(
      fyRows.filter(
        (r) => score(r) > 0.5 || ['medium', 'high', 'critical'].includes(level(r)),
      ).map((r) => r.invoice_id),
    ).size;

    const highRiskCount = new Set(
      fyRows.filter((r) => level(r) === 'high' || level(r) === 'critical').map((r) => r.invoice_id),
    ).size;

    const criticalRiskCount = new Set(fyRows.filter((r) => level(r) === 'critical').map((r) => r.invoice_id)).size;

    const overBudgetCount = new Set(
      fyRows.filter((r) => r.over_budget === true).map((r) => r.invoice_id),
    ).size;

    const bypassApprovalCount = new Set(
      fyRows.filter((r) => r.bypass_approval === true).map((r) => r.invoice_id),
    ).size;

    return {
      monthlyAbnormalInvoices,
      pendingRiskItems,
      highRiskCount,
      criticalRiskCount,
      abnormalInvoiceCount,
      overBudgetCount,
      bypassApprovalCount,
      lastUpdatedAt,
    };
  } catch (e) {
    console.warn('[fetchDashboardAiRiskSummary]', e);
    return null;
  }
}

/**
 * KPI strip: budget / spend from finance RPC; abnormal + high-risk counts from `invoice_ai_audit_results`.
 */
export async function fetchDashboardKpis(
  propertyId: string,
  year: number,
  language: 'en' | 'zh',
): Promise<DashboardKpisResponse> {
  try {
    const summaryRes = await fetchDashboardBudgetSummary(propertyId, year);
    const summary = summaryRes.data;

    const ai = await fetchDashboardAiRiskSummary(propertyId, year);

    const monthlyAbnormalCount = ai?.monthlyAbnormalInvoices ?? 0;
    const highRiskSlot = ai?.highRiskCount ?? 0;
    const overBudgetSlot = ai?.overBudgetCount ?? 0;
    const bypassSlot = ai?.bypassApprovalCount ?? 0;

    const totalBudget = summary?.total_budget ?? 0;
    const actual = summary?.actual ?? 0;
    const fyHint = language === 'en' ? `FY ${year}` : `${year} 财年`;

    const L = {
      annual_budget: language === 'en' ? 'Annual budget' : '本年预算',
      annual_actual: language === 'en' ? 'Spend (YTD)' : '本年已支出',
      over_budget: language === 'en' ? 'Over budget (hard)' : '超预算（硬约束）',
      over_budget_hint: language === 'en' ? 'Category vs annual line' : '类别相对年度预算线',
      bypass: language === 'en' ? 'Paid w/o approval' : '未审批付款',
      bypass_hint: language === 'en' ? 'Process breach' : '流程违规',
      monthly_abnormal: language === 'en' ? 'Abnormal invoices (this month)' : '本月异常发票',
      monthly_hint: language === 'en' ? 'AI risk score & level' : 'AI 风险评估',
      high_risk: language === 'en' ? 'High-risk (AI)' : '高风险（AI）',
      high_hint: language === 'en' ? 'AI audit — high / critical' : 'AI 审计 · 高/严重',
    };

    const items: DashboardKpi[] = [
      {
        key: 'annual_budget',
        label: L.annual_budget,
        value: formatCurrency(totalBudget, language),
        hint: fyHint,
        link: '/finance?tab=budget',
      },
      {
        key: 'annual_actual',
        label: L.annual_actual,
        value: formatCurrency(actual, language),
        hint: fyHint,
        link: '/finance?tab=invoices',
      },
      {
        key: 'over_budget',
        label: L.over_budget,
        value: overBudgetSlot,
        hint: L.over_budget_hint,
        link: '/finance?tab=invoices',
      },
      {
        key: 'bypass_approval',
        label: L.bypass,
        value: bypassSlot,
        hint: L.bypass_hint,
        link: '/finance?tab=invoices',
      },
      {
        key: 'monthly_abnormal_invoices',
        label: L.monthly_abnormal,
        value: monthlyAbnormalCount,
        hint: L.monthly_hint,
        link: '/finance?tab=invoices',
      },
      {
        key: 'high_risk_alerts',
        label: L.high_risk,
        value: highRiskSlot,
        hint: L.high_hint,
        link: '/finance?tab=invoices',
      },
    ];

    return { items, aiRisk: ai };
  } catch (e) {
    console.error('fetchDashboardKpis failed', e);
    return { items: [], aiRisk: null };
  }
}

/**
 * When `fetchDashboardKpis` is empty, build KPI strip from budget summary + zero AI counts.
 */
export function buildDashboardKpisFromState(
  fiscalYear: number,
  language: 'en' | 'zh',
  summary: DashboardBudgetSummary | null | undefined,
): DashboardKpi[] {
  const totalBudget = summary?.total_budget ?? 0;
  const actual = summary?.actual ?? 0;
  const fyHint = language === 'en' ? `FY ${fiscalYear}` : `${fiscalYear} 财年`;

  const L = {
    annual_budget: language === 'en' ? 'Annual budget' : '本年预算',
    annual_actual: language === 'en' ? 'Spend (YTD)' : '本年已支出',
    over_budget: language === 'en' ? 'Over budget (hard)' : '超预算（硬约束）',
    over_budget_hint: language === 'en' ? 'Category vs annual line' : '类别相对年度预算线',
    bypass: language === 'en' ? 'Paid w/o approval' : '未审批付款',
    bypass_hint: language === 'en' ? 'Process breach' : '流程违规',
    monthly_abnormal: language === 'en' ? 'Abnormal invoices (this month)' : '本月异常发票',
    monthly_hint: language === 'en' ? 'AI risk score & level' : 'AI 风险评估',
    high_risk: language === 'en' ? 'High-risk (AI)' : '高风险（AI）',
    high_hint: language === 'en' ? 'AI audit — high / critical' : 'AI 审计 · 高/严重',
  };

  return [
    {
      key: 'annual_budget',
      label: L.annual_budget,
      value: formatCurrency(totalBudget, language),
      hint: fyHint,
      link: '/finance?tab=budget',
    },
    {
      key: 'annual_actual',
      label: L.annual_actual,
      value: formatCurrency(actual, language),
      hint: fyHint,
      link: '/finance?tab=invoices',
    },
    {
      key: 'over_budget',
      label: L.over_budget,
      value: 0,
      hint: L.over_budget_hint,
      link: '/finance?tab=invoices',
    },
    {
      key: 'bypass_approval',
      label: L.bypass,
      value: 0,
      hint: L.bypass_hint,
      link: '/finance?tab=invoices',
    },
    {
      key: 'monthly_abnormal_invoices',
      label: L.monthly_abnormal,
      value: 0,
      hint: L.monthly_hint,
      link: '/finance?tab=invoices',
    },
    {
      key: 'high_risk_alerts',
      label: L.high_risk,
      value: 0,
      hint: L.high_hint,
      link: '/finance?tab=invoices',
    },
  ];
}

export async function fetchRecentAiAuditInvoices(
  propertyId: string,
  fiscalYear: number,
  limit = 12,
): Promise<{ items: RecentAiAuditInvoiceItem[] }> {
  try {
    const { data: results, error: rErr } = await supabase
      .from('invoice_ai_audit_results')
      .select('invoice_id, risk_score, risk_level, summary, updated_at, over_budget, bypass_approval')
      .eq('property_id', propertyId)
      .or('risk_score.gt.0.6,over_budget.eq.true,bypass_approval.eq.true')
      .order('updated_at', { ascending: false })
      .limit(120);

    if (rErr || !results?.length) {
      if (rErr) console.warn('[fetchRecentAiAuditInvoices]', rErr.message);
      return { items: [] };
    }

    const candidateIds = [...new Set(results.map((r) => r.invoice_id as string))];
    const invMeta = await loadInvoiceMeta(propertyId, candidateIds);
    const fyIds = new Set(
      candidateIds.filter((id) => {
        const m = invMeta.get(id);
        return m && m.fiscal_year != null && Number(m.fiscal_year) === fiscalYear;
      }),
    );

    const resultsFy = results.filter((r) => fyIds.has(r.invoice_id as string)).slice(0, limit);
    const ids = [...new Set(resultsFy.map((r) => r.invoice_id as string))];
    if (ids.length === 0) return { items: [] };

    const { data: invs, error: invErr } = await supabase
      .from('invoices')
      .select('id, vendor_name, total_amount, invoice_date, status')
      .eq('property_id', propertyId)
      .in('id', ids);

    if (invErr) {
      console.warn('[fetchRecentAiAuditInvoices] invoices', invErr.message);
      return { items: [] };
    }

    const invById = new Map((invs ?? []).map((row) => [row.id as string, row]));
    const merged: RecentAiAuditInvoiceItem[] = [];
    for (const r of resultsFy) {
      const iid = r.invoice_id as string;
      const inv = invById.get(iid);
      merged.push({
        invoice_id: iid,
        vendor_name: inv?.vendor_name ?? null,
        total_amount: inv?.total_amount != null ? Number(inv.total_amount) : null,
        invoice_date: inv?.invoice_date ?? null,
        status: inv?.status ?? null,
        risk_level: String(r.risk_level ?? ''),
        risk_score: Number(r.risk_score) || 0,
        summary: String(r.summary ?? '').trim() || '—',
        over_budget: r.over_budget === true,
        bypass_approval: r.bypass_approval === true,
      });
    }
    return { items: merged };
  } catch (e) {
    console.warn('[fetchRecentAiAuditInvoices]', e);
    return { items: [] };
  }
}
