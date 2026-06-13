/**
 * Phase 2D: total resolution moved to the code-based financial engine
 * (`financialTotalsParser`). This module is now a thin backward-compatible
 * wrapper so any remaining callers keep working while the single source of truth
 * is the raw-text parser — never LLM-supplied numbers.
 */
import {
  parseFinancialTotalsFromRawText,
  type FinancialTotalSource,
} from './financialTotalsParser';

export type InvoiceTotalSource = FinancialTotalSource | 'ocr_total';

export interface ResolveInvoiceTotalParams {
  rawText?: string | null;
  ocrTotalAmount?: number | null;
  subtotal?: number | null;
  taxAmount?: number | null;
  lineItems?: Array<{ amount?: number | null }>;
}

export interface ResolveInvoiceTotalResult {
  totalAmount: number | null;
  totalSource: InvoiceTotalSource;
  candidates: Array<{ amount: number; source: string }>;
}

export function resolveInvoiceTotalByPriority(
  params: ResolveInvoiceTotalParams,
): ResolveInvoiceTotalResult {
  const totals = parseFinancialTotalsFromRawText(params.rawText);
  return {
    totalAmount: totals.total_amount,
    totalSource: totals.total_source,
    candidates: totals.total_candidates.map((c) => ({ amount: c.amount, source: String(c.source) })),
  };
}
