/**
 * Grand Total Recovery (Phase 2A.5).
 *
 * OCR sometimes captures a subtotal / line-item amount instead of the document
 * grand total. When the parsed amount disagrees with the council-authorized
 * amount, re-scan raw_text for a labelled grand-total figure and prefer the
 * candidate closest to the authorized amount.
 *
 * This only corrects an OCR reading — it makes no pricing judgement.
 */

export type GrandTotalRecoveredFrom = 'ocr_total' | 'authorized_match' | 'none';

export interface GrandTotalRecoveryResult {
  recoveredAmount: number | null;
  recoveredFrom: GrandTotalRecoveredFrom;
}

const AUTHORIZED_DIFF_RATIO = 0.1;

const GRAND_TOTAL_KEYWORDS = [
  'grand total',
  'total',
  'contract sum',
  'total due',
  'balance due',
  'project total',
  'invoice total',
  'amount due',
  'quoted amount',
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
      // Look at the window right after the keyword for the first money figure.
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

export function recoverGrandTotal(params: {
  authorizedAmount?: number | null;
  parsedQuoteJson?: Record<string, unknown> | null;
}): GrandTotalRecoveryResult {
  const pq =
    params.parsedQuoteJson && typeof params.parsedQuoteJson === 'object'
      ? params.parsedQuoteJson
      : null;

  const ocrAmount = pq ? readOcrAmount(pq) : null;

  // Step 1: nothing to recover when there is no OCR amount at all.
  if (ocrAmount == null) {
    return { recoveredAmount: null, recoveredFrom: 'none' };
  }

  const authorizedAmount =
    typeof params.authorizedAmount === 'number' && Number.isFinite(params.authorizedAmount)
      ? params.authorizedAmount
      : null;

  // Step 2: only attempt recovery when authorized amount disagrees materially.
  if (
    authorizedAmount == null ||
    authorizedAmount === 0 ||
    Math.abs(ocrAmount - authorizedAmount) / Math.abs(authorizedAmount) <= AUTHORIZED_DIFF_RATIO
  ) {
    return { recoveredAmount: ocrAmount, recoveredFrom: 'ocr_total' };
  }

  // Step 3: scan raw_text for labelled grand-total amounts.
  const rawText = pq && typeof pq.raw_text === 'string' ? pq.raw_text : '';
  const candidates = rawText ? extractKeywordAmounts(rawText) : [];

  if (candidates.length === 0) {
    return { recoveredAmount: ocrAmount, recoveredFrom: 'ocr_total' };
  }

  // Step 4: choose the candidate closest to the authorized amount.
  let best = candidates[0]!;
  let bestDelta = Math.abs(best - authorizedAmount);
  for (const c of candidates) {
    const delta = Math.abs(c - authorizedAmount);
    if (delta < bestDelta) {
      best = c;
      bestDelta = delta;
    }
  }

  // Step 5: accept only when the best candidate matches the authorized amount.
  if (Math.abs(best - authorizedAmount) / Math.abs(authorizedAmount) <= AUTHORIZED_DIFF_RATIO) {
    return { recoveredAmount: best, recoveredFrom: 'authorized_match' };
  }

  return { recoveredAmount: ocrAmount, recoveredFrom: 'ocr_total' };
}
