export type SearchQuotesVendor = {
  company_name: string;
  phone: string;
  website: string;
  address: string;
  description_en: string;
  description_zh: string;
  price_low?: number | null;
  price_high?: number | null;
  price_currency?: string | null;
  price_unit?: string | null;
  price_source_url?: string | null;
  price_confidence?: string | null;
  price_evidence_note?: string | null;
};

export type SearchQuotesPayload = {
  property_id: string;
  job_id: string;
  title: string;
  description: string;
  attachment_urls?: string[];
  /** Compressed, structured quote context (see buildSearchQuoteContext). Never raw OCR text. */
  quote_context?: string;
};

/** Hard cap for the quote_context sent to the Edge function. */
const SEARCH_QUOTE_CONTEXT_MAX = 1500;

/**
 * Defensive guard: only ever send a short string as quote_context.
 * Rejects non-strings (so a giant object can never be JSON.stringify'd into the payload)
 * and truncates anything over the cap before sending to the Edge function.
 */
export function compactSearchQuoteContext(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > SEARCH_QUOTE_CONTEXT_MAX
    ? trimmed.slice(0, SEARCH_QUOTE_CONTEXT_MAX)
    : trimmed;
}

export type SearchQuotesResult = {
  success: boolean;
  vendors?: SearchQuotesVendor[];
  count?: number;
  error?: string;
  ai_search_count?: number;
};

/** Shared client for Edge `search-quotes` (single vendor-search implementation). */
export async function callSearchQuotes(payload: SearchQuotesPayload): Promise<SearchQuotesResult> {
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-quotes`;
  const safeContext = compactSearchQuoteContext(payload.quote_context);
  const safePayload: SearchQuotesPayload = { ...payload, quote_context: safeContext };
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(safePayload),
  });

  const json = (await response.json()) as SearchQuotesResult;
  if (!response.ok && !json.error) {
    return { success: false, error: `Search failed (${response.status})` };
  }
  return json;
}
