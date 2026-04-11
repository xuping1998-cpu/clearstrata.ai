import type {
  AbnormalInvoiceItem,
  AbnormalInvoicesResponse,
  DashboardKpi,
  DashboardKpisResponse,
} from '../types/dashboard';
import {
  fetchDashboardBudgetAlerts,
  fetchDashboardBudgetSummary,
  formatCurrency,
  type BudgetAlert,
  type DashboardBudgetSummary,
} from './budget/dashboardApi';
import { supabase } from './supabase';

function isThisMonthInvoice(item: AbnormalInvoiceItem): boolean {
  const raw = item.invoice_date || item.created_at;
  if (!raw) return false;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

/**
 * Client-side KPI strip when `fetchDashboardKpis` fails or returns empty.
 * Keeps the home dashboard structure visible without new backend calls.
 */
export function buildDashboardKpisFromState(
  fiscalYear: number,
  language: 'en' | 'zh',
  summary: DashboardBudgetSummary | null | undefined,
  alerts: BudgetAlert[],
  abnormalInvoices: AbnormalInvoiceItem[],
): DashboardKpi[] {
  const pendingRiskCount = alerts.length;
  const monthlyAbnormalCount = abnormalInvoices.filter(isThisMonthInvoice).length;
  const totalBudget = summary?.total_budget ?? 0;
  const actual = summary?.actual ?? 0;
  const fyHint = language === 'en' ? `FY ${fiscalYear}` : `${fiscalYear} 财年`;

  const L = {
    annual_budget: language === 'en' ? 'Annual budget' : '本年预算',
    annual_actual: language === 'en' ? 'Spend (YTD)' : '本年已支出',
    monthly_abnormal: language === 'en' ? 'Abnormal invoices (this month)' : '本月异常发票',
    monthly_hint: language === 'en' ? 'New this month' : '本月新增',
    high_risk: language === 'en' ? 'Open risk items' : '待处理风险事项',
    high_hint: language === 'en' ? 'Alerts & audits' : '含发票、预算与报价',
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
      key: 'monthly_abnormal_invoices',
      label: L.monthly_abnormal,
      value: monthlyAbnormalCount,
      hint: L.monthly_hint,
      link: '/finance?tab=invoices&filter=abnormal&range=this_month',
    },
    {
      key: 'high_risk_alerts',
      label: L.high_risk,
      value: pendingRiskCount,
      hint: L.high_hint,
      link: '/finance',
    },
  ];
}

function monthBoundsLocal(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = new Date(y, m, 1, 0, 0, 0, 0);
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function parseRecentAbnormalRpc(raw: unknown): AbnormalInvoiceItem[] {
  if (!Array.isArray(raw)) return [];
  const out: AbnormalInvoiceItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const id = o.id == null ? '' : String(o.id);
    if (!id) continue;
    out.push({
      id,
      vendor_name: o.vendor_name == null ? null : String(o.vendor_name),
      total_amount: typeof o.total_amount === 'number' ? o.total_amount : Number(o.total_amount) || null,
      status: o.status == null ? null : String(o.status),
      budget_anomaly_flag: o.budget_anomaly_flag == null ? null : String(o.budget_anomaly_flag),
      invoice_date: o.invoice_date == null ? null : String(o.invoice_date),
      created_at: o.created_at == null ? null : String(o.created_at),
      audit_message_zh: o.audit_message_zh == null ? null : String(o.audit_message_zh),
      audit_message_en: o.audit_message_en == null ? null : String(o.audit_message_en),
      audit_rule_code: o.audit_rule_code == null ? null : String(o.audit_rule_code),
      audit_severity: o.audit_severity == null ? null : String(o.audit_severity),
    });
  }
  return out;
}

