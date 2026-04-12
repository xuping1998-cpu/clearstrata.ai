import { supabase } from './supabase';

export type BudgetCheckInput = {
  id?: string;
  property_id: string;
  fiscal_year: number | null;
  budget_category_id: string | null;
  total_amount: number | unknown;
};

export type BudgetCheckResult = {
  /** Active annual budget cap for this category & FY (0 if none). */
  budget: number;
  /** Sum of total_amount for same property, FY, category excluding current invoice (when id set). */
  spentBefore: number;
  /** Cumulative after including current invoice amount. */
  after: number;
  /** Hard: after > budget when budget line exists and budget > 0. */
  overBudget: boolean;
  /** No matching active budget line — cannot assert overage. */
  noBudgetLine: boolean;
};

/**
 * Hard budget truth: compare category YTD spend (including this invoice) to active annual_budgets line.
 * Uses `total_amount` and `budget_category_id` + `fiscal_year` (matches SaaS schema).
 */
export async function checkBudget(invoice: BudgetCheckInput): Promise<BudgetCheckResult> {
  const amount = Number(invoice.total_amount);
  const amt = Number.isFinite(amount) ? amount : 0;
  const pid = invoice.property_id;
  const fy = invoice.fiscal_year;
  const catId = invoice.budget_category_id;

  if (!catId || fy == null) {
    return {
      budget: 0,
      spentBefore: 0,
      after: amt,
      overBudget: false,
      noBudgetLine: true,
    };
  }

  const { data: budgetRow, error: bErr } = await supabase
    .from('annual_budgets')
    .select('amount')
    .eq('property_id', pid)
    .eq('fiscal_year', fy)
    .eq('budget_category_id', catId)
    .eq('status', 'active')
    .maybeSingle();

  if (bErr) {
    console.warn('[checkBudget] annual_budgets', bErr.message);
  }

  const cap = budgetRow?.amount != null ? Number(budgetRow.amount) : 0;
  const noBudgetLine = cap <= 0;

  let q = supabase
    .from('invoices')
    .select('id, total_amount')
    .eq('property_id', pid)
    .eq('fiscal_year', fy)
    .eq('budget_category_id', catId);

  if (invoice.id) {
    q = q.neq('id', invoice.id);
  }

  const { data: rows, error: sErr } = await q;

  if (sErr) {
    console.warn('[checkBudget] invoices sum', sErr.message);
  }

  const spentBefore = (rows ?? []).reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
  const after = spentBefore + amt;
  const overBudget = !noBudgetLine && after > cap;

  return {
    budget: cap,
    spentBefore,
    after,
    overBudget,
    noBudgetLine,
  };
}
