/**
 * Phase 5B — Pricing-basis normalization.
 *
 * A market benchmark is only meaningful when the uploaded quote and the vendor
 * reference prices describe the SAME billing model. A one-time backflow test
 * project ($888.99 for 4 devices) must never be compared against an annual /
 * per-device-per-year compliance price ($80–150 / year).
 *
 * This module infers a pricing basis for (a) the uploaded quote (from OCR text)
 * and (b) each vendor result (from its price_unit / price_reference text), then
 * exposes a comparability gate. It never changes any amount.
 */

export type PricingBasis =
  | 'one_time_project'
  | 'per_visit'
  | 'per_device'
  | 'per_device_per_year'
  | 'annual_contract'
  | 'monthly_contract'
  | 'per_hour'
  | 'unknown';

export type QuotePricingContext = {
  pricing_basis: PricingBasis;
  unit_count?: number | null;
  unit_label?: string | null; // device, hour, visit, project
  basis_confidence: 'high' | 'medium' | 'low';
  basis_evidence?: string[];
};

export const ALL_PRICING_BASES: PricingBasis[] = [
  'one_time_project',
  'per_visit',
  'per_device',
  'per_device_per_year',
  'annual_contract',
  'monthly_contract',
  'per_hour',
  'unknown',
];

function clean(s: string | null | undefined): string {
  return (s ?? '').toString();
}

/** Pull a device / backflow / unit count from free text. Returns null if none. */
export function extractUnitCount(text: string): { count: number; label: string } | null {
  const t = text || '';
  const patterns: Array<{ re: RegExp; label: string }> = [
    { re: /on\s+(\d{1,4})\s+devices?/i, label: 'device' },
    { re: /(\d{1,4})\s+devices?/i, label: 'device' },
    { re: /(\d{1,4})\s+backflows?/i, label: 'device' },
    { re: /(\d{1,4})\s+units?/i, label: 'unit' },
  ];
  for (const { re, label } of patterns) {
    const m = t.match(re);
    if (m && m[1]) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > 0 && n < 10000) return { count: n, label };
    }
  }
  return null;
}

type InferQuoteInput = {
  title?: string | null;
  description?: string | null;
  service_scope?: string | null;
  raw_text_original?: string | null;
  line_items?: Array<{ description?: string | null; amount?: number | null }>;
  total_amount?: number | null;
};

/**
 * Infer the uploaded quote's pricing basis from its OCR text / scope.
 * Order matters: explicit recurring signals win over the one-time default.
 */
export function inferQuotePricingContext(input: InferQuoteInput): QuotePricingContext {
  const lineItemText = (input.line_items ?? [])
    .map((it) => clean(it?.description))
    .filter(Boolean)
    .join('\n');
  const blob = [
    clean(input.title),
    clean(input.description),
    clean(input.service_scope),
    clean(input.raw_text_original),
    lineItemText,
  ]
    .join('\n')
    .toLowerCase();

  const evidence: string[] = [];
  const note = (cond: boolean, label: string) => {
    if (cond) evidence.push(label);
    return cond;
  };

  if (!blob.trim()) {
    return { pricing_basis: 'unknown', basis_confidence: 'low', basis_evidence: [] };
  }

  const unit = extractUnitCount(blob);
  const unitCount = unit?.count ?? null;
  const unitLabel = unit?.label ?? null;

  const hasAnnual = note(
    /\bannual\b|\byearly\b|per\s+year|per\s+annum|\/\s*year|annual\s+(certification|test|testing|inspection|service|contract|program)/i.test(
      blob,
    ),
    'annual/yearly wording',
  );
  const hasMonthly = note(/\bmonthly\b|per\s+month|\/\s*month\b/i.test(blob), 'monthly wording');
  const hasPerDevice = note(
    /per\s+device|each\s+device|\/\s*device|per\s+backflow|each\s+backflow/i.test(blob),
    'per-device wording',
  );
  const hasPerHour = note(/\bhourly\b|per\s+hour|\/\s*hour\b|labour\s+hours|labor\s+hours/i.test(blob), 'hourly wording');
  const hasPerVisit = note(/per\s+visit|\/\s*visit\b|service\s+call(?:\s+fee)?|call[-\s]?out/i.test(blob), 'per-visit wording');

  // Strong one-time / completed-work signals (an issued invoice for work done).
  const oneTimeSignals =
    /balance\s+due|total\s+due|amount\s+due|\binvoice\b|work\s+performed|service\s+completed|service\s+to\s+test|performed\s+testing|on\s+site|lump\s*sum|fixed\s+(price|quote)|\bproject\b/i;
  const hasOneTime = note(oneTimeSignals.test(blob), 'one-time invoice/work-performed/balance-due');

  let pricing_basis: PricingBasis = 'unknown';
  let basis_confidence: QuotePricingContext['basis_confidence'] = 'low';

  if (hasAnnual && hasPerDevice) {
    pricing_basis = 'per_device_per_year';
    basis_confidence = 'high';
  } else if (hasMonthly) {
    pricing_basis = 'monthly_contract';
    basis_confidence = 'high';
  } else if (hasAnnual) {
    pricing_basis = 'annual_contract';
    basis_confidence = 'high';
  } else if (hasOneTime) {
    // A completed-work invoice is a one-time project even if it lists devices/hours.
    pricing_basis = 'one_time_project';
    basis_confidence = hasPerDevice || hasPerHour || hasPerVisit ? 'medium' : 'high';
  } else if (hasPerDevice) {
    pricing_basis = 'per_device';
    basis_confidence = 'medium';
  } else if (hasPerHour) {
    pricing_basis = 'per_hour';
    basis_confidence = 'medium';
  } else if (hasPerVisit) {
    pricing_basis = 'per_visit';
    basis_confidence = 'medium';
  }

  return {
    pricing_basis,
    unit_count: unitCount,
    unit_label: unitLabel,
    basis_confidence,
    basis_evidence: evidence,
  };
}

