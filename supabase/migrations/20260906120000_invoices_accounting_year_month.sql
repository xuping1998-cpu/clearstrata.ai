/*
  Bookkeeping archive period for finance UI (user-selected calendar year/month).
  Not invoice_date / upload time — explicit accounting_year / accounting_month.
*/

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS accounting_year integer,
  ADD COLUMN IF NOT EXISTS accounting_month integer;

COMMENT ON COLUMN public.invoices.accounting_year IS
  'Accounting (bookkeeping) calendar year for filing; chosen at upload.';
COMMENT ON COLUMN public.invoices.accounting_month IS
  'Accounting (bookkeeping) calendar month 1–12 for filing; chosen at upload.';

-- Backfill: prefer fiscal_year for year when present; month from created_at (no invoice_date).
UPDATE public.invoices
SET
  accounting_year = COALESCE(
    accounting_year,
    fiscal_year,
    EXTRACT(YEAR FROM COALESCE(created_at, now()) AT TIME ZONE 'UTC')::integer
  ),
  accounting_month = COALESCE(
    accounting_month,
    EXTRACT(MONTH FROM COALESCE(created_at, now()) AT TIME ZONE 'UTC')::integer
  )
WHERE accounting_year IS NULL
   OR accounting_month IS NULL;

UPDATE public.invoices
SET accounting_month = GREATEST(1, LEAST(12, accounting_month))
WHERE accounting_month IS NOT NULL
  AND (accounting_month < 1 OR accounting_month > 12);

ALTER TABLE public.invoices
  ALTER COLUMN accounting_year SET DEFAULT (EXTRACT(YEAR FROM now())::integer),
  ALTER COLUMN accounting_month SET DEFAULT (EXTRACT(MONTH FROM now())::integer);

ALTER TABLE public.invoices
  ALTER COLUMN accounting_year SET NOT NULL,
  ALTER COLUMN accounting_month SET NOT NULL;

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_accounting_month_check;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_accounting_month_check
  CHECK (accounting_month >= 1 AND accounting_month <= 12);

CREATE INDEX IF NOT EXISTS idx_invoices_property_accounting_period
  ON public.invoices (property_id, accounting_year DESC, accounting_month DESC);
