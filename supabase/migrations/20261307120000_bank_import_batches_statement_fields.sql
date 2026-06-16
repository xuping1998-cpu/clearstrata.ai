/*
  # bank_import_batches — PDF statement archive fields (Phase 1A.1)

  Supports CSV import (status=imported) and PDF statement upload (status=pending_parse).
*/

BEGIN;

ALTER TABLE public.bank_import_batches
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS file_type text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'imported',
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.bank_import_batches.file_path IS 'Storage path for PDF statements (documents bucket).';
COMMENT ON COLUMN public.bank_import_batches.file_type IS 'csv | pdf';
COMMENT ON COLUMN public.bank_import_batches.status IS 'imported | pending_parse | parse_failed';

CREATE INDEX IF NOT EXISTS idx_bank_import_batches_status
  ON public.bank_import_batches(property_id, status);

COMMIT;

NOTIFY pgrst, 'reload schema';
