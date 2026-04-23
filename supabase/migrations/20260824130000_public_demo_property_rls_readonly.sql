/*
  # Public demo property (BCS3736) — RLS read-only for non-members

  - Demo row is resolved the same way as `resolve_public_demo_property('BCS3736')` (code / slug / property_code).
  - SELECT: any authenticated user may read rows scoped to that property_id (in addition to existing tenant policies).
  - INSERT/UPDATE/DELETE: unchanged for existing policies; most already require `property_id IN user_property_ids()`.
  - `join_requests` INSERT (`jr_insert_own`): non-members may not insert rows targeting the demo property.

  Idempotent: DROP POLICY IF EXISTS + CREATE; function CREATE OR REPLACE.
*/

-- ---------------------------------------------------------------------------
-- 1) Predicate: is this row's property the single public demo property?
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_public_demo_property(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_property_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.resolve_public_demo_property('BCS3736') AS d
      WHERE d.id = p_property_id
    );
$$;

COMMENT ON FUNCTION public.is_public_demo_property(uuid) IS
  'True when p_property_id is the allowlisted BCS3736 demo property (resolve_public_demo_property). Used by RLS read-only demo policies.';

REVOKE ALL ON FUNCTION public.is_public_demo_property(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_public_demo_property(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) join_requests: block non-member inserts targeting demo property
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "jr_insert_own" ON public.join_requests;
CREATE POLICY "jr_insert_own"
  ON public.join_requests FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      NOT public.is_public_demo_property(join_requests.property_id)
      OR join_requests.property_id IN (SELECT public.user_property_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- 3) properties: read demo row by id (column is `id`, not property_id)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "properties_select_public_demo" ON public.properties;
CREATE POLICY "properties_select_public_demo"
  ON public.properties FOR SELECT TO authenticated
  USING (public.is_public_demo_property(properties.id));

-- ---------------------------------------------------------------------------
-- 4) All other public tables: extra SELECT policy on property_id (RLS only)
-- ---------------------------------------------------------------------------

DO $demo$
DECLARE
  r record;
  pol text := '_select_public_demo_read';
BEGIN
  FOR r IN
    SELECT c.relname::text AS tname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity
      AND EXISTS (
        SELECT 1
        FROM pg_attribute a
        WHERE a.attrelid = c.oid
          AND a.attname = 'property_id'
          AND a.attnum > 0
          AND NOT a.attisdropped
      )
      AND c.relname <> 'properties'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.tname || pol, r.tname);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_public_demo_property(property_id))',
      r.tname || pol,
      r.tname
    );
  END LOOP;
END
$demo$;

-- ---------------------------------------------------------------------------
-- 5) Storage: invoice-audit PDFs for demo property (optional helper)
-- ---------------------------------------------------------------------------

DO $st$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'invoice_audit_report_storage_property_id'
  ) THEN
    EXECUTE $q$
      DROP POLICY IF EXISTS "invoice_audit_reports_storage_select_public_demo" ON storage.objects;
      CREATE POLICY "invoice_audit_reports_storage_select_public_demo"
        ON storage.objects FOR SELECT TO authenticated
        USING (
          bucket_id = 'invoice-audit-reports'
          AND public.is_public_demo_property(public.invoice_audit_report_storage_property_id(name))
        );
    $q$;
  END IF;
END
$st$;

NOTIFY pgrst, 'reload schema';
