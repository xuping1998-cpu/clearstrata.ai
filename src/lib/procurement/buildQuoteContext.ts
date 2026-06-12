/**
 * Build a human-readable quote_context string from procurement_jobs.parsed_quote_json.
 *
 * Phase 2A (corrective restoration): used to (a) render the Quote Interpretation
 * panel summary and (b) provide a structured understanding of the uploaded quote
 * for later same-scope vendor comparison (Phase 2B). This does NOT produce any
 * AI price estimate — it only restates what the quote says.
 *
 * All fields degrade safely: missing fields are skipped, never throw.
 */
export function buildQuoteContext(parsedQuote: Record<string, unknown> | null | undefined): string {
  if (!parsedQuote || typeof parsedQuote !== 'object') return '';

  const lines: string[] = [];

  const add = (label: string, value: unknown) => {
    if (value == null || value === '') return;
    lines.push(`${label}: ${value}`);
  };

  add('vendor_name', parsedQuote.vendor_name);
  add('document_number', parsedQuote.document_number);
  add('document_date', parsedQuote.document_date);
  add('total_amount', parsedQuote.total_amount);
  add('subtotal', parsedQuote.subtotal);
  add('tax_amount', parsedQuote.tax_amount);
  add('currency', parsedQuote.currency);
  add('service_scope', parsedQuote.service_scope);
  add('confidence', parsedQuote.confidence);
  // Accept either legacy `billing_period` or `pricing_basis`; safe when absent.
  add('billing_period', parsedQuote.billing_period ?? parsedQuote.pricing_basis);
  add('unit_count', parsedQuote.unit_count);
  add('source_file_name', parsedQuote.source_file_name);
  add('parsed_at', parsedQuote.parsed_at);

  const lineItems = parsedQuote.line_items;
  if (Array.isArray(lineItems) && lineItems.length > 0) {
    lines.push('line_items:');
    for (const item of lineItems) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const desc = String(row.description ?? '').trim();
      const amt = row.amount;
      if (!desc && (amt == null || amt === '')) continue;
      lines.push(
        amt != null && amt !== ''
          ? `  - ${desc || '(no description)'} | amount: ${amt}`
          : `  - ${desc}`,
      );
    }
  }

  const raw = typeof parsedQuote.raw_text === 'string' ? parsedQuote.raw_text.trim() : '';
  if (raw) {
    lines.push(`raw_text (truncated):\n${raw.slice(0, 3000)}`);
  }

  return lines.join('\n');
}

/** Max length of the compressed search context sent to the vendor-search Edge function. */
export const SEARCH_QUOTE_CONTEXT_MAX = 1500;
const SEARCH_SCOPE_MAX = 300;
const SEARCH_LINE_ITEM_MAX = 5;
const SEARCH_LINE_ITEM_CHARS = 120;
const SEARCH_CONTEXT_TRUNCATED_SUFFIX = ' [search context truncated]';

function s(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function clip(value: string, max: number): string {
  const v = value.trim();
  return v.length > max ? v.slice(0, max) : v;
}

/**
 * Compressed, structured quote context for the AI vendor search (search-quotes).
 *
 * Unlike buildQuoteContext (used for the human-facing Quote Interpretation panel),
 * this MUST stay short: no raw_text / OCR full text / base64 / attachment content.
 * Hard-capped at SEARCH_QUOTE_CONTEXT_MAX characters with a truncation marker.
 */
export function buildSearchQuoteContext(
  parsedQuote: Record<string, unknown> | null | undefined,
): string {
  if (!parsedQuote || typeof parsedQuote !== 'object') return '';

  const lines: string[] = [];
  const add = (label: string, value: unknown) => {
    const str = s(value);
    if (!str) return;
    lines.push(`${label}: ${str}`);
  };

  const vendorName = s(parsedQuote.vendor_name);
  add('vendor_name', vendorName);
  add('total_amount', parsedQuote.total_amount ?? parsedQuote.currentPrice);
  add('currency', parsedQuote.currency);
  add('service_category', parsedQuote.category ?? parsedQuote.service_category);

  const scope = s(parsedQuote.service_scope) || s(parsedQuote.analysis_description);
  if (scope) lines.push(`service_scope: ${clip(scope, SEARCH_SCOPE_MAX)}`);

  add('pricing_basis', parsedQuote.billing_period ?? parsedQuote.pricing_basis);
  add('location', parsedQuote.location ?? parsedQuote.city);

  const lineItems = parsedQuote.line_items;
  if (Array.isArray(lineItems) && lineItems.length > 0) {
    const rows: string[] = [];
    for (const item of lineItems) {
      if (rows.length >= SEARCH_LINE_ITEM_MAX) break;
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const desc = clip(s(row.description), SEARCH_LINE_ITEM_CHARS);
      const amt = row.amount;
      if (!desc && (amt == null || amt === '')) continue;
      rows.push(
        amt != null && amt !== ''
          ? `  - ${desc || '(no description)'} | amount: ${amt}`
          : `  - ${desc}`,
      );
    }
    if (rows.length > 0) {
      lines.push('line_items:');
      lines.push(...rows);
    }
  }

  // Same-scope hint: exclude the incumbent vendor from comparable results.
  if (vendorName) {
    lines.push(`note: exclude incumbent vendor "${vendorName}" from comparable results`);
  }

  const out = lines.join('\n').trim();
  if (out.length > SEARCH_QUOTE_CONTEXT_MAX) {
    const budget = SEARCH_QUOTE_CONTEXT_MAX - SEARCH_CONTEXT_TRUNCATED_SUFFIX.length;
    return `${out.slice(0, budget)}${SEARCH_CONTEXT_TRUNCATED_SUFFIX}`;
  }
  return out;
}
