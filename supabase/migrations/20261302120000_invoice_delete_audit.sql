/*
  Phase Audit Trail – P0-1: invoice delete audit

  - Ensure invoice_audit_log exists (fresh or partial environments).
  - Preserve audit rows when invoices are hard-deleted (SET NULL FK, not CASCADE).
  - Snapshot deleted invoice metadata on delete action.
  - Route deletes through SECURITY DEFINER RPC matching inv_delete_tenant semantics.

  Manual run: execute NOTIFY pgrst, 'reload schema'; separately after COMMIT if needed.
*/

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) Base table (no-op when already present from earlier migrations)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.invoice_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  notes text,
  old_status text,
  new_status text,
  invoice_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 1) Idempotent repair: columns + invoice_id FK (CASCADE → SET NULL)
-- ---------------------------------------------------------------------------

ALTER TABLE public.invoice_audit_log
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE public.invoice_audit_log
  ADD COLUMN IF NOT EXISTS invoice_snapshot jsonb;

COMMENT ON COLUMN public.invoice_audit_log.invoice_snapshot IS
  'Frozen invoice fields for delete (and other) audit entries after invoice row is removed.';

DO $drop_fk$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'invoice_audit_log'
      AND c.contype = 'f'
      AND EXISTS (
        SELECT 1
        FROM unnest(c.conkey) AS colnum(attnum)
        JOIN pg_attribute a
          ON a.attrelid = t.oid
         AND a.attnum = colnum.attnum
         AND a.attname = 'invoice_id'
         AND NOT a.attisdropped
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE public.invoice_audit_log DROP CONSTRAINT IF EXISTS %I',
      r.conname
    );
  END LOOP;
END;
$drop_fk$;

ALTER TABLE public.invoice_audit_log
  ALTER COLUMN invoice_id DROP NOT NULL;

DO $add_fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'invoice_audit_log'
      AND c.conname = 'invoice_audit_log_invoice_id_fkey'
  ) THEN
    ALTER TABLE public.invoice_audit_log
      ADD CONSTRAINT invoice_audit_log_invoice_id_fkey
      FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;
  END IF;
END;
$add_fk$;

-- ---------------------------------------------------------------------------
-- 2) Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_invoice_audit_log_property_id
  ON public.invoice_audit_log (property_id);

CREATE INDEX IF NOT EXISTS idx_invoice_audit_log_invoice_id
  ON public.invoice_audit_log (invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_audit_log_actor_id
  ON public.invoice_audit_log (actor_id);

CREATE INDEX IF NOT EXISTS idx_invoice_audit_log_action
  ON public.invoice_audit_log (action);

-- ---------------------------------------------------------------------------
-- 3) RPC: delete_invoice_with_audit
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_invoice_with_audit(p_invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_invoice public.invoices%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  IF p_invoice_id IS NULL THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT *
  INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = v_invoice.property_id
      AND pm.user_id = v_actor
      AND pm.status::text = 'active'
      AND (
        v_invoice.uploaded_by = v_actor
        OR pm.role::text IN ('council', 'admin', 'property_admin', 'manager')
      )
  ) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.invoice_audit_log (
    property_id,
    invoice_id,
    actor_id,
    action,
    old_status,
    new_status,
    notes,
    invoice_snapshot
  ) VALUES (
    v_invoice.property_id,
    v_invoice.id,
    v_actor,
    'delete',
    v_invoice.status::text,
    NULL,
    'Invoice deleted',
    jsonb_build_object(
      'id', v_invoice.id,
      'file_name', v_invoice.file_name,
      'invoice_number', v_invoice.invoice_number,
      'vendor_name', v_invoice.vendor_name,
      'invoice_date', v_invoice.invoice_date,
      'accounting_year', v_invoice.accounting_year,
      'accounting_month', v_invoice.accounting_month,
      'total_amount', v_invoice.total_amount,
      'subtotal', v_invoice.subtotal,
      'tax_amount', v_invoice.tax_amount,
      'currency', v_invoice.currency,
      'status', v_invoice.status::text,
      'document_url', v_invoice.document_url,
      'uploaded_by', v_invoice.uploaded_by,
      'created_at', v_invoice.created_at
    )
  );

  DELETE FROM public.invoices
  WHERE id = p_invoice_id
    AND property_id = v_invoice.property_id;

  RETURN jsonb_build_object('ok', true, 'invoice_id', p_invoice_id);
END;
$fn$;

COMMENT ON FUNCTION public.delete_invoice_with_audit(uuid) IS
  'Hard-delete an invoice after writing invoice_audit_log (action=delete). Matches inv_delete_tenant permission semantics.';

REVOKE ALL ON FUNCTION public.delete_invoice_with_audit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_invoice_with_audit(uuid) TO authenticated;

COMMIT;

-- PostgREST schema reload (safe after COMMIT; re-run alone if executing this file manually in parts)
NOTIFY pgrst, 'reload schema';
