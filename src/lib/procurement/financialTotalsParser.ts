/**
 * Phase 2D — Code-Based Financial Extraction.
 *
 * The LLM transcribes the invoice verbatim (raw_text_original) but does NOT
 * decide any financial figure. This module parses every monetary total directly
 * from the transcription with TypeScript — no inference, no correction, no GST
 * math. If printed values are internally inconsistent, we surface them as-is and
 * leave reconciliation to the consistency audit.
 */

export type FinancialTotalSource =
  | 'balance_due'
  | 'amount_due'
  | 'total_due'
  | 'invoice_total'
  | 'total'
  | 'subtotal_plus_tax_minus_credits'
  | 'subtotal_plus_tax'
  | 'line_items_sum'
  | 'none';

export interface FinancialTotalsParseResult {
  subtotal: number | null;
  sales_tax: number | null;
  tax_amount: number | null;
  payments_credits: number | null;
  invoice_total: number | null;
  amount_due: number | null;
  balance_due: number | null;
  total_due: number | null;
  total_amount: number | null;
  total_source: FinancialTotalSource;
  total_candidates: Array<{
    amount: number;
    source: FinancialTotalSource | string;
    source_text?: string;
  }>;
  field_sources: {
    subtotal?: string;
    sales_tax?: string;
    payments_credits?: string;
    invoice_total?: string;
    amount_due?: string;
    balance_due?: string;
    total_due?: string;
    total?: string;
  };
}

type FieldKey =
  | 'subtotal'
  | 'sales_tax'
  | 'payments_credits'
  | 'invoice_total'
  | 'amount_due'
  | 'balance_due'
  | 'total_due'
  | 'total';

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** A monetary token: must carry a decimal, thousands separator, or $ to qualify (never a bare integer like a doc number). */
const MONEY_TOKEN_RE =
  /\(?\s*-?\s*\$?\s*(?:CAD|USD)?\s*(?:\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{1,2}|\$\s*\d+(?:\.\d{1,2})?)\s*\)?/gi;

/** Whole line is nothing but a monetary amount (columnar layout). */
const FULL_LINE_AMOUNT_RE =
  /^\(?\s*-?\s*\$?\s*(?:CAD|USD)?\s*(?:\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+\.\d{1,2})\s*\)?$/i;

/** Parse a single money token to a number, honouring parentheses / minus as negative. */
function parseAmountToken(token: string): number | null {
  const negative = /^\s*[-(]/.test(token) || /\)\s*$/.test(token);
  const cleaned = token.replace(/[()]/g, '').replace(/cad|usd/gi, '').replace(/[$\s,]/g, '').replace(/-/g, '');
  if (cleaned === '') return null;
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

/** Rightmost qualifying money amount on a line (the totals column), with its text. */
function extractLineAmount(line: string): { amount: number; text: string } | null {
  const matches = line.match(MONEY_TOKEN_RE);
  if (!matches || matches.length === 0) return null;
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const amount = parseAmountToken(matches[i]!);
    if (amount != null) return { amount, text: matches[i]!.trim() };
  }
  return null;
}

