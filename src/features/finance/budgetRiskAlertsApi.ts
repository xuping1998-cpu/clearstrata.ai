import { supabase } from '../../lib/supabase';
import {
  fetchMappedExpenseInvoices,
  type MappedExpenseInvoice,
} from './budgetVarianceApi';
import {
  fetchMappedRevenueTransactions,
  type MappedRevenueTransaction,
} from './revenueReconciliationApi';

export type BudgetRiskAlertType =
  | 'EXPENSE_OVER_BUDGET'
  | 'EXPENSE_NEAR_LIMIT'
  | 'REVENUE_COLLECTION_LOW'
  | 'REVENUE_COLLECTION_CRITICAL'
  | 'UNMAPPED_EXPENSE'
  | 'UNMAPPED_REVENUE'
  | 'NO_ACTIVITY';

export type BudgetRiskAlertSeverity = 'critical' | 'warning' | 'info';

export type BudgetRiskAlert = {
  property_id: string;
  fiscal_year: number;
  alert_type: BudgetRiskAlertType;
  budget_category: string | null;
  severity: BudgetRiskAlertSeverity;
  message: string;
  budget_amount: number;
  actual_amount: number;
  variance_amount: number;
  percent_value: number | null;
  created_at: string;
};

export type BudgetRiskAlertsSummary = {
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  totalCount: number;
};

export type UnmappedExpenseInvoice = {
  invoice_id: string;
  invoice_number: string | null;
  vendor_name: string | null;
  invoice_date: string | null;
  total_amount: number;
};

export type UnmappedRevenueTransaction = {
  bank_transaction_id: string;
  transaction_date: string | null;
  description: string | null;
  amount: number;
};

const SEVERITY_ORDER: Record<BudgetRiskAlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function mapAlertRow(r: Record<string, unknown>): BudgetRiskAlert {
  return {
    property_id: String(r.property_id),
    fiscal_year: Number(r.fiscal_year),
    alert_type: r.alert_type as BudgetRiskAlertType,
    budget_category: r.budget_category != null ? String(r.budget_category) : null,
    severity: (r.severity as BudgetRiskAlertSeverity) ?? 'info',
    message: String(r.message),
    budget_amount: Number(r.budget_amount),
    actual_amount: Number(r.actual_amount),
    variance_amount: Number(r.variance_amount),
    percent_value: r.percent_value == null ? null : Number(r.percent_value),
    created_at: String(r.created_at),
  };
}

function sortAlerts(rows: BudgetRiskAlert[]): BudgetRiskAlert[] {
  return [...rows].sort((a, b) => {
    const sd = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sd !== 0) return sd;
    const pa = a.percent_value ?? -1;
    const pb = b.percent_value ?? -1;
    return pb - pa;
  });
}

export async function listBudgetRiskAlerts(
  propertyId: string,
  fiscalYear: number,
): Promise<BudgetRiskAlert[]> {
  const { data, error } = await supabase
    .from('budget_risk_alerts')
    .select(
      'property_id, fiscal_year, alert_type, budget_category, severity, message, budget_amount, actual_amount, variance_amount, percent_value, created_at',
    )
    .eq('property_id', propertyId)
    .eq('fiscal_year', fiscalYear);

  if (error || !data) return [];
  return sortAlerts(data.map((r) => mapAlertRow(r as Record<string, unknown>)));
}

export function summarizeBudgetRiskAlertsRows(
  rows: BudgetRiskAlert[],
): BudgetRiskAlertsSummary {
  return {
    criticalCount: rows.filter((r) => r.severity === 'critical').length,
    warningCount: rows.filter((r) => r.severity === 'warning').length,
    infoCount: rows.filter((r) => r.severity === 'info').length,
    totalCount: rows.length,
  };
}

export async function summarizeBudgetRiskAlerts(
  propertyId: string,
  fiscalYear: number,
): Promise<BudgetRiskAlertsSummary> {
  const rows = await listBudgetRiskAlerts(propertyId, fiscalYear);
  return summarizeBudgetRiskAlertsRows(rows);
}

export async function fetchUnmappedExpenseInvoices(
  propertyId: string,
  fiscalYear: number,
): Promise<UnmappedExpenseInvoice[]> {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, vendor_name, invoice_date, total_amount, accounting_year, fiscal_year, status')
    .eq('property_id', propertyId)
    .eq('status', 'approved');

  if (error || !invoices?.length) return [];

  const fyFiltered = invoices.filter((inv) => {
    const fy = inv.accounting_year ?? inv.fiscal_year;
    return fy === fiscalYear;
  });
  if (!fyFiltered.length) return [];

  const ids = fyFiltered.map((i) => String(i.id));
  const { data: mapped } = await supabase
    .from('mapped_invoice_actuals')
    .select('invoice_id')
    .in('invoice_id', ids);

  const mappedSet = new Set((mapped ?? []).map((m) => String(m.invoice_id)));

  return fyFiltered
    .filter((inv) => !mappedSet.has(String(inv.id)))
    .map((inv) => ({
      invoice_id: String(inv.id),
      invoice_number: inv.invoice_number != null ? String(inv.invoice_number) : null,
      vendor_name: inv.vendor_name != null ? String(inv.vendor_name) : null,
      invoice_date: inv.invoice_date != null ? String(inv.invoice_date) : null,
      total_amount: Number(inv.total_amount),
    }))
    .sort((a, b) => (b.invoice_date ?? '').localeCompare(a.invoice_date ?? ''));
}