/**
 * Infer a vendor result's pricing basis from its (existing) price_unit and free
 * price_reference / note text. No DB schema change — works for old rows too.
 */
export function inferVendorPricingBasis(input: {
  price_unit?: string | null;
  price_reference?: string | null;
  price_evidence_note?: string | null;
  description?: string | null;
  explicit_basis?: string | null;
}): PricingBasis {
  // An explicit basis from the Edge (Phase 5B) takes priority when valid.
  const explicit = clean(input.explicit_basis).trim().toLowerCase().replace(/[\s-]+/g, '_');
  if ((ALL_PRICING_BASES as string[]).includes(explicit) && explicit !== 'unknown') {
    return explicit as PricingBasis;
  }

  const unit = clean(input.price_unit).toLowerCase();
  const text = [clean(input.price_reference), clean(input.price_evidence_note), clean(input.description)]
    .join(' ')
    .toLowerCase();

  const mentionsPerDevice = /per\s+device|each\s+device|\/\s*device|per\s+backflow/.test(text);
  const mentionsAnnual = /\bannual\b|\byearly\b|per\s+year|\/\s*year/.test(`${unit} ${text}`);

  if (unit === 'year' || mentionsAnnual) {
    return mentionsPerDevice ? 'per_device_per_year' : 'annual_contract';
  }
  if (unit === 'month' || /\bmonthly\b|per\s+month/.test(text)) return 'monthly_contract';
  if (unit === 'visit' || /per\s+visit|service\s+call|call[-\s]?out/.test(text)) return 'per_visit';
  if (unit === 'hour' || /\bhourly\b|per\s+hour/.test(text)) return 'per_hour';
  if (mentionsPerDevice || unit === 'unit' || /per\s+unit|each/.test(text)) return 'per_device';
  if (
    unit === 'one-time' ||
    unit === 'one_time' ||
    /one[-\s]?time|lump\s*sum|\bproject\b|fixed\s+(price|quote)/.test(text)
  ) {
    return 'one_time_project';
  }
  return 'unknown';
}

export type BasisComparability = {
  comparable: boolean;
  /** True when bases could align only after unit normalization (not done this phase). */
  requires_normalization: boolean;
  reason: string;
};

/**
 * Comparability gate. Conservative by design: when in doubt, NOT comparable —
 * a missing benchmark is safer than a misleading one.
 */