/** Detect which totals label (if any) a line begins with. Returns null for non-total lines. */
function detectLabel(line: string): FieldKey | null {
  const s = line.trim();
  if (/^sub[\s-]?total\b/i.test(s)) return 'subtotal';
  if (/^(sales\s+tax|gst\/hst|gst|hst|pst)\b/i.test(s)) {
    // Exclude registration-number lines (e.g. "GST/HST No. 871234567") that carry no money token.
    const looksLikeRegistration = /\b(no\.?|number|registration|reg\.?|#)\b/i.test(s);
    const hasMoney = /\d{1,3}(?:,\d{3})*\.\d{2}|\$\s*\d/.test(s);
    if (looksLikeRegistration && !hasMoney) return null;
    return 'sales_tax';
  }
  if (/^(payments\/credits|payments|credits|less\s+payment|payment\s+received)\b/i.test(s)) {
    return 'payments_credits';
  }
  if (/^balance\s+due\b/i.test(s)) return 'balance_due';
  if (/^(amount\s+due|amt\.?\s+due)\b/i.test(s)) return 'amount_due';
  if (/^total\s+due\b/i.test(s)) return 'total_due';
  if (/^invoice\s+total\b/i.test(s)) return 'invoice_total';
  if (/^total\b/i.test(s)) {
    // Plain "Total" must not capture tax / subtotal / due / invoice variants.
    if (/\b(tax|gst|hst|pst|sub|due|balance|invoice)\b/i.test(s)) return null;
    return 'total';
  }
  return null;
}

export function parseFinancialTotalsFromRawText(
  rawText: string | null | undefined,
): FinancialTotalsParseResult {
  const empty: FinancialTotalsParseResult = {
    subtotal: null,
    sales_tax: null,
    tax_amount: null,
    payments_credits: null,
    invoice_total: null,
    amount_due: null,
    balance_due: null,
    total_due: null,
    total_amount: null,
    total_source: 'none',
    total_candidates: [],
    field_sources: {},
  };
  if (!rawText || !rawText.trim()) return empty;

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  type Classified = {
    raw: string;
    label: FieldKey | null;
    amount: { amount: number; text: string } | null;
    isFullAmount: boolean;
    consumed: boolean;
  };
  const items: Classified[] = lines.map((raw) => ({
    raw,
    label: detectLabel(raw),
    amount: extractLineAmount(raw),
    isFullAmount: FULL_LINE_AMOUNT_RE.test(raw),
    consumed: false,
  }));

  const fields: Partial<Record<FieldKey, { amount: number; text: string }>> = {};
  const assign = (key: FieldKey, amount: number, text: string): void => {
    if (fields[key] == null) fields[key] = { amount, text };
  };

  // Pass 1 — same-line "Label $amount".
  for (const it of items) {
    if (it.label && it.amount) {
      assign(it.label, it.amount.amount, it.raw);
      it.consumed = true;
    }
  }

  // Pass 2 — columnar layout: a run of amount-only lines paired with an equal run
  // of label-only lines (in either order), matched positionally.
  const isAmountOnly = (it: Classified) => !it.consumed && !it.label && it.isFullAmount && it.amount != null;
  const isLabelOnly = (it: Classified) => !it.consumed && it.label != null && it.amount == null;

  const runLength = (start: number, pred: (it: Classified) => boolean): number => {
    let n = 0;
    while (start + n < items.length && pred(items[start + n]!)) n += 1;
    return n;
  };

  let i = 0;
  while (i < items.length) {
    const amtRun = runLength(i, isAmountOnly);
    if (amtRun > 0) {
      const lblRun = runLength(i + amtRun, isLabelOnly);
      if (lblRun === amtRun) {
        for (let k = 0; k < amtRun; k += 1) {
          const amtItem = items[i + k]!;
          const lblItem = items[i + amtRun + k]!;
          assign(lblItem.label!, amtItem.amount!.amount, `${lblItem.raw} ${amtItem.amount!.text}`);
          amtItem.consumed = true;
          lblItem.consumed = true;
        }
        i += amtRun * 2;
        continue;
      }
    }
    const lblRunFirst = runLength(i, isLabelOnly);
    if (lblRunFirst > 0) {
      const amtRunNext = runLength(i + lblRunFirst, isAmountOnly);
      if (amtRunNext === lblRunFirst) {
        for (let k = 0; k < lblRunFirst; k += 1) {
          const lblItem = items[i + k]!;
          const amtItem = items[i + lblRunFirst + k]!;
          assign(lblItem.label!, amtItem.amount!.amount, `${lblItem.raw} ${amtItem.amount!.text}`);
          amtItem.consumed = true;
          lblItem.consumed = true;
        }
        i += lblRunFirst * 2;
        continue;
      }
    }
    i += 1;
  }

  const val = (key: FieldKey): number | null => (fields[key] ? fields[key]!.amount : null);

  const subtotal = val('subtotal');
  const sales_tax = val('sales_tax');
  const payments_credits = val('payments_credits');
  const invoice_total = val('invoice_total');
  const amount_due = val('amount_due');
  const balance_due = val('balance_due');
  const total_due = val('total_due');
  const total = val('total');

  const field_sources: FinancialTotalsParseResult['field_sources'] = {};
  (Object.keys(fields) as FieldKey[]).forEach((k) => {
    field_sources[k] = fields[k]!.text;
  });

  // Code-derived total from the printed parts (never overwrites printed figures).
  let derived: number | null = null;
  let derivedSource: FinancialTotalSource | null = null;
  if (subtotal != null && sales_tax != null) {
    if (payments_credits != null) {
      derived = round2(subtotal + sales_tax - payments_credits);
      derivedSource = 'subtotal_plus_tax_minus_credits';
    } else {
      derived = round2(subtotal + sales_tax);
      derivedSource = 'subtotal_plus_tax';
    }
  }

  // total_amount priority (Balance Due first; code-derived last).
  const priority: Array<{ source: FinancialTotalSource; amount: number | null; text?: string }> = [
    { source: 'balance_due', amount: balance_due, text: field_sources.balance_due },
    { source: 'amount_due', amount: amount_due, text: field_sources.amount_due },
    { source: 'total_due', amount: total_due, text: field_sources.total_due },
    { source: 'invoice_total', amount: invoice_total, text: field_sources.invoice_total },
    { source: 'total', amount: total, text: field_sources.total },
    { source: derivedSource ?? 'subtotal_plus_tax', amount: derived },
  ];

  const total_candidates = priority
    .filter((p) => p.amount != null)
    .map((p) => ({ amount: p.amount as number, source: p.source, source_text: p.text }));

  const winner = priority.find((p) => p.amount != null);
  const total_amount = winner ? (winner.amount as number) : null;
  const total_source: FinancialTotalSource = winner ? winner.source : 'none';

  return {
    subtotal,
    sales_tax,
    tax_amount: sales_tax,
    payments_credits,
    invoice_total,
    amount_due,
    balance_due,
    total_due,
    total_amount,
    total_source,
    total_candidates,
    field_sources,
  };
}
