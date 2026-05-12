-- Governance timeline for invoice AI audit: ledger months before start use historical reconstruction labeling.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS governance_start_date date;

COMMENT ON COLUMN public.properties.governance_start_date IS
  'First calendar month of formal procurement/budget governance; earlier ledger months use historical reconstruction audit mode (UI).';
