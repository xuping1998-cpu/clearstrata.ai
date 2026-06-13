/**
 * Phase 2C — Invoice Consistency Audit
 *
 * The package total is computed from the payable figure (Balance Due / Amount
 * Due) and is authoritative. However, OCR can still misread the subtotal, tax,
 * or invoice total of an individual invoice. This audit surfaces those internal
 * contradictions for reviewer attention WITHOUT changing any total.
 *
 * Tolerance: differences within CAD $1 are treated as consistent (rounding).
 */

const TOLERANCE = 1;

export type InvoiceConsistencyWarning =
  | 'subtotal_tax_mismatch_invoice_total'
  | 'invoice_total_mismatch_due'
  | 'subtotal_tax_mismatch_due';

export interface InvoiceConsistencyAuditPart {
  subtotal?: number | null;
  tax_amount?: number | null;
  invoice_total?: number | null;
  total_amount?: number | null;
  amount_due?: number | null;
  balance_due?: number | null;
  payments_credits?: number | null;
  total_source?: string | null;
}

export interface InvoiceConsistencyAuditResult {
  hasWarning: boolean;
  warnings: InvoiceConsistencyWarning[];
  expectedInvoiceTotal?: number | null;
  dueAmount?: number | null;
  diff?: number | null;
}

function num(v: number | null | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function auditInvoicePartConsistency(
  part: InvoiceConsistencyAuditPart,
): InvoiceConsistencyAuditResult {
  const subtotal = num(part.subtotal);
  const tax = num(part.tax_amount);
  const invoiceTotal = num(part.invoice_total);
  const payments = num(part.payments_credits);

  // The payable figure that drives the package total.
  const dueAmount = num(part.balance_due) ?? num(part.amount_due) ?? num(part.total_amount);

  const expectedInvoiceTotal =
    subtotal != null && tax != null ? round2(subtotal + tax) : null;

  const warnings: InvoiceConsistencyWarning[] = [];

  // A. subtotal + tax should equal the printed invoice total.
  if (
    expectedInvoiceTotal != null &&
    invoiceTotal != null &&
    Math.abs(expectedInvoiceTotal - invoiceTotal) > TOLERANCE
  ) {
    warnings.push('subtotal_tax_mismatch_invoice_total');
  }

  // B. invoice total (minus any payments/credits) should equal the payable due.
  if (invoiceTotal != null && dueAmount != null) {
    const offsetTotal = payments != null ? invoiceTotal - payments : invoiceTotal;
    if (Math.abs(offsetTotal - dueAmount) > TOLERANCE) {
      warnings.push('invoice_total_mismatch_due');
    }
  }

  // C. subtotal + tax (minus any payments/credits) should equal the payable due.
  if (expectedInvoiceTotal != null && dueAmount != null) {
    const offsetExpected =
      payments != null ? expectedInvoiceTotal - payments : expectedInvoiceTotal;
    if (Math.abs(offsetExpected - dueAmount) > TOLERANCE) {
      warnings.push('subtotal_tax_mismatch_due');
    }
  }

  const reference = expectedInvoiceTotal ?? invoiceTotal;
  const diff =
    reference != null && dueAmount != null ? round2(reference - dueAmount) : null;

  return {
    hasWarning: warnings.length > 0,
    warnings,
    expectedInvoiceTotal,
    dueAmount,
    diff,
  };
}
