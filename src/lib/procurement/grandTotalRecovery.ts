/**
 * Grand Total Recovery v2 (Phase 2A.7).
 *
 * invoice-ocr sometimes selects a subtotal / section / line-item figure as the
 * document total instead of the real grand total (e.g. it reads 49,963.75 when
 * the contract grand total is 88,750). This module re-derives the grand total
 * from data invoice-ocr ALREADY returned:
 *
 *   - raw_text          (labelled "Grand Total / Contract Price / ..." figures)
 *   - line_items        (sum of item amounts)
 *   - subtotal          (lower bound — grand total must exceed it)
 *   - tax_amount        (line_items_total + tax candidate)
 *   - total_amount      (the OCR total we may be correcting)
 *   - authorizedAmount  (council-confirmed REFERENCE only)
 *
 * Hard rule: authorizedAmount is ONLY a reference for selecting among real
 * document figures. It is NEVER written back as the total, and we never
 * fabricate the authorized amount to silence a warning. If no real candidate
 * is close enough, we keep the OCR total and leave the warning in place.
 */

export type GrandTotalRecoveredFrom =
  | 'ocr_total'
  | 'keyword_match'
  | 'line_items_plus_tax'
  | 'authorized_match'
  | 'none';

export type GrandTotalCandidateSource =
  | 'ocr_total'
  | 'keyword_match'
  | 'line_items_plus_tax'
  | 'subtotal'
  | 'line_items_total';

export interface GrandTotalCandidate {
  amount: number;
  source: GrandTotalCandidateSource;
}

export interface GrandTotalRecoveryResult {
  recoveredAmount: number | null;
  recoveredFrom: GrandTotalRecoveredFrom;
  /** True only when a real document figure replaced the OCR total. */
  recovered: boolean;
  /** Every amount considered, for audit/debug. Written to parsed_quote_json. */
  candidates: GrandTotalCandidate[];
}

// Acceptance thresholds (diffRatio = |candidate - authorized| / |authorized|).
const STEP1_OCR_OK = 0.1; // OCR total already agrees with authorized
const KEYWORD_MAX = 0.15; // labelled grand-total figure
const LINE_ITEMS_MAX = 0.1; // line_items_total + tax
const NEAREST_MAX = 0.15; // closest remaining candidate
const FAR_MISS = 0.3; // everything this far off => keep OCR total

/**
 * Grand-total style labels, most specific first. Bare "total" is intentionally
 * excluded so we never latch onto "subtotal" or "total tax" lines.
 */
const GRAND_TOTAL_KEYWORDS = [
  'total contract value',
  'total including gst',
  'total including tax',
  'grand total',
  'project total',
  'contract price',
  'contract amount',
  'contract sum',
  'amount due',
  'balance due',
  'total due',
  'lump sum',
  'fixed price',
];

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = parseFloat(v.replace(/[^\d.-]/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function readOcrAmount(pq: Record<string, unknown>): number | null {
  return num(pq.total_amount) ?? num(pq.totalAmount) ?? num(pq.amount);
}

function sumLineItems(pq: Record<string, unknown>): number | null {
  const raw = Array.isArray(pq.line_items)
    ? pq.line_items
    : Array.isArray(pq.items)
      ? pq.items
      : null;
  if (!raw) return null;
  let total = 0;
  let counted = 0;
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const amount = num((item as Record<string, unknown>).amount);
    if (amount != null && amount > 0) {
      total += amount;
      counted += 1;
    }
  }
  return counted > 0 ? total : null;
}

/** Extract amounts that appear shortly after a grand-total style keyword. */
function extractKeywordAmounts(rawText: string): number[] {
  const text = rawText.toLowerCase();
  const out: number[] = [];
  for (const keyword of GRAND_TOTAL_KEYWORDS) {
    let from = 0;
    while (true) {
      const idx = text.indexOf(keyword, from);
      if (idx < 0) break;
      from = idx + keyword.length;
      const window = rawText.slice(idx + keyword.length, idx + keyword.length + 80);
      const match = window.match(/\$?\s*([\d][\d,]*(?:\.\d{1,2})?)/);
      if (match?.[1]) {
        const n = parseFloat(match[1].replace(/,/g, ''));
        if (Number.isFinite(n) && n > 0) out.push(n);
      }
    }
  }
  return out;
}

function ratio(amount: number, authorized: number): number {
  return Math.abs(amount - authorized) / Math.abs(authorized);
}

function pushUnique(list: GrandTotalCandidate[], amount: number, source: GrandTotalCandidateSource) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  if (list.some((c) => c.source === source && Math.abs(c.amount - amount) < 0.005)) return;
  list.push({ amount, source });
}

