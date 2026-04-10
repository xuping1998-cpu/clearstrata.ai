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
  const highRiskCount = alerts.filter((a) => a.severity === 'high').length;
  const monthlyAbnormalCount = abnormalInvoices.filter(isThisMonthInvoice).length;
  const totalBudget = summary?.total_budget ?? 0;
  const actual = summary?.actual ?? 0;
  const fyHint = language === 'en' ? `FY ${fiscalYear}` : `${fiscalYear} 财年`;

  const L = {
    annual_budget: language === 'en' ? 'Annual budget' : '本年预算',
    annual_actual: language === 'en' ? 'Spend (YTD)' : '本年已支出',
    monthly_abnormal: language === 'en' ? 'Abnormal invoices (this month)' : '本月异常发票数',
    monthly_hint: language === 'en' ? 'New this month' : '本月新增',
    high_risk: language === 'en' ? 'High-risk items' : '待处理高风险数',
    high_hint: language === 'en' ? 'Needs priority' : '需优先处理',
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
      value: highRiskCount,
      hint: L.high_hint,
      link: '/finance?tab=invoices&filter=high_risk',
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

/**
 * Home dashboard KPI strip: budget / spend / monthly abnormal count / high-severity alert count.
 * No new backend endpoints; uses existing summary + alerts RPCs and a lightweight invoice count.
 */
export async function fetchDashboardKpis(
  propertyId: string,
  year: number,
  language: 'en' | 'zh'
): Promise<DashboardKpisResponse> {
  try {
    const [summaryRes, alertsRes] = await Promise.all([
      fetchDashboardBudgetSummary(propertyId, year),
      fetchDashboardBudgetAlerts(propertyId, year),
    ]);

    const summary = summaryRes.data;
    const alerts = alertsRes.data?.alerts ?? [];
    const highRiskCount = alerts.filter((a) => a.severity === 'high').length;

    const { start, end } = monthBoundsLocal();
    const { count: monthlyAbnormalCount, error: monthErr } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', propertyId)
      .or('is_abnormal.eq.true,budget_anomaly_flag.not.is.null')
      .gte('created_at', start)
      .lte('created_at', end);

    if (monthErr) {
      console.error('[fetchDashboardKpis] monthly abnormal count', monthErr.message);
    }

    const totalBudget = summary?.total_budget ?? 0;
    const actual = summary?.actual ?? 0;
    const fyHint = language === 'en' ? `FY ${year}` : `${year} 财年`;

    const L = {
      annual_budget: language === 'en' ? 'Annual budget' : '本年预算',
      annual_actual: language === 'en' ? 'Spend (YTD)' : '本年已支出',
      monthly_abnormal: language === 'en' ? 'Abnormal invoices (this month)' : '本月异常发票数',
      monthly_hint: language === 'en' ? 'New this month' : '本月新增',
      high_risk: language === 'en' ? 'High-risk items' : '待处理高风险数',
      high_hint: language === 'en' ? 'Needs priority' : '需优先处理',
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
        value: highRiskCount,
        hint: L.high_hint,
        link: '/finance?tab=invoices&filter=high_risk',
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
