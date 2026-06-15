import { supabase } from '../supabase';
import {
  inferVendorPricingBasis,
  isPricingBasisComparable,
  type PricingBasis,
  type QuotePricingContext,
} from './pricingBasis';

export type VendorEvidenceRow = {
  id?: string;
  company_name: string;
  price_low?: number | null;
  price_high?: number | null;
  price_currency?: string | null;
  price_source_url?: string | null;
  price_unit?: string | null;
  price_reference?: string | null;
  price_evidence_note?: string | null;
  description_en?: string | null;
  /** Optional explicit basis from search-quotes (Phase 5B); falls back to inference. */
  pricing_basis?: string | null;
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
      // Phase 5B — priced vendors exist but none share the quote's pricing basis.
      case: 'not_comparable';
      quotePricingBasis: PricingBasis;
      quoteUnitCount: number | null;
      vendorBasisCounts: Partial<Record<PricingBasis, number>>;
      excludedVendorCount: number;
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
      /** Phase 5B — true when the quote's basis was unknown so no gating was applied. */
      quoteBasisUnknown?: boolean;
      /** Phase 5B — the quote pricing basis used for comparability gating. */
      quotePricingBasis?: PricingBasis;
    };

/** Phase 5B — resolve a vendor row's pricing basis (explicit field or inference). */
export function vendorPricingBasis(v: VendorEvidenceRow): PricingBasis {
  return inferVendorPricingBasis({
    price_unit: v.price_unit,
    price_reference: v.price_reference,
    price_evidence_note: v.price_evidence_note,
    description: v.description_en,
    explicit_basis: v.pricing_basis,
  });
}

function tallyVendorBases(vendors: VendorEvidenceRow[]): Partial<Record<PricingBasis, number>> {
  const counts: Partial<Record<PricingBasis, number>> = {};
  for (const v of vendors) {
    const b = vendorPricingBasis(v);
    counts[b] = (counts[b] ?? 0) + 1;
  }
  return counts;
}

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

export function computeMarketBenchmark(
  vendors: VendorEvidenceRow[],
  quoteContext?: QuotePricingContext | null,
): MarketBenchmark {
  if (vendors.length === 0) return { case: 'none' };

  const pricedVendors = vendors.filter(hasValidPriceEvidence);
  if (pricedVendors.length === 0) return { case: 'no_prices', vendors };

  // Phase 5B — pricing-basis comparability gate. A benchmark is only valid when
  // vendor prices share the uploaded quote's billing model (e.g. a one-time
  // project total must never be compared with annual / per-device-per-year prices).
  const quoteBasis = quoteContext?.pricing_basis ?? 'unknown';
  const quoteBasisUnknown = quoteBasis === 'unknown';

  let basisComparable = pricedVendors;
  if (!quoteBasisUnknown) {
    basisComparable = pricedVendors.filter(
      (v) => isPricingBasisComparable(quoteBasis, vendorPricingBasis(v)).comparable,
    );
    if (basisComparable.length === 0) {
      return {
        case: 'not_comparable',
        quotePricingBasis: quoteBasis,
        quoteUnitCount: quoteContext?.unit_count ?? null,
        vendorBasisCounts: tallyVendorBases(pricedVendors),
        excludedVendorCount: pricedVendors.length,
        vendors,
        pricedVendors,
      };
    }
  }

  // Only compare quotes that share the same price_unit / pricing basis.
  const comparable = dominantSameUnitGroup(basisComparable);

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
    quoteBasisUnknown,
    quotePricingBasis: quoteBasis,
  };
}

export async function fetchVendorSearchResults(jobId: string): Promise<VendorEvidenceRow[]> {
  const { data, error } = await supabase
    .from('vendor_search_results')
    .select(
      'id, company_name, price_low, price_high, price_currency, price_source_url, price_unit, price_reference, price_evidence_note, description_en',
    )
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('VENDOR_SEARCH_RESULTS_LOAD_ERROR', error);
    return [];
  }
  return (data ?? []) as VendorEvidenceRow[];
}
