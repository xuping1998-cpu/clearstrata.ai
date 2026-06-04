/*
  bootstrap_property_creator_membership
  Create-property flow: first active membership for the creator via SECURITY DEFINER.
  Replaces revoked authenticated INSERT on property_members (20260729120000).
*/

BEGIN;

CREATE OR REPLACE FUNCTION public.bootstrap_property_creator_membership(
  p_property_id uuid,
  p_role text,
  p_unit_no text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_role public.user_role;
  v_unit text := NULLIF(trim(coalesce(p_unit_no, '')), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_property_id IS NULL THEN
    RAISE EXCEPTION 'property_id_required' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.properties p WHERE p.id = p_property_id) THEN
    RAISE EXCEPTION 'property_not_found' USING ERRCODE = 'P0002';
  END IF;

  BEGIN
    v_role := trim(coalesce(p_role, ''))::public.user_role;
  EXCEPTION
    WHEN others THEN
      RAISE EXCEPTION 'invalid_role' USING ERRCODE = '22023';
  END;

  IF v_role NOT IN ('admin', 'council', 'manager', 'property_admin') THEN
    RAISE EXCEPTION 'invalid_role' USING ERRCODE = '22023';
  END IF;

  -- Creator bootstrap only: property contact email matches caller, or property has no members yet.
  IF EXISTS (SELECT 1 FROM public.property_members pm WHERE pm.property_id = p_property_id)
     AND NOT EXISTS (
       SELECT 1
       FROM public.properties p
       JOIN public.profiles pr ON pr.id = v_uid
       WHERE p.id = p_property_id
         AND lower(trim(coalesce(p.contact_email, ''))) = lower(trim(coalesce(pr.email, '')))
         AND trim(coalesce(p.contact_email, '')) <> ''
     )
  THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.property_members (
    property_id,
    user_id,
    role,
    status,
    unit_no,
    approved_by,
    approved_at
  ) VALUES (
    p_property_id,
    v_uid,
    v_role,
    'active',
    v_unit,
    v_uid,
    now()
  )
  ON CONFLICT (property_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'property_id', p_property_id, 'user_id', v_uid);
END;
$fn$;

REVOKE ALL ON FUNCTION public.bootstrap_property_creator_membership(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_property_creator_membership(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.bootstrap_property_creator_membership(uuid, text, text) IS
  'Create-property onboarding: insert active property_members row for auth.uid(); idempotent on (property_id, user_id).';

NOTIFY pgrst, 'reload schema';

COMMIT;
