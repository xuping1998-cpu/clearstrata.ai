/*
  # bank_import_batches — staff UPDATE for AI parse status (Phase P2A)
*/

BEGIN;

DROP POLICY IF EXISTS "bib_update_staff" ON public.bank_import_batches;

CREATE POLICY "bib_update_staff"
  ON public.bank_import_batches FOR UPDATE TO authenticated
  USING (property_id IN (SELECT public.user_property_staff_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_staff_ids()));

COMMIT;

NOTIFY pgrst, 'reload schema';