export function isPricingBasisComparable(
  quoteBasis: PricingBasis,
  vendorBasis: PricingBasis,
): BasisComparability {
  const ok = (reason: string): BasisComparability => ({ comparable: true, requires_normalization: false, reason });
  const no = (reason: string): BasisComparability => ({ comparable: false, requires_normalization: false, reason });
  const norm = (reason: string): BasisComparability => ({ comparable: false, requires_normalization: true, reason });

  if (quoteBasis === 'unknown' || vendorBasis === 'unknown') {
    return no('basis unknown on one side');
  }
  if (quoteBasis === vendorBasis) return ok('same basis');

  switch (quoteBasis) {
    case 'one_time_project':
      if (vendorBasis === 'per_visit') return ok('one-time project vs per-visit treated as comparable');
      return no(`one-time project not comparable with ${vendorBasis}`);
    case 'per_visit':
      if (vendorBasis === 'one_time_project') return ok('per-visit vs one-time project');
      return no(`per-visit not comparable with ${vendorBasis}`);
    case 'per_device':
      if (vendorBasis === 'per_device_per_year') return norm('per-device vs per-device-per-year needs normalization');
      return no(`per-device not comparable with ${vendorBasis}`);
    case 'per_device_per_year':
      if (vendorBasis === 'annual_contract' || vendorBasis === 'per_device')
        return norm('per-device-per-year needs unit normalization');
      return no(`per-device-per-year not comparable with ${vendorBasis}`);
    case 'annual_contract':
      if (vendorBasis === 'per_device_per_year') return norm('annual vs per-device-per-year needs normalization');
      return no(`annual contract not comparable with ${vendorBasis}`);
    case 'monthly_contract':
      return no(`monthly contract not comparable with ${vendorBasis}`);
    case 'per_hour':
      return no('per-hour requires labour-hour normalization (not done this phase)');
    default:
      return no('unrecognized quote basis');
  }
}

/** Friendly label for a pricing basis. */
export function pricingBasisLabel(basis: PricingBasis, en: boolean): string {
  const map: Record<PricingBasis, { en: string; zh: string }> = {
    one_time_project: { en: 'one-time project', zh: '一次性项目' },
    per_visit: { en: 'per visit', zh: '按次上门' },
    per_device: { en: 'per device', zh: '按设备' },
    per_device_per_year: { en: 'per device / year', zh: '按设备/每年' },
    annual_contract: { en: 'annual contract', zh: '年度合同' },
    monthly_contract: { en: 'monthly contract', zh: '月度合同' },
    per_hour: { en: 'per hour', zh: '按小时' },
    unknown: { en: 'unknown', zh: '未知' },
  };
  return en ? map[basis].en : map[basis].zh;
}

/** Read a stored QuotePricingContext from a parsed_quote_json record. Tolerant of old jobs. */
export function readQuotePricingContext(
  pq: Record<string, unknown> | null | undefined,
): QuotePricingContext | null {
  if (!pq || typeof pq !== 'object') return null;
  const ctx = (pq as Record<string, unknown>).quote_pricing_context as
    | Record<string, unknown>
    | undefined;
  const basisRaw =
    (ctx && typeof ctx.pricing_basis === 'string' && ctx.pricing_basis) ||
    (typeof (pq as Record<string, unknown>).pricing_basis === 'string' &&
      ((pq as Record<string, unknown>).pricing_basis as string)) ||
    '';
  const basis = (ALL_PRICING_BASES as string[]).includes(basisRaw) ? (basisRaw as PricingBasis) : null;
  if (!basis) return null;

  const unitCountRaw = ctx?.unit_count ?? (pq as Record<string, unknown>).unit_count;
  const unit_count =
    typeof unitCountRaw === 'number' && Number.isFinite(unitCountRaw) ? unitCountRaw : null;
  const unit_label =
    (ctx && typeof ctx.unit_label === 'string' && ctx.unit_label) ||
    (typeof (pq as Record<string, unknown>).unit_label === 'string'
      ? ((pq as Record<string, unknown>).unit_label as string)
      : null) ||
    null;
  const conf = ctx && typeof ctx.basis_confidence === 'string' ? ctx.basis_confidence : 'low';
  const evidence = Array.isArray(ctx?.basis_evidence)
    ? (ctx!.basis_evidence as unknown[]).filter((e): e is string => typeof e === 'string')
    : [];

  return {
    pricing_basis: basis,
    unit_count,
    unit_label,
    basis_confidence: (['high', 'medium', 'low'].includes(conf as string) ? conf : 'low') as
      | 'high'
      | 'medium'
      | 'low',
    basis_evidence: evidence,
  };
}