async function fetchRecentAbnormalInvoicesLegacy(
  propertyId: string,
  year: number
): Promise<AbnormalInvoicesResponse> {
  const { data, error } = await supabase
    .from('invoices')
    .select('id, vendor_name, total_amount, status, budget_anomaly_flag, invoice_date, created_at')
    .eq('property_id', propertyId)
    .eq('fiscal_year', year)
    .or('is_abnormal.eq.true,budget_anomaly_flag.not.is.null')
    .order('invoice_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(12);

  if (error) {
    throw new Error(error.message);
  }

  return {
    items: (data || []) as AbnormalInvoiceItem[],
  };
}

/**
 * Home dashboard KPI strip: budget / spend / monthly abnormal count / high-severity alert count.
 * Uses dashboard_budget_alerts + dashboard_monthly_abnormal_distinct_count (invoice_audit_results V1).
 */
export async function fetchDashboardKpis(
  propertyId: string,
  year: number,
  language: 'en' | 'zh'
): Promise<DashboardKpisResponse> {
  try {
    const [summaryRes, alertsRes, monthRpc] = await Promise.all([
      fetchDashboardBudgetSummary(propertyId, year),
      fetchDashboardBudgetAlerts(propertyId, year),
      supabase.rpc('dashboard_monthly_abnormal_distinct_count', {
        p_property_id: propertyId,
        p_year: year,
      }),
    ]);

    const summary = summaryRes.data;
    const alerts = alertsRes.data?.alerts ?? [];
    const pendingRiskCount = alerts.length;

    let monthlyAbnormalCount = 0;
    const mc = monthRpc.data;
    if (!monthRpc.error && mc != null) {
      monthlyAbnormalCount = typeof mc === 'number' ? mc : Number(mc) || 0;
    } else {
      if (monthRpc.error) {
        console.error('[fetchDashboardKpis] dashboard_monthly_abnormal_distinct_count', monthRpc.error.message);
      }
      const { start, end } = monthBoundsLocal();
      const { count, error: monthErr } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId)
        .or('is_abnormal.eq.true,budget_anomaly_flag.not.is.null')
        .gte('created_at', start)
        .lte('created_at', end);

      if (monthErr) {
        console.error('[fetchDashboardKpis] monthly abnormal count fallback', monthErr.message);
      } else {
        monthlyAbnormalCount = count ?? 0;
      }
    }

    const totalBudget = summary?.total_budget ?? 0;
    const actual = summary?.actual ?? 0;
    const fyHint = language === 'en' ? `FY ${year}` : `${year} 财年`;

    const L = {
      annual_budget: language === 'en' ? 'Annual budget' : '本年预算',
      annual_actual: language === 'en' ? 'Spend (YTD)' : '本年已支出',
      monthly_abnormal: language === 'en' ? 'Abnormal invoices (this month)' : '本月异常发票',
      monthly_hint: language === 'en' ? 'New this month' : '本月新增',
      high_risk: language === 'en' ? 'Open risk items' : '待处理风险事项',
      high_hint: language === 'en' ? 'Alerts & audits' : '含发票、预算与报价',
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
        key: 'monthly_abnormal_invoices',
        label: L.monthly_abnormal,
        value: monthlyAbnormalCount ?? 0,
        hint: L.monthly_hint,
        link: '/finance?tab=invoices&filter=abnormal&range=this_month',
      },
      {
        key: 'high_risk_alerts',
        label: L.high_risk,
        value: pendingRiskCount,
        hint: L.high_hint,
        link: '/finance',
      },
    ];

    return { items };
  } catch (e) {
    console.error('fetchDashboardKpis failed', e);
    return { items: [] };
  }
}

export async function fetchRecentAbnormalInvoices(
  propertyId: string,
  year: number
): Promise<AbnormalInvoicesResponse> {
  const { data, error } = await supabase.rpc('dashboard_recent_abnormal_invoices', {
    p_property_id: propertyId,
    p_year: year,
    p_limit: 12,
  });

  if (!error && data != null) {
    return { items: parseRecentAbnormalRpc(data) };
  }

  if (error) {
    console.warn('[fetchRecentAbnormalInvoices] RPC failed, using legacy query', error.message);
  }
  return fetchRecentAbnormalInvoicesLegacy(propertyId, year);
}
