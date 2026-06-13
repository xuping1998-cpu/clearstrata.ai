/**
 * Phase 2A.10 — Invoice Total Priority
 *
 * invoice-ocr sometimes returns a line-item or subtotal figure as `total_amount`
 * instead of the real payable figure in the bottom-right of an invoice
 * ("Balance Due"). This helper re-resolves the true payable total for a single
 * invoice / page, preferring the strongest payment-total label found in the
 * raw text, then falling back to structured fields.
 *
 * Priority:
 *   1. Balance Due
 *   2. Amount Due
 *   3. Total Due
 *   4. Grand Total
 *   5. Invoice Total
 *   6. Total            (excluding Subtotal / Sales Tax / GST / HST lines)
 *   7. subtotal + tax_amount
 *   8. line_items sum
 *   9. ocr total_amount  (last resort)
 */

export type InvoiceTotalSource =
  | 'balance_due'
  | 'amount_due'
  | 'total_due'
  | 'grand_total'
  | 'invoice_total'
  | 'total'
  | 'subtotal_plus_tax'
  | 'line_items_sum'
  | 'ocr_total'
  | 'none';

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

/** raw_text keyword labels, strongest payment-total signal first. */
const RAW_TEXT_KEYWORDS: Array<{ source: InvoiceTotalSource; re: RegExp }> = [
  { source: 'balance_due', re: /balance\s+due/i },
  { source: 'amount_due', re: /amount\s+due/i },
  { source: 'total_due', re: /total\s+due/i },
  { source: 'grand_total', re: /grand\s+total/i },
  { source: 'invoice_total', re: /invoice\s+total/i },
  // plain "Total" — must not be preceded by "Sub" (Subtotal) and the line must
  // not be a Subtotal / Sales Tax / GST / HST / PST row.
  { source: 'total', re: /(?<![a-z])total(?![a-z])/i },
];

/** Lines that look like tax / subtotal rows must never satisfy a plain "Total". */
const TOTAL_EXCLUSION_RE = /(sub\s*total|sales\s+tax|\bgst\b|\bhst\b|\bpst\b|\btax\b)/i;

/**
 * Extract the first money-looking amount from a text window.
 * Accepts: "$46,593.75", "46,593.75", "46593.75". Rejects bare integers without
 * a decimal, $ sign, or thousands separator (so invoice numbers aren't matched).
 */
function extractAmount(window: string): number | null {
  const re = /\$\s*\d[\d,]*(?:\.\d{1,2})?|\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{2}/g;
  const match = re.exec(window);
  if (!match) return null;
  const cleaned = match[0].replace(/[$,\s]/g, '');
  const value = parseFloat(cleaned);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function num(n: number | null | undefined): number | null {
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

/** The line of text that contains the given index. */
function lineAt(text: string, index: number): string {
  const start = text.lastIndexOf('\n', index) + 1;
  let end = text.indexOf('\n', index);
  if (end === -1) end = text.length;
  return text.slice(start, end);
}

/**
 * Find the best amount for a keyword: the closest money figure after each
 * keyword occurrence (same line or the immediately following text), taking the
 * largest such figure across occurrences. For the plain "Total" keyword, skip
 * occurrences whose line is a subtotal / tax row.
 */
function findKeywordAmount(
  rawText: string,
  source: InvoiceTotalSource,
  re: RegExp,
): number | null {
  const search = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  let best: number | null = null;
  let m: RegExpExecArray | null;
  while ((m = search.exec(rawText)) !== null) {
    const idx = m.index;
    if (source === 'total' && TOTAL_EXCLUSION_RE.test(lineAt(rawText, idx))) {
      continue;
    }
    // Window: from end of the keyword, up to the next blank line or ~80 chars.
    const from = m.index + m[0].length;
    let window = rawText.slice(from, from + 80);
    const blank = window.indexOf('\n\n');
    if (blank !== -1) window = window.slice(0, blank);
    const amount = extractAmount(window);
    if (amount != null && (best == null || amount > best)) {
      best = amount;
    }
    if (search.lastIndex === m.index) search.lastIndex += 1;
  }
  return best;
}

export function resolveInvoiceTotalByPriority(
  params: ResolveInvoiceTotalParams,
): ResolveInvoiceTotalResult {
  const candidates: Array<{ amount: number; source: string }> = [];
  const rawText = params.rawText ?? '';

  // 1–6: raw_text payment-total keywords, in priority order.
  for (const { source, re } of RAW_TEXT_KEYWORDS) {
    if (!rawText) break;
    const amount = findKeywordAmount(rawText, source, re);
    if (amount != null) candidates.push({ amount, source });
  }

  // 7: subtotal + tax.
  const subtotal = num(params.subtotal);
  const taxAmount = num(params.taxAmount);
  if (subtotal != null || taxAmount != null) {
    const sum = (subtotal ?? 0) + (taxAmount ?? 0);
    if (sum > 0) candidates.push({ amount: sum, source: 'subtotal_plus_tax' });
  }

  // 8: line items sum.
  const lineItemsSum = (params.lineItems ?? []).reduce(
    (acc, it) => acc + (num(it.amount ?? null) ?? 0),
    0,
  );
  if (lineItemsSum > 0) candidates.push({ amount: lineItemsSum, source: 'line_items_sum' });

  // 9: ocr total (last resort).
  const ocrTotal = num(params.ocrTotalAmount);
  if (ocrTotal != null) candidates.push({ amount: ocrTotal, source: 'ocr_total' });

  // Resolve by priority order of the source labels.
  const priority: InvoiceTotalSource[] = [
    'balance_due',
    'amount_due',
    'total_due',
    'grand_total',
    'invoice_total',
    'total',
    'subtotal_plus_tax',
    'line_items_sum',
    'ocr_total',
  ];
  for (const source of priority) {
    const hit = candidates.find((c) => c.source === source);
    if (hit) {
      return { totalAmount: hit.amount, totalSource: source, candidates };
    }
  }

  return { totalAmount: null, totalSource: 'none', candidates };
}
