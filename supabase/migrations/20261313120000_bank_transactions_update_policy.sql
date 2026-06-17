/*
  # bank_transactions — staff UPDATE for re-parse upsert (Phase P2B-3C-1)

  Allows ON CONFLICT DO UPDATE from client upsert to refresh statement_line_no,
  balance, source_bank, import_batch_id after AI re-parse.
*/

BEGIN;

DROP POLICY IF EXISTS "bt_update_staff" ON public.bank_transactions;

CREATE POLICY "bt_update_staff"
  ON public.bank_transactions FOR UPDATE TO authenticated
  USING (property_id IN (SELECT public.user_property_staff_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_staff_ids()));

COMMIT;

NOTIFY pgrst, 'reload schema';
