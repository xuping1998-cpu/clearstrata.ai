-- Phase 1: vendor search price evidence fields (search-quotes web evidence, not invented pricing).

ALTER TABLE public.vendor_search_results
  ADD COLUMN IF NOT EXISTS price_low numeric,
  ADD COLUMN IF NOT EXISTS price_high numeric,
  ADD COLUMN IF NOT EXISTS price_currency text DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS price_unit text,
  ADD COLUMN IF NOT EXISTS price_source_url text,
  ADD COLUMN IF NOT EXISTS price_confidence text,
  ADD COLUMN IF NOT EXISTS price_evidence_note text;

COMMENT ON COLUMN public.vendor_search_results.price_low IS 'Lower bound from verifiable public source; null if no evidence.';
COMMENT ON COLUMN public.vendor_search_results.price_high IS 'Upper bound from verifiable public source; null if no evidence.';
COMMENT ON COLUMN public.vendor_search_results.price_evidence_note IS 'Source note or "Pricing requires formal quote" when no public evidence.';
