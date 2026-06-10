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
