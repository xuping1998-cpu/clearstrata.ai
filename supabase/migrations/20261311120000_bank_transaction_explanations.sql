/*
  # Bank transaction explanations — Council oversight workflow (Phase P2B-3)
*/

BEGIN;

CREATE TABLE IF NOT EXISTS public.bank_transaction_explanations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_transaction_id uuid NOT NULL
    REFERENCES public.bank_transactions(id) ON DELETE CASCADE,
  property_id uuid NOT NULL
    REFERENCES public.properties(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL
    REFERENCES auth.users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  manager_response text,
  responded_by uuid REFERENCES auth.users(id),
  responded_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  CONSTRAINT bank_transaction_explanations_status_check
    CHECK (status IN ('pending', 'responded', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_bte_property
  ON public.bank_transaction_explanations(property_id);

CREATE INDEX IF NOT EXISTS idx_bte_bank_transaction
  ON public.bank_transaction_explanations(bank_transaction_id);

CREATE INDEX IF NOT EXISTS idx_bte_status
  ON public.bank_transaction_explanations(property_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bte_one_open_per_transaction
  ON public.bank_transaction_explanations(bank_transaction_id)
  WHERE status IN ('pending', 'responded');

COMMENT ON TABLE public.bank_transaction_explanations IS
  'Council requests manager explanation for unexplained bank payments; AGM oversight evidence.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.bank_transaction_explanations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bte_select_tenant" ON public.bank_transaction_explanations;
DROP POLICY IF EXISTS "bte_insert_council" ON public.bank_transaction_explanations;
DROP POLICY IF EXISTS "bte_update_council" ON public.bank_transaction_explanations;
DROP POLICY IF EXISTS "bte_update_manager" ON public.bank_transaction_explanations;
DROP POLICY IF EXISTS "bte_delete_council" ON public.bank_transaction_explanations;

CREATE POLICY "bte_select_tenant"
  ON public.bank_transaction_explanations FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "bte_insert_council"
  ON public.bank_transaction_explanations FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND requested_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = bank_transaction_explanations.property_id
        AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'property_admin')
    )
  );

CREATE POLICY "bte_update_council"
  ON public.bank_transaction_explanations FOR UPDATE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = bank_transaction_explanations.property_id
        AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'property_admin')
    )
  )
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "bte_update_manager"
  ON public.bank_transaction_explanations FOR UPDATE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_staff_ids())
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = bank_transaction_explanations.property_id
        AND pm.status = 'active'
        AND pm.role = 'manager'
    )
  )
  WITH CHECK (
    property_id IN (SELECT public.user_property_staff_ids())
    AND status = 'responded'
    AND manager_response IS NOT NULL
    AND trim(manager_response) <> ''
    AND responded_by = (SELECT auth.uid())
  );

CREATE POLICY "bte_delete_council"
  ON public.bank_transaction_explanations FOR DELETE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = bank_transaction_explanations.property_id
        AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'property_admin')
    )
  );

COMMIT;

NOTIFY pgrst, 'reload schema';
