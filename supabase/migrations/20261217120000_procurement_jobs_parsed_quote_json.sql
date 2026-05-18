-- Phase 1: store full OCR parse result for procurement quote attachments (invoice-ocr reuse).
ALTER TABLE public.procurement_jobs
  ADD COLUMN IF NOT EXISTS parsed_quote_json jsonb;

COMMENT ON COLUMN public.procurement_jobs.parsed_quote_json IS
  'Structured quote/invoice OCR from procurement attachments (via invoice-ocr); archival + downstream AI context.';
