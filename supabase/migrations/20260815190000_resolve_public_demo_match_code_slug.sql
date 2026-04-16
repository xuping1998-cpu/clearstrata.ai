-- Demo `/demo/BCS3736`: resolve row when BCS3736 is stored in `code` or `slug`, not only `property_code`.
-- Replaces logic from 20260712120000_public_demo_read_rpcs.sql after that migration has applied.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS code text;

CREATE OR REPLACE FUNCTION public.resolve_public_demo_property(p_code text)
RETURNS TABLE(id uuid, name text, property_code text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm text := lower(trim(coalesce(p_code, '')));
BEGIN
  IF v_norm <> 'bcs3736' THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    COALESCE(
      NULLIF(trim(p.property_code), ''),
      NULLIF(trim(p.code), ''),
      NULLIF(trim(p.slug), '')
    )::text AS property_code
  FROM public.properties p
  WHERE
    lower(trim(coalesce(p.property_code, ''))) = 'bcs3736'
    OR lower(trim(coalesce(p.code, ''))) = 'bcs3736'
    OR lower(trim(coalesce(p.slug, ''))) = 'bcs3736'
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.resolve_public_demo_property(text) IS
  'Resolve id/name for public demo; allowlisted code bcs3736; matches property_code, code, or slug.';

CREATE OR REPLACE FUNCTION public.claim_public_demo_property_membership(p_property_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_demo uuid;
BEGIN
  SELECT r.id INTO v_demo
  FROM public.resolve_public_demo_property('BCS3736') AS r
  LIMIT 1;

  IF v_demo IS NULL OR p_property_id IS DISTINCT FROM v_demo OR v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.property_members pm
    WHERE pm.user_id = v_uid AND pm.property_id = v_demo
  ) THEN
    RETURN v_demo;
  END IF;

  INSERT INTO public.property_members (user_id, property_id, role, status)
  VALUES (v_uid, v_demo, 'owner'::public.user_role, 'active');

  RETURN v_demo;
END;
$$;

COMMENT ON FUNCTION public.claim_public_demo_property_membership(uuid) IS
  'After signup from public demo: add active membership for the single resolve_public_demo_property row only.';
