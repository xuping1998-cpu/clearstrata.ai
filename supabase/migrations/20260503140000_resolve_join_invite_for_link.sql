-- Deep links: /join?token=... — validate property_invites without exposing table via RLS.
-- Token may be invite code (case-insensitive) or invite row UUID.

CREATE OR REPLACE FUNCTION public.resolve_join_invite_for_link(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v text := trim(p_token);
  inv public.property_invites%ROWTYPE;
  p public.properties%ROWTYPE;
BEGIN
  IF v = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty');
  END IF;

  IF v ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT * INTO inv FROM public.property_invites WHERE id = v::uuid;
  ELSE
    SELECT * INTO inv FROM public.property_invites WHERE code = upper(v);
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF inv.status IS DISTINCT FROM 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'inactive');
  END IF;

  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF inv.max_uses > 0 AND inv.used_count >= inv.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'max_uses');
  END IF;

  SELECT * INTO p FROM public.properties WHERE id = inv.property_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'property_missing');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'property_id', p.id,
    'name', p.name,
    'slug', p.slug,
    'property_code', p.property_code
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.resolve_join_invite_for_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_join_invite_for_link(text) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_join_invite_for_link(text) TO authenticated;
