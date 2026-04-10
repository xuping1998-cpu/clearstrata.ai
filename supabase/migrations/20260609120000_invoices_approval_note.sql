/*
  Add approval_note to invoices.
  Used for notes when an invoice is approved, especially required for flagged (danger) cases.
*/

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS approval_note text;

COMMENT ON COLUMN public.invoices.approval_note IS 'Approval note when invoice is approved; required for flagged cases';

NOTIFY pgrst, 'reload schema';

