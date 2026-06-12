/**
 * Quote Interpretation consistency guardrails (Phase 2A.4).
 *
 * Pure validation used before same-scope vendor search. It only surfaces data
 * consistency issues — it does NOT judge whether a price is reasonable, nor does
 * it produce any AI pricing/recommendation. Authorized amount and job category are
 * always treated as the human-confirmed source of truth for comparison.
 */

import { normalizeServiceBucket } from './serviceCategoryBuckets';

export type InterpretationWarning =
  | 'amount_mismatch'
  | 'category_mismatch'
  | 'missing_vendor'
  | 'missing_scope';

export interface InterpretationConsistencyResult {
  warnings: InterpretationWarning[];
  comparisonAmount: number | null;
  comparisonCategory: string | null;
  canSearch: boolean;
  /** OCR-side amount parsed from parsed_quote_json, for display in mismatch hints. */
  ocrAmount: number | null;
  /** OCR-side category parsed from parsed_quote_json, for display in mismatch hints. */
  ocrCategory: string | null;
}

const AMOUNT_DIFF_RATIO_THRESHOLD = 0.1;

function str(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = parseFloat(v.replace(/[^\d.-]/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = str(obj[key]);
    if (v) return v;
  }
  return '';
}

function pickNum(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const n = num(obj[key]);
    if (n != null) return n;
  }
  return null;
}

export function validateInterpretationConsistency({
  parsedQuoteJson,
  authorizedAmount,
  jobCategory,
}: {
  parsedQuoteJson: unknown;
  authorizedAmount?: number | null;
  jobCategory?: string | null;
}): InterpretationConsistencyResult {
  const warnings: InterpretationWarning[] = [];

  const pq =
    parsedQuoteJson && typeof parsedQuoteJson === 'object'
      ? (parsedQuoteJson as Record<string, unknown>)
      : null;

  const ocrAmount = pq ? pickNum(pq, ['total_amount', 'totalAmount', 'amount']) : null;
  const ocrCategory = pq ? pickStr(pq, ['category', 'service_category', 'serviceType']) : '';
  const vendor = pq ? pickStr(pq, ['vendor_name', 'vendorName', 'supplier_name', 'supplierName']) : '';
  const scope = pq ? pickStr(pq, ['service_scope', 'scope', 'analysis_description', 'description']) : '';

  const authAmount = typeof authorizedAmount === 'number' && Number.isFinite(authorizedAmount)
    ? authorizedAmount
    : null;
  const jobCat = str(jobCategory);

  // Amount: comparison always prefers the council-authorized amount.
  if (authAmount != null && ocrAmount != null && authAmount !== 0) {
    const diffRatio = Math.abs(ocrAmount - authAmount) / Math.abs(authAmount);
    if (diffRatio > AMOUNT_DIFF_RATIO_THRESHOLD) warnings.push('amount_mismatch');
  }
  const comparisonAmount = authAmount ?? ocrAmount;

  // Category: comparison always prefers the job category. Compare coarse service
  // buckets so related trades (mechanical / plumbing / DHW) are not flagged.
  if (jobCat && ocrCategory) {
    if (normalizeServiceBucket(jobCat) !== normalizeServiceBucket(ocrCategory)) {
      warnings.push('category_mismatch');
    }
  }
  const comparisonCategory = jobCat || ocrCategory || null;

  if (!vendor) warnings.push('missing_vendor');
  if (!scope) warnings.push('missing_scope');

  // Only missing vendor / scope block the search; amount/category mismatches are hints only.
  const canSearch = !warnings.includes('missing_vendor') && !warnings.includes('missing_scope');

  return {
    warnings,
    comparisonAmount,
    comparisonCategory,
    canSearch,
    ocrAmount,
    ocrCategory: ocrCategory || null,
  };
}
