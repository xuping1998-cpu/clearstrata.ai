-- Optional mailing / display address for properties (owner-facing cards, PDFs, etc.)
-- city may already exist from client onboarding inserts; IF NOT EXISTS keeps this safe.

BEGIN;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS postal_code text;

COMMIT;
