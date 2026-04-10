
/*
  Idempotent migration: ensure invoices.quote_id exists.
  If it was already added in an earlier migration, this will safely skip.
*/

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.procurement_quotes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_quote
  ON public.invoices(quote_id);

NOTIFY pgrst, 'reload schema';


