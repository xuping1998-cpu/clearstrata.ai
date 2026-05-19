const GST_RATE = 0.05;

export function formatVendorPriceExclGst(v: {
  price_low?: number | null;
  price_high?: number | null;
  price_currency?: string | null;
  price_unit?: string | null;
}): string | null {
  if (v.price_low == null || v.price_high == null) return null;
  const cur = v.price_currency || 'CAD';
  const unitSuffix = v.price_unit ? ` / ${v.price_unit}` : '';
  return `${cur} $${Number(v.price_low).toLocaleString()}–$${Number(v.price_high).toLocaleString()}${unitSuffix}，不含税`;
}

export function formatVendorPriceInclGst(v: {
  price_low?: number | null;
  price_high?: number | null;
  price_currency?: string | null;
  price_unit?: string | null;
}): string | null {
  if (v.price_low == null || v.price_high == null) return null;
  const cur = v.price_currency || 'CAD';
  const low = Math.round(Number(v.price_low) * (1 + GST_RATE));
  const high = Math.round(Number(v.price_high) * (1 + GST_RATE));
  const unitSuffix = v.price_unit ? ` / ${v.price_unit}` : '';
  return `${cur} $${low.toLocaleString()}–$${high.toLocaleString()}${unitSuffix}，含 GST`;
}
