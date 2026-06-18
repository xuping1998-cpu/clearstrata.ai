import { supabase } from '../../lib/supabase';

export type BudgetExpenseVarianceStatus = 'green' | 'yellow' | 'red';

export type BudgetExpenseVariance = {
  property_id: string;
  fiscal_year: number;
  budget_category: string;
  budget_amount: number;
  actual_amount: number;
  variance_amount: number;
  remaining_budget: number;
  variance_percent: number | null;
  invoice_count: number;
  status: BudgetExpenseVarianceStatus;
};

export type MappedExpenseInvoice = {
  invoice_id: string;
  invoice_number: string | null;
  vendor_name: string | null;
  invoice_date: string | null;
  total_amount: number;
  status: string | null;
};

export type BudgetExpenseVarianceSummary = {
  totalBudget: number;
  totalActual: number;
  totalRemaining: number;
  overBudgetCount: number;
};

export async function listBudgetExpenseVariance(
  propertyId: string,
  fiscalYear: number,
): Promise<BudgetExpenseVariance[]> {
  const { data, error } = await supabase
    .from('budget_expense_variance')
    .select(
      'property_id, fiscal_year, budget_category, budget_amount, actual_amount, variance_amount, remaining_budget, variance_percent, invoice_count, status',
    )
    .eq('property_id', propertyId)
    .eq('fiscal_year', fiscalYear)
    .order('variance_percent', { ascending: false, nullsFirst: false });

  if (error || !data) return [];
  return data.map((r) => ({
    property_id: String(r.property_id),
    fiscal_year: Number(r.fiscal_year),
    budget_category: String(r.budget_category),
    budget_amount: Number(r.budget_amount),
    actual_amount: Number(r.actual_amount),
    variance_amount: Number(r.variance_amount),
    remaining_budget: Number(r.remaining_budget),
    variance_percent: r.variance_percent == null ? null : Number(r.variance_percent),
    invoice_count: Number(r.invoice_count),
    status: (r.status as BudgetExpenseVarianceStatus) ?? 'green',
  }));
}

export function summarizeBudgetExpenseVariance(
  rows: BudgetExpenseVariance[],
): BudgetExpenseVarianceSummary {
  return {
    totalBudget: rows.reduce((s, r) => s + r.budget_amount, 0),
    totalActual: rows.reduce((s, r) => s + r.actual_amount, 0),
    totalRemaining: rows.reduce((s, r) => s + r.remaining_budget, 0),
    overBudgetCount: rows.filter((r) => r.status === 'red').length,
  };
}

export async function fetchMappedExpenseInvoices(
  propertyId: string,
  fiscalYear: number,
  budgetCategory: string,
): Promise<MappedExpenseInvoice[]> {
  const { data: mapped, error } = await supabase
    .from('mapped_invoice_actuals')
    .select('invoice_id, vendor_name, invoice_date, total_amount')
    .eq('property_id', propertyId)
    .eq('fiscal_year', fiscalYear)
    .eq('budget_category', budgetCategory)
    .eq('budget_type', 'expense');

  if (error || !mapped?.length) return [];

  const invoiceIds = [...new Set(mapped.map((r) => String(r.invoice_id)))];
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, status')
    .in('id', invoiceIds);

  const invMap = new Map(
    (invoices ?? []).map((i) => [String(i.id), i as { invoice_number?: string | null; status?: string | null }]),
  );

  return mapped
    .map((row) => {
      const inv = invMap.get(String(row.invoice_id));
      return {
        invoice_id: String(row.invoice_id),
        invoice_number: inv?.invoice_number ?? null,
        vendor_name: row.vendor_name != null ? String(row.vendor_name) : null,
        invoice_date: row.invoice_date != null ? String(row.invoice_date) : null,
        total_amount: Number(row.total_amount),
        status: inv?.status ?? null,
      };
    })
    .filter((row) => row.status === 'approved');
}

export async function countExpenseBudgetLines(
  propertyId: string,
  fiscalYear: number,
): Promise<number> {
  const { count, error } = await supabase
    .from('agm_budget_lines')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId)
    .eq('fiscal_year', fiscalYear)
    .eq('budget_type', 'expense');

  return error ? 0 : (count ?? 0);
}

export async function countActiveBudgetMappings(
  propertyId: string,
  fiscalYear: number,
): Promise<number> {
  const { count, error } = await supabase
    .from('budget_category_mappings')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId)
    .eq('fiscal_year', fiscalYear)
    .eq('budget_type', 'expense')
    .eq('is_active', true);

  return error ? 0 : (count ?? 0);
}
