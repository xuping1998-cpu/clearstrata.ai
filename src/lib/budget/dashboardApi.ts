import { supabase } from '../supabase';

/** 与 DB invoices / procurement_quotes.budget_anomaly_flag 对齐，供 OCR 审计与前端展示 */
export const BUDGET_ANOMALY_CATEGORY_UNMATCHED = 'category_unmatched' as const;

export type DashboardBudgetSummary = {
  fiscal_year: number;
  property_id: string;
  active_package_id: string | null;
  total_budget: number;
  committed: number;
  actual: number;
  budget_utilization: number;
  committed_utilization: number;
  remaining_budget: number;
};

export type DashboardBudgetCategoryRow = {
  category_id: string;
  code: string;
  name_en: string;
  name_zh: string | null;
  budget: number;
  committed: number;
  actual: number;
  remaining: number;
  over_budget: boolean;
};

export type DashboardBudgetCategoriesPayload = {
  fiscal_year: number;
  active_package_id: string | null;
  categories: DashboardBudgetCategoryRow[];
};

export type BudgetTrendMonth = {
  month: number;
  actual: number;
  committed: number;
};

export type DashboardBudgetTrendPayload = {
  fiscal_year: number;
  months: BudgetTrendMonth[];
};

export type BudgetAlert = {
  type: string;
  severity: string;
  title_en: string;
  title_zh: string;
  message_en?: string;
  message_zh?: string;
  link_hint?: string;
  code?: string;
  quote_id?: string;
  invoice_id?: string;
};

export type DashboardBudgetAlertsPayload = {
  fiscal_year: number;
  alerts: BudgetAlert[];
};

function num(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v);
  return 0;
}

function parseSummary(raw: unknown): DashboardBudgetSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  return {
    fiscal_year: num(o.fiscal_year),
    property_id: String(o.property_id ?? ''),
    active_package_id: o.active_package_id == null ? null : String(o.active_package_id),
    total_budget: num(o.total_budget),
    committed: num(o.committed),
    actual: num(o.actual),
    budget_utilization: num(o.budget_utilization),
    committed_utilization: num(o.committed_utilization),
    remaining_budget: num(o.remaining_budget),
  };
}

function parseCategories(raw: unknown): DashboardBudgetCategoriesPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const cats = o.categories;
  const rows: DashboardBudgetCategoryRow[] = [];
  if (Array.isArray(cats)) {
    for (const c of cats) {
      if (!c || typeof c !== 'object') continue;
      const x = c as Record<string, unknown>;
      rows.push({
        category_id: String(x.category_id ?? ''),
        code: String(x.code ?? ''),
        name_en: String(x.name_en ?? ''),
        name_zh: x.name_zh == null ? null : String(x.name_zh),
        budget: num(x.budget),
        committed: num(x.committed),
        actual: num(x.actual),
        remaining: num(x.remaining),
        over_budget: Boolean(x.over_budget),
      });
    }
  }
  return {
    fiscal_year: num(o.fiscal_year),
    active_package_id: o.active_package_id == null ? null : String(o.active_package_id),
    categories: rows,
  };
}

function parseTrend(raw: unknown): DashboardBudgetTrendPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const months: BudgetTrendMonth[] = [];
  if (Array.isArray(o.months)) {
    for (const m of o.months) {
      if (!m || typeof m !== 'object') continue;
      const x = m as Record<string, unknown>;
      months.push({
        month: num(x.month),
        actual: num(x.actual),
        committed: num(x.committed),
      });
    }
  }
  return { fiscal_year: num(o.fiscal_year), months };
}

function parseAlerts(raw: unknown): DashboardBudgetAlertsPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const alerts: BudgetAlert[] = [];
  if (Array.isArray(o.alerts)) {
    for (const a of o.alerts) {
      if (!a || typeof a !== 'object') continue;
      const x = a as Record<string, unknown>;
      alerts.push({
        type: String(x.type ?? ''),
        severity: String(x.severity ?? ''),
        title_en: String(x.title_en ?? ''),
        title_zh: String(x.title_zh ?? ''),
        message_en: x.message_en == null ? undefined : String(x.message_en),
        message_zh: x.message_zh == null ? undefined : String(x.message_zh),
        link_hint: x.link_hint == null ? undefined : String(x.link_hint),
        code: x.code == null ? undefined : String(x.code),
        quote_id: x.quote_id == null ? undefined : String(x.quote_id),
        invoice_id: x.invoice_id == null ? undefined : String(x.invoice_id),
      });
    }
  }
  return { fiscal_year: num(o.fiscal_year), alerts };
}

export async function fetchDashboardBudgetSummary(
  propertyId: string,
  fiscalYear: number
): Promise<{ data: DashboardBudgetSummary | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('dashboard_budget_summary', {
    p_property_id: propertyId,
    p_year: fiscalYear,
  });
  if (error) return { data: null, error: new Error(error.message) };
  return { data: parseSummary(data), error: null };
}

export async function fetchDashboardBudgetCategories(
  propertyId: string,
  fiscalYear: number
): Promise<{ data: DashboardBudgetCategoriesPayload | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('dashboard_budget_categories', {
    p_property_id: propertyId,
    p_year: fiscalYear,
  });
  if (error) return { data: null, error: new Error(error.message) };
  return { data: parseCategories(data), error: null };
}

export async function fetchDashboardBudgetTrend(
  propertyId: string,
  fiscalYear: number
): Promise<{ data: DashboardBudgetTrendPayload | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('dashboard_budget_trend', {
    p_property_id: propertyId,
    p_year: fiscalYear,
  });
  if (error) return { data: null, error: new Error(error.message) };
  return { data: parseTrend(data), error: null };
}

export async function fetchDashboardBudgetAlerts(
  propertyId: string,
  fiscalYear: number
): Promise<{ data: DashboardBudgetAlertsPayload | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('dashboard_budget_alerts', {
    p_property_id: propertyId,
    p_year: fiscalYear,
  });
  if (error) return { data: null, error: new Error(error.message) };
  return { data: parseAlerts(data), error: null };
}

export function formatCurrency(n: number, locale: 'en' | 'zh'): string {
  const loc = locale === 'zh' ? 'zh-CN' : 'en-CA';
  return new Intl.NumberFormat(loc, {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(n);
}
