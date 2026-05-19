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
};

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
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as SearchQuotesResult;
  if (!response.ok && !json.error) {
    return { success: false, error: `Search failed (${response.status})` };
  }
  return json;
}