export function recoverGrandTotal(params: {
  authorizedAmount?: number | null;
  parsedQuoteJson?: Record<string, unknown> | null;
}): GrandTotalRecoveryResult {
  const pq =
    params.parsedQuoteJson && typeof params.parsedQuoteJson === 'object'
      ? params.parsedQuoteJson
      : null;

  const ocrAmount = pq ? readOcrAmount(pq) : null;
  const subtotal = pq ? num(pq.subtotal) : null;
  const taxAmount = pq ? (num(pq.tax_amount) ?? num(pq.taxAmount)) : null;
  const lineItemsTotal = pq ? sumLineItems(pq) : null;
  const rawText = pq && typeof pq.raw_text === 'string' ? pq.raw_text : '';

  // Build the full candidate pool up front so it is recorded regardless of outcome.
  const candidates: GrandTotalCandidate[] = [];
  if (ocrAmount != null) pushUnique(candidates, ocrAmount, 'ocr_total');
  if (subtotal != null) pushUnique(candidates, subtotal, 'subtotal');
  if (lineItemsTotal != null) pushUnique(candidates, lineItemsTotal, 'line_items_total');
  const lineItemsPlusTax =
    lineItemsTotal != null ? lineItemsTotal + (taxAmount ?? 0) : null;
  if (lineItemsPlusTax != null) pushUnique(candidates, lineItemsPlusTax, 'line_items_plus_tax');
  const keywordAmounts = rawText ? extractKeywordAmounts(rawText) : [];
  for (const amount of keywordAmounts) pushUnique(candidates, amount, 'keyword_match');

  const noChange = (from: GrandTotalRecoveredFrom): GrandTotalRecoveryResult => ({
    recoveredAmount: ocrAmount,
    recoveredFrom: from,
    recovered: false,
    candidates,
  });

  // No OCR amount at all — nothing to anchor on.
  if (ocrAmount == null) {
    return { recoveredAmount: null, recoveredFrom: 'none', recovered: false, candidates };
  }

  const authorizedAmount =
    typeof params.authorizedAmount === 'number' && Number.isFinite(params.authorizedAmount)
      ? params.authorizedAmount
      : null;

  // Without a usable authorized reference we cannot judge recovery — keep OCR.
  if (authorizedAmount == null || authorizedAmount === 0) {
    return noChange('ocr_total');
  }

  // Step 1: OCR total already agrees with the authorized amount (≤ 10%). Use it.
  if (ratio(ocrAmount, authorizedAmount) <= STEP1_OCR_OK) {
    return noChange('ocr_total');
  }

  // Step 2: labelled grand-total figure from raw_text.
  // Must exceed subtotal (when known) and be within 15% of authorized.
  const keywordQualified = keywordAmounts
    .filter((a) => (subtotal == null ? true : a > subtotal))
    .filter((a) => ratio(a, authorizedAmount) <= KEYWORD_MAX);
  if (keywordQualified.length > 0) {
    const best = keywordQualified.reduce((a, b) =>
      ratio(b, authorizedAmount) < ratio(a, authorizedAmount) ? b : a,
    );
    return { recoveredAmount: best, recoveredFrom: 'keyword_match', recovered: true, candidates };
  }

  // Step 3: line_items_total + tax_amount within 10% of authorized.
  if (
    lineItemsPlusTax != null &&
    ratio(lineItemsPlusTax, authorizedAmount) <= LINE_ITEMS_MAX
  ) {
    return {
      recoveredAmount: lineItemsPlusTax,
      recoveredFrom: 'line_items_plus_tax',
      recovered: true,
      candidates,
    };
  }

  // Step 4: among remaining real candidates, pick the one closest to authorized
  // (≤ 15%). Never the authorized value itself — only real document figures.
  const selectable = candidates.filter(
    (c) => c.source !== 'ocr_total' && ratio(c.amount, authorizedAmount) <= NEAREST_MAX,
  );
  if (selectable.length > 0) {
    const best = selectable.reduce((a, b) =>
      ratio(b.amount, authorizedAmount) < ratio(a.amount, authorizedAmount) ? b : a,
    );
    return {
      recoveredAmount: best.amount,
      recoveredFrom: 'authorized_match',
      recovered: true,
      candidates,
    };
  }

  // Step 5: OCR total, subtotal and line-items all far off (> 30%) — or simply
  // nothing close enough. Keep OCR total and leave the warning in place.
  return noChange('ocr_total');
}
