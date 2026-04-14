/*
  # property_members: surrogate id + no direct client writes + member RPCs

  - Adds stable `id` (uuid) for PostgREST `p_member_id` on member actions.
  - Revokes INSERT/UPDATE/DELETE on `property_members` from `authenticated`; SELECT retained.
  - Drops council UPDATE policy (writes go through SECURITY DEFINER RPCs only).
  - `approve_join_request(p_request_id, p_unit_no, p_property_id)` — council-only gate, then delegates to `approve_join_request_final`.
  - Revokes EXECUTE on `approve_join_request_final` from `authenticated` (call `approve_join_request` only).
  - `update_member_role`, `freeze_member`, `remove_member` — active council on same property; reuse row triggers for last-council / self rules.
*/

-- ---------------------------------------------------------------------------
-- 1) Surrogate id (composite PK unchanged)
-- ---------------------------------------------------------------------------

ALTER TABLE public.property_members ADD COLUMN IF NOT EXISTS id uuid;

UPDATE public.property_members
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE public.property_members ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.property_members ALTER COLUMN id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS property_members_id_uk ON public.property_members (id);

COMMENT ON COLUMN public.property_members.id IS 'Stable row id for RPC member actions (PostgREST). Composite PK remains (property_id, user_id).';

-- ---------------------------------------------------------------------------
-- 2) Strip authenticated DML + council UPDATE policy
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "property_members_council_update" ON public.property_members;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.property_members FROM authenticated;

GRANT SELECT ON TABLE public.property_members TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) approve_join_request — council-only wrapper → approve_join_request_final
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.approve_join_request(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.approve_join_request(
  p_request_id uuid,
  p_unit_no text DEFAULT NULL,
  p_property_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_property_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'not_authenticated',
      'email', null,
      'user_id', null,
      'property_id', null,
      'unit_no', null,
      'residents_outcome', null,
      'property_members_upserted', false,
      'join_request_status_updated', false
    );
  END IF;

  SELECT jr.property_id
  INTO v_property_id
  FROM public.join_requests jr
  WHERE jr.id = p_request_id;

  IF v_property_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'not_found',
      'email', null,
      'user_id', null,
      'property_id', null,
      'unit_no', null,
      'residents_outcome', null,
      'property_members_upserted', false,
      'join_request_status_updated', false
    );
  END IF;

  IF p_property_id IS NOT NULL AND p_property_id IS DISTINCT FROM v_property_id THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'property_mismatch',
      'email', null,
      'user_id', null,
      'property_id', p_property_id,
      'unit_no', null,
      'residents_outcome', null,
      'property_members_upserted', false,
      'join_request_status_updated', false
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.user_id = (SELECT auth.uid())
      AND pm.property_id = v_property_id
      AND pm.status = 'active'::public.member_status
      AND pm.role = 'council'::public.user_role
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'forbidden',
      'email', null,
      'user_id', null,
      'property_id', v_property_id,
      'unit_no', null,
      'residents_outcome', null,
      'property_members_upserted', false,
      'join_request_status_updated', false
    );
  END IF;

  RETURN public.approve_join_request_final(
    p_request_id,
    v_property_id,
    NULLIF(trim(coalesce(p_unit_no, '')), '')
  );
END;
$fn$;

COMMENT ON FUNCTION public.approve_join_request(uuid, text, uuid) IS
  'Council-only join approval; delegates to approve_join_request_final with property_id from join_requests.';

REVOKE ALL ON FUNCTION public.approve_join_request(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_join_request(uuid, text, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.approve_join_request_final(uuid, uuid, text) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.approve_join_request_final(uuid, uuid, text) TO service_role;

-- ---------------------------------------------------------------------------
-- 4) Member management RPCs (active council on same property)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._assert_council_can_manage_member_row(p_member_id uuid)
RETURNS public.property_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $assert$
DECLARE
  tgt public.property_members%ROWTYPE;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'property_members_rpc:not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO tgt
  FROM public.property_members pm
  WHERE pm.id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'property_members_rpc:not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.user_id = (SELECT auth.uid())
      AND pm.property_id = tgt.property_id
      AND pm.status = 'active'::public.member_status
      AND pm.role = 'council'::public.user_role
  ) THEN
    RAISE EXCEPTION 'property_members_rpc:forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN tgt;
END;
$assert$;

REVOKE ALL ON FUNCTION public._assert_council_can_manage_member_row(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.update_member_role(p_member_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $ur$
DECLARE
  v_norm text := lower(trim(coalesce(p_role, '')));
  v_role public.user_role;
  tgt public.property_members%ROWTYPE;
BEGIN
  tgt := public._assert_council_can_manage_member_row(p_member_id);

  IF v_norm NOT IN ('owner', 'council', 'manager') THEN
    RAISE EXCEPTION 'property_members_rpc:invalid_role' USING ERRCODE = '23514';
  END IF;

  v_role := v_norm::public.user_role;

  UPDATE public.property_members pm
  SET
    role = v_role,
    status = CASE
      WHEN v_role = 'council'::public.user_role THEN 'active'::public.member_status
      WHEN pm.status = 'inactive'::public.member_status THEN 'active'::public.member_status
      ELSE pm.status
    END
  WHERE pm.id = p_member_id;
END;
$ur$;

CREATE OR REPLACE FUNCTION public.freeze_member(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fz$
BEGIN
  PERFORM public._assert_council_can_manage_member_row(p_member_id);

  UPDATE public.property_members pm
  SET status = 'inactive'::public.member_status
  WHERE pm.id = p_member_id;
END;
$fz$;

CREATE OR REPLACE FUNCTION public.remove_member(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $rm$
BEGIN
  PERFORM public._assert_council_can_manage_member_row(p_member_id);

  UPDATE public.property_members pm
  SET status = 'removed'::public.member_status
  WHERE pm.id = p_member_id;
END;
$rm$;

COMMENT ON FUNCTION public.update_member_role(uuid, text) IS 'Council-only: update property_members.role (+ activate from inactive / council→active).';
COMMENT ON FUNCTION public.freeze_member(uuid) IS 'Council-only: set property_members.status to inactive.';
COMMENT ON FUNCTION public.remove_member(uuid) IS 'Council-only: soft-remove (status removed); trigger clears residents binding.';

REVOKE ALL ON FUNCTION public.update_member_role(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.freeze_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_member(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.update_member_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.freeze_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_member(uuid) TO authenticated;
