/*
  Phase 2A: procurement authorization lanes + CRF balance for SGM threshold hints.
*/

ALTER TABLE public.procurement_jobs
  ADD COLUMN IF NOT EXISTS authorization_type text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'procurement_jobs_authorization_type_check'
  ) THEN
    ALTER TABLE public.procurement_jobs
      ADD CONSTRAINT procurement_jobs_authorization_type_check
      CHECK (
        authorization_type IS NULL
        OR authorization_type IN (
          'small_unplanned',
          'emergency',
          'major_unplanned'
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.procurement_jobs.authorization_type IS
  'Procurement governance lane: small_unplanned, emergency, major_unplanned. NULL for legacy jobs.';

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS crf_balance numeric,
  ADD COLUMN IF NOT EXISTS crf_as_of_date date;

COMMENT ON COLUMN public.properties.crf_balance IS
  'Contingency Reserve Fund balance (manual / imported) for major unplanned expense threshold hints.';
COMMENT ON COLUMN public.properties.crf_as_of_date IS
  'As-of date for crf_balance.';
