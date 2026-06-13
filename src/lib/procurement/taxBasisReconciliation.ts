/**
 * Tax Basis Reconciliation (Phase 2A.8).
 *
 * Authorization amounts (approved_cost / estimated_budget) are recorded PRE-TAX.
 * Invoice / quote-package OCR payment totals are AFTER-TAX. Comparing the two
 * directly produces a false "amount mismatch". This helper reconciles the two
 * bases so a GST-only difference is recognised instead of flagged.
 *
 * It makes NO pricing judgement: market comparison continues to use the pre-tax
 * authorization amount; payment tracking continues to use the after-tax invoice
 * total. This only classifies whether the two amounts agree on a tax basis.
 */

export type TaxReconciliationBasis = 'direct' | 'gst_adjusted' | 'mismatch';

export interface TaxReconciliationResult {
  reconciled: boolean;
  basis: TaxReconciliationBasis;
  /** Pre-tax authorization (approved_cost ?? estimated_budget). */
  authorizationAmount: number | null;
  /** authorizationAmount × (1 + GST). */
  gstAdjustedAmount: number | null;
  /** After-tax invoice / quote-package payment total. */
  invoicePackageTotal: number | null;
}

/** BC GST rate used for tax-basis reconciliation. */
export const GST_RATE = 0.05;

/** Absolute CAD tolerance for treating two amounts as equal (rounding/cents). */
const RECONCILE_TOLERANCE = 1;

function finite(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = parseFloat(v.replace(/[^\d.-]/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * Reconcile a pre-tax authorization amount with an after-tax invoice/package total.
 *
 *  - direct:       |invoice − authorization| ≤ 1
 *  - gst_adjusted: |invoice − authorization × 1.05| ≤ 1
 *  - mismatch:     neither (keep the warning)
 */
export function reconcileTaxBasis(params: {
  authorizationAmount?: number | null;
  invoicePackageTotal?: number | null;
}): TaxReconciliationResult {
  const auth = finite(params.authorizationAmount);
  const invoice = finite(params.invoicePackageTotal);
  const gstAdjustedAmount = auth != null ? auth * (1 + GST_RATE) : null;

  const base = {
    authorizationAmount: auth,
    gstAdjustedAmount,
    invoicePackageTotal: invoice,
  };

  if (auth == null || auth === 0 || invoice == null) {
    return { reconciled: false, basis: 'mismatch', ...base };
  }

  if (Math.abs(invoice - auth) <= RECONCILE_TOLERANCE) {
    return { reconciled: true, basis: 'direct', ...base };
  }

  if (gstAdjustedAmount != null && Math.abs(invoice - gstAdjustedAmount) <= RECONCILE_TOLERANCE) {
    return { reconciled: true, basis: 'gst_adjusted', ...base };
  }

  return { reconciled: false, basis: 'mismatch', ...base };
}

/**
 * Resolve the after-tax invoice / quote-package payment total from parsed_quote_json.
 *
 * Prefers the document total (already tax-inclusive); falls back to
 * subtotal + tax when no total is present.
 */
export function resolveInvoicePackageTotal(
  parsedQuoteJson: Record<string, unknown> | null | undefined,
): number | null {
  if (!parsedQuoteJson || typeof parsedQuoteJson !== 'object') return null;
  const pq = parsedQuoteJson;

  const total = finite(pq.total_amount) ?? finite(pq.totalAmount) ?? finite(pq.amount);
  if (total != null) return total;

  const subtotal = finite(pq.subtotal);
  if (subtotal != null) {
    const tax = finite(pq.tax_amount) ?? finite(pq.taxAmount) ?? 0;
    return subtotal + tax;
  }

  return null;
}
