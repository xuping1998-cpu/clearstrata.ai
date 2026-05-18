import { supabase } from '../supabase';

export type VendorEvidenceRow = {
  id?: string;
  company_name: string;
  price_low?: number | null;
  price_high?: number | null;
  price_currency?: string | null;
  price_source_url?: string | null;
  price_unit?: string | null;
  price_evidence_note?: string | null;
};

export function hasValidPriceEvidence(v: VendorEvidenceRow): boolean {
  return (
    v.price_low != null &&
    v.price_high != null &&
    Boolean(v.price_source_url?.trim())
  );
}

export type MarketBenchmark =
  | { case: 'none' }
  | { case: 'no_prices'; vendors: VendorEvidenceRow[] }
  | {
      case: 'priced';
      marketLow: number;
      marketHigh: number;
      pricedVendors: VendorEvidenceRow[];
      vendors: VendorEvidenceRow[];
    };

export function computeMarketBenchmark(vendors: VendorEvidenceRow[]): MarketBenchmark {
  if (vendors.length === 0) return { case: 'none' };
  const pricedVendors = vendors.filter(hasValidPriceEvidence);
  if (pricedVendors.length === 0) return { case: 'no_prices', vendors };
  const marketLow = Math.min(...pricedVendors.map((v) => Number(v.price_low)));
  const marketHigh = Math.max(...pricedVendors.map((v) => Number(v.price_high)));
  return { case: 'priced', marketLow, marketHigh, pricedVendors, vendors };
}

export async function fetchVendorSearchResults(jobId: string): Promise<VendorEvidenceRow[]> {
  const { data, error } = await supabase
    .from('vendor_search_results')
    .select(
      'id, company_name, price_low, price_high, price_currency, price_source_url, price_unit, price_evidence_note',
    )
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('VENDOR_SEARCH_RESULTS_LOAD_ERROR', error);
    return [];
  }
  return (data ?? []) as VendorEvidenceRow[];
}
