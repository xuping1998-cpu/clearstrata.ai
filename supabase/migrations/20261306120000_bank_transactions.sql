/*
  # Bank CSV import — bank_transactions + bank_import_batches (Phase 1A)

  Property-level bank statement rows from Council/Treasurer CSV upload.
  Dedupe: (property_id, transaction_date, amount, description).
*/

BEGIN;

-- ---------------------------------------------------------------------------
-- bank_transactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  transaction_date date NOT NULL,
  description text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  transaction_type text,
  reference_number text,
  balance numeric(12, 2),
  source_bank text,
  import_batch_id uuid,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_property
  ON public.bank_transactions(property_id);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_date
  ON public.bank_transactions(transaction_date);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_batch
  ON public.bank_transactions(import_batch_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_transactions_dedupe
  ON public.bank_transactions(property_id, transaction_date, amount, description);

-- ---------------------------------------------------------------------------
-- bank_import_batches
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bank_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  source_bank text,
  uploaded_by uuid REFERENCES auth.users(id),
  total_rows integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  failed_rows integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_import_batches_property
  ON public.bank_import_batches(property_id);

-- FK from transactions → batches (after batches table exists)
DO $fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'bank_transactions'
      AND constraint_name = 'bank_transactions_import_batch_id_fkey'
  ) THEN
    ALTER TABLE public.bank_transactions
      ADD CONSTRAINT bank_transactions_import_batch_id_fkey
      FOREIGN KEY (import_batch_id) REFERENCES public.bank_import_batches(id) ON DELETE SET NULL;
  END IF;
END $fk$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bt_select_tenant" ON public.bank_transactions;
DROP POLICY IF EXISTS "bt_insert_staff" ON public.bank_transactions;
DROP POLICY IF EXISTS "bt_delete_council_admin" ON public.bank_transactions;

CREATE POLICY "bt_select_tenant"
  ON public.bank_transactions FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "bt_insert_staff"
  ON public.bank_transactions FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_staff_ids())
    AND uploaded_by = (SELECT auth.uid())
  );

CREATE POLICY "bt_delete_council_admin"
  ON public.bank_transactions FOR DELETE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = bank_transactions.property_id
        AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'property_admin')
    )
  );

DROP POLICY IF EXISTS "bib_select_tenant" ON public.bank_import_batches;
DROP POLICY IF EXISTS "bib_insert_staff" ON public.bank_import_batches;
DROP POLICY IF EXISTS "bib_delete_council_admin" ON public.bank_import_batches;

CREATE POLICY "bib_select_tenant"
  ON public.bank_import_batches FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "bib_insert_staff"
  ON public.bank_import_batches FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_staff_ids())
    AND uploaded_by = (SELECT auth.uid())
  );

CREATE POLICY "bib_delete_council_admin"
  ON public.bank_import_batches FOR DELETE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = bank_import_batches.property_id
        AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'property_admin')
    )
  );

COMMIT;

NOTIFY pgrst, 'reload schema';
