import { supabase } from '../../lib/supabase';

export type RevenueReconciliationStatus = 'normal' | 'warning' | 'complete';

export type RevenueReconciliationRow = {
  property_id: string;
  fiscal_year: number;
  category: string;
  budget_amount: number;
  actual_amount: number;
  remaining_amount: number;
  collection_percent: number | null;
  transaction_count: number;
  status: RevenueReconciliationStatus;
};

export type MappedRevenueTransaction = {
  bank_transaction_id: string;
  transaction_date: string | null;
  description: string | null;
  amount: number;
};

export type RevenueReconciliationSummary = {
  totalBudget: number;
  totalActual: number;
  totalRemaining: number;
  collectionPercent: number | null;
  completeCount: number;
};

export async function listRevenueReconciliation(
  propertyId: string,
  fiscalYear: number,
): Promise<RevenueReconciliationRow[]> {
  const { data, error } = await supabase
    .from('budget_revenue_reconciliation')
    .select(
      'property_id, fiscal_year, category, budget_amount, actual_amount, remaining_amount, collection_percent, transaction_count, status',
    )
    .eq('property_id', propertyId)
    .eq('fiscal_year', fiscalYear)
    .order('collection_percent', { ascending: false, nullsFirst: false });

  if (error || !data) return [];
  return data.map((r) => ({
    property_id: String(r.property_id),
    fiscal_year: Number(r.fiscal_year),
    category: String(r.category),
    budget_amount: Number(r.budget_amount),
    actual_amount: Number(r.actual_amount),
    remaining_amount: Number(r.remaining_amount),
    collection_percent: r.collection_percent == null ? null : Number(r.collection_percent),
    transaction_count: Number(r.transaction_count),
    status: (r.status as RevenueReconciliationStatus) ?? 'normal',
  }));
}

export function summarizeRevenueReconciliationRows(
  rows: RevenueReconciliationRow[],
): RevenueReconciliationSummary {
  const totalBudget = rows.reduce((s, r) => s + r.budget_amount, 0);
  const totalActual = rows.reduce((s, r) => s + r.actual_amount, 0);
  const totalRemaining = rows.reduce((s, r) => s + r.remaining_amount, 0);
  return {
    totalBudget,
    totalActual,
    totalRemaining,
    collectionPercent: totalBudget > 0 ? (totalActual / totalBudget) * 100 : null,
    completeCount: rows.filter((r) => r.status === 'complete').length,
  };
}

export async function summarizeRevenueReconciliation(
  propertyId: string,
  fiscalYear: number,
): Promise<RevenueReconciliationSummary> {
  const rows = await listRevenueReconciliation(propertyId, fiscalYear);
  return summarizeRevenueReconciliationRows(rows);
}

export async function fetchMappedRevenueTransactions(
  propertyId: string,
  fiscalYear: number,
  category: string,
): Promise<MappedRevenueTransaction[]> {
  const { data, error } = await supabase
    .from('mapped_bank_transactions')
    .select('bank_transaction_id, transaction_date, description, amount')
    .eq('property_id', propertyId)
    .eq('fiscal_year', fiscalYear)
    .eq('budget_category', category)
    .eq('budget_type', 'revenue')
    .gt('amount', 0)
    .order('transaction_date', { ascending: false });

  if (error || !data) return [];
  return data.map((r) => ({
    bank_transaction_id: String(r.bank_transaction_id),
    transaction_date: r.transaction_date != null ? String(r.transaction_date) : null,
    description: r.description != null ? String(r.description) : null,
    amount: Number(r.amount),
  }));
}

export async function countRevenueBudgetLines(
  propertyId: string,
  fiscalYear: number,
): Promise<number> {
  const { count, error } = await supabase
    .from('agm_budget_lines')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId)
    .eq('fiscal_year', fiscalYear)
    .eq('budget_type', 'revenue');

  return error ? 0 : (count ?? 0);
}

export async function countActiveRevenueMappings(
  propertyId: string,
  fiscalYear: number,
): Promise<number> {
  const { count, error } = await supabase
    .from('budget_category_mappings')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId)
    .eq('fiscal_year', fiscalYear)
    .eq('budget_type', 'revenue')
    .eq('is_active', true);

  return error ? 0 : (count ?? 0);
}