export async function fetchUnmappedRevenueTransactions(
  propertyId: string,
  fiscalYear: number,
): Promise<UnmappedRevenueTransaction[]> {
  const yearStart = `${fiscalYear}-01-01`;
  const yearEnd = `${fiscalYear}-12-31`;

  const { data: txs, error } = await supabase
    .from('bank_transactions')
    .select('id, transaction_date, description, amount')
    .eq('property_id', propertyId)
    .gt('amount', 0)
    .gte('transaction_date', yearStart)
    .lte('transaction_date', yearEnd);

  if (error || !txs?.length) return [];

  const ids = txs.map((t) => String(t.id));
  const { data: mapped } = await supabase
    .from('mapped_bank_transactions')
    .select('bank_transaction_id')
    .in('bank_transaction_id', ids);

  const mappedSet = new Set((mapped ?? []).map((m) => String(m.bank_transaction_id)));

  return txs
    .filter((tx) => !mappedSet.has(String(tx.id)))
    .map((tx) => ({
      bank_transaction_id: String(tx.id),
      transaction_date: tx.transaction_date != null ? String(tx.transaction_date) : null,
      description: tx.description != null ? String(tx.description) : null,
      amount: Number(tx.amount),
    }))
    .sort((a, b) => (b.transaction_date ?? '').localeCompare(a.transaction_date ?? ''));
}

export async function fetchAlertDetailInvoices(
  propertyId: string,
  fiscalYear: number,
  alert: BudgetRiskAlert,
): Promise<MappedExpenseInvoice[]> {
  if (alert.alert_type === 'UNMAPPED_EXPENSE') {
    const unmapped = await fetchUnmappedExpenseInvoices(propertyId, fiscalYear);
    return unmapped.map((inv) => ({
      ...inv,
      status: 'approved',
    }));
  }
  if (!alert.budget_category) return [];
  if (
    alert.alert_type === 'EXPENSE_OVER_BUDGET' ||
    alert.alert_type === 'EXPENSE_NEAR_LIMIT' ||
    alert.alert_type === 'NO_ACTIVITY'
  ) {
    return fetchMappedExpenseInvoices(propertyId, fiscalYear, alert.budget_category);
  }
  return [];
}

export async function fetchAlertDetailTransactions(
  propertyId: string,
  fiscalYear: number,
  alert: BudgetRiskAlert,
): Promise<MappedRevenueTransaction[]> {
  if (alert.alert_type === 'UNMAPPED_REVENUE') {
    const unmapped = await fetchUnmappedRevenueTransactions(propertyId, fiscalYear);
    return unmapped.map((tx) => ({
      bank_transaction_id: tx.bank_transaction_id,
      transaction_date: tx.transaction_date,
      description: tx.description,
      amount: tx.amount,
    }));
  }
  if (!alert.budget_category) return [];
  if (
    alert.alert_type === 'REVENUE_COLLECTION_LOW' ||
    alert.alert_type === 'REVENUE_COLLECTION_CRITICAL' ||
    alert.alert_type === 'NO_ACTIVITY'
  ) {
    return fetchMappedRevenueTransactions(propertyId, fiscalYear, alert.budget_category);
  }
  return [];
}

export function alertTypeLabel(type: BudgetRiskAlertType, en: boolean): string {
  const labels: Record<BudgetRiskAlertType, { en: string; zh: string }> = {
    EXPENSE_OVER_BUDGET: { en: 'Expense Over Budget', zh: '支出超预算' },
    EXPENSE_NEAR_LIMIT: { en: 'Expense Near Limit', zh: '支出接近上限' },
    REVENUE_COLLECTION_LOW: { en: 'Revenue Collection Low', zh: '收入收缴偏低' },
    REVENUE_COLLECTION_CRITICAL: { en: 'Revenue Collection Critical', zh: '收入收缴严重偏低' },
    UNMAPPED_EXPENSE: { en: 'Unmapped Expense', zh: '未映射支出' },
    UNMAPPED_REVENUE: { en: 'Unmapped Revenue', zh: '未映射收入' },
    NO_ACTIVITY: { en: 'No Activity', zh: '长期无活动' },
  };
  return en ? labels[type].en : labels[type].zh;
}

export function recommendedActions(alert: BudgetRiskAlert, en: boolean): string[] {
  switch (alert.alert_type) {
    case 'EXPENSE_OVER_BUDGET':
      return en
        ? ['Renegotiate contract', 'Re-tender procurement', 'Submit to Council for review']
        : ['重新议价', '重新招标', '提交 Council 审核'];
    case 'EXPENSE_NEAR_LIMIT':
      return en
        ? ['Monitor remaining budget', 'Review upcoming invoices', 'Consider Council approval before new spend']
        : ['监控剩余预算', '审查即将到期发票', '新增支出前考虑 Council 审批'];
    case 'REVENUE_COLLECTION_LOW':
    case 'REVENUE_COLLECTION_CRITICAL':
      return en
        ? ['Check owner arrears', 'Verify strata fee collection']
        : ['检查业主欠费', '核对物业费收缴'];
    case 'UNMAPPED_EXPENSE':
      return en ? ['Add budget category mapping for expenses'] : ['新增支出 Budget Mapping'];
    case 'UNMAPPED_REVENUE':
      return en ? ['Add revenue mapping rules'] : ['新增 Revenue Mapping'];
    case 'NO_ACTIVITY':
      return en
        ? ['Confirm category is still in use', 'Review mapping rules if activity expected']
        : ['确认科目是否仍在使用', '若应有活动请检查映射规则'];
    default:
      return [];
  }
}

export function alertRowKey(alert: BudgetRiskAlert): string {
  return `${alert.alert_type}:${alert.budget_category ?? '_'}:${alert.fiscal_year}`;
}
