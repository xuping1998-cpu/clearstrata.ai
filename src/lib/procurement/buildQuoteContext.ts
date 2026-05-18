/** Build ai-pricing quote_context text from procurement_jobs.parsed_quote_json */

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
  add('billing_period', parsedQuote.billing_period);
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
