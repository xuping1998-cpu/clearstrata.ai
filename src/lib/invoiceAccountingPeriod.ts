/** User-selected bookkeeping period (calendar year + month). Distinct from invoice_date / fiscal_year budget logic. */

export function currentAccountingDefaults(): { year: number; month: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function parseStoredYear(y: unknown): number | null {
  if (y == null || y === '') return null;
  const n = typeof y === 'number' ? y : parseInt(String(y), 10);
  return Number.isFinite(n) ? n : null;
}

function parseStoredMonth(m: unknown): number | null {
  if (m == null || m === '') return null;
  const n = typeof m === 'number' ? m : parseInt(String(m), 10);
  if (!Number.isFinite(n)) return null;
  const floored = Math.floor(n);
  if (floored < 1 || floored > 12) return null;
  return floored;
}

/** 分组用：优先 invoices.accounting_*；旧数据缺省则按 created_at 的年/月。 */
export function effectiveAccountingYear(inv: {
  accounting_year?: number | null;
  created_at?: string;
}): number {
  const y = parseStoredYear(inv.accounting_year);
  if (y !== null) return y;
  const c = inv.created_at ? new Date(inv.created_at) : new Date();
  return Number.isNaN(c.getTime()) ? new Date().getFullYear() : c.getFullYear();
}

export function effectiveAccountingMonth(inv: {
  accounting_month?: number | null;
  created_at?: string;
}): number {
  const m = parseStoredMonth(inv.accounting_month);
  if (m !== null) return m;
  const c = inv.created_at ? new Date(inv.created_at) : new Date();
  return Number.isNaN(c.getTime()) ? new Date().getMonth() + 1 : c.getMonth() + 1;
}
