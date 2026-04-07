-- RLS DELETE for staff on property_invite_codes + property_direct_invites (admin UI delete row).
-- Idempotent if column already added in 20260510120000.

ALTER TABLE public.property_invite_codes ADD COLUMN IF NOT EXISTS expires_at timestamptz;

DROP POLICY IF EXISTS "pic_delete_property" ON public.property_invite_codes;
CREATE POLICY "pic_delete_property"
  ON public.property_invite_codes FOR DELETE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = property_invite_codes.property_id
        AND pm.status = 'active'::member_status
        AND pm.role IN ('property_admin', 'admin', 'council', 'manager')
    )
  );

DROP POLICY IF EXISTS "pdi_delete_property" ON public.property_direct_invites;
CREATE POLICY "pdi_delete_property"
  ON public.property_direct_invites FOR DELETE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = property_direct_invites.property_id
        AND pm.status = 'active'::member_status
        AND pm.role IN ('property_admin', 'admin', 'council', 'manager')
    )
  );

GRANT DELETE ON public.property_invite_codes TO authenticated;
GRANT DELETE ON public.property_direct_invites TO authenticated;

-- Ensure resolve_public_invite_code enforces expires_at (for DBs that ran an older 20260510120000).
CREATE OR REPLACE FUNCTION public.resolve_public_invite_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  c text := NULLIF(trim(p_code), '');
  pic public.property_invite_codes%ROWTYPE;
  pname text;
BEGIN
  IF c IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  SELECT * INTO pic
  FROM public.property_invite_codes
  WHERE code = c OR lower(code) = lower(c)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  IF NOT pic.is_active THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  IF pic.expires_at IS NOT NULL AND pic.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  IF pic.max_uses > 0 AND pic.used_count >= pic.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'exhausted');
  END IF;

  SELECT name INTO pname FROM public.properties WHERE id = pic.property_id;

  RETURN jsonb_build_object(
    'ok', true,
    'property_id', pic.property_id,
    'property_name', COALESCE(pname, ''),
    'invite_code', pic.code,
    'label', pic.label
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.resolve_public_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_public_invite_code(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
