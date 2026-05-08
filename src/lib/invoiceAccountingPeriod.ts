/** User-selected bookkeeping period (calendar year + month). Distinct from invoice_date / fiscal_year budget logic. */

export function currentAccountingDefaults(): { year: number; month: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function effectiveAccountingYear(inv: {
  accounting_year?: number | null;
  created_at?: string;
}): number {
  if (typeof inv.accounting_year === 'number' && Number.isFinite(inv.accounting_year)) {
    return inv.accounting_year;
  }
  const c = inv.created_at ? new Date(inv.created_at) : new Date();
  return Number.isNaN(c.getTime()) ? new Date().getFullYear() : c.getFullYear();
}

export function effectiveAccountingMonth(inv: {
  accounting_month?: number | null;
  created_at?: string;
}): number {
  if (
    typeof inv.accounting_month === 'number' &&
    inv.accounting_month >= 1 &&
    inv.accounting_month <= 12
  ) {
    return inv.accounting_month;
  }
  const c = inv.created_at ? new Date(inv.created_at) : new Date();
  return Number.isNaN(c.getTime()) ? new Date().getMonth() + 1 : c.getMonth() + 1;
}
