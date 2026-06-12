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

export type MarketBenchmarkReason = 'not_enough_comparable_quotes' | 'quotes_too_wide';

export type MarketBenchmark =
  | { case: 'none' }
  | { case: 'no_prices'; vendors: VendorEvidenceRow[] }
  | {
      case: 'unreliable';
      reason: MarketBenchmarkReason;
      vendors: VendorEvidenceRow[];
      pricedVendors: VendorEvidenceRow[];
    }
  | {
      case: 'priced';
      marketLow: number;
      marketHigh: number;
      priceUnit: string | null;
      pricedVendors: VendorEvidenceRow[];
      vendors: VendorEvidenceRow[];
    };

/** Minimum comparable priced quotes required to form a reliable benchmark. */
const MIN_COMPARABLE_PRICED = 3;
/** Max marketHigh/marketLow spread before the range is considered meaningless. */
const MAX_SPREAD_RATIO = 3;

function normalizeUnit(v: VendorEvidenceRow): string {
  return typeof v.price_unit === 'string' ? v.price_unit.trim().toLowerCase() : '';
}

/** Largest set of priced vendors that share the same price_unit / pricing basis. */
function dominantSameUnitGroup(priced: VendorEvidenceRow[]): VendorEvidenceRow[] {
  const groups = new Map<string, VendorEvidenceRow[]>();
  for (const v of priced) {
    const unit = normalizeUnit(v);
    const arr = groups.get(unit) ?? [];
    arr.push(v);
    groups.set(unit, arr);
  }
  let best: VendorEvidenceRow[] = [];
  for (const arr of groups.values()) {
    if (arr.length > best.length) best = arr;
  }
  return best;
}

export function computeMarketBenchmark(vendors: VendorEvidenceRow[]): MarketBenchmark {
  if (vendors.length === 0) return { case: 'none' };

  const pricedVendors = vendors.filter(hasValidPriceEvidence);
  if (pricedVendors.length === 0) return { case: 'no_prices', vendors };

  // Only compare quotes that share the same price_unit / pricing basis.
  const comparable = dominantSameUnitGroup(pricedVendors);

  // Not enough comparable priced quotes → keep the list, but no reliable range.
  if (comparable.length < MIN_COMPARABLE_PRICED) {
    return { case: 'unreliable', reason: 'not_enough_comparable_quotes', vendors, pricedVendors: comparable };
  }

  const marketLow = Math.min(...comparable.map((v) => Number(v.price_low)));
  const marketHigh = Math.max(...comparable.map((v) => Number(v.price_high)));

  // Spread too wide → the range is not meaningful; show suppliers without a fake range.
  if (marketLow > 0 && marketHigh / marketLow > MAX_SPREAD_RATIO) {
    return { case: 'unreliable', reason: 'quotes_too_wide', vendors, pricedVendors: comparable };
  }

  const unit = normalizeUnit(comparable[0]!);
  return {
    case: 'priced',
    marketLow,
    marketHigh,
    priceUnit: unit || null,
    pricedVendors: comparable,
    vendors,
  };
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
