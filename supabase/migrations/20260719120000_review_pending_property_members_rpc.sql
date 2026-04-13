/*
  # Approve / reject pending `property_members` (admin + council on same property)

  - Caller must have an **active** row on `p_property_id` with role **admin** or **council**.
  - Target row must be **pending** (except `remove` only applies to pending rows).
  - `approve`: set `property_members.status` → active; align `residents` + `profiles` to active when present.
  - `suspend`: set membership → suspended; residents → deregistered; profiles → suspended.
  - `remove`: delete pending membership row; same residents/profiles side-effects as suspend.

  RLS does not grant authenticated UPDATE on `property_members`; this RPC runs as SECURITY DEFINER.
*/

CREATE OR REPLACE FUNCTION public.review_property_member_membership(
  p_property_id uuid,
  p_user_id uuid,
  p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reviewer uuid := auth.uid();
  v_allowed boolean := false;
  v_norm text := lower(trim(p_action));
BEGIN
  IF v_reviewer IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_property_id IS NULL OR p_user_id IS NULL OR v_norm = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_arguments');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.property_members r
    WHERE r.property_id = p_property_id
      AND r.user_id = v_reviewer
      AND r.status = 'active'::public.member_status
      AND r.role IN (
        'admin'::public.user_role,
        'council'::public.user_role
      )
  )
  INTO v_allowed;

  IF NOT v_allowed THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.property_members t
    WHERE t.property_id = p_property_id
      AND t.user_id = p_user_id
      AND t.status = 'pending'::public.member_status
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_pending');
  END IF;

  IF v_norm = 'approve' THEN
    UPDATE public.property_members pm
    SET status = 'active'::public.member_status
    WHERE pm.property_id = p_property_id
      AND pm.user_id = p_user_id
      AND pm.status = 'pending'::public.member_status;

    UPDATE public.residents res
    SET
      status = 'active',
      updated_at = now()
    WHERE res.property_id = p_property_id
      AND res.user_id = p_user_id;

    UPDATE public.profiles prof
    SET
      status = 'active',
      updated_at = now()
    WHERE prof.id = p_user_id;

    RETURN jsonb_build_object('ok', true, 'action', 'approve');
  END IF;

  IF v_norm = 'suspend' THEN
    UPDATE public.property_members pm
    SET status = 'suspended'::public.member_status
    WHERE pm.property_id = p_property_id
      AND pm.user_id = p_user_id
      AND pm.status = 'pending'::public.member_status;

    UPDATE public.residents res
    SET
      status = 'deregistered',
      updated_at = now()
    WHERE res.property_id = p_property_id
      AND res.user_id = p_user_id;

    UPDATE public.profiles prof
    SET
      status = 'suspended',
      updated_at = now()
    WHERE prof.id = p_user_id;

    RETURN jsonb_build_object('ok', true, 'action', 'suspend');
  END IF;

  IF v_norm = 'remove' THEN
    DELETE FROM public.property_members pm
    WHERE pm.property_id = p_property_id
      AND pm.user_id = p_user_id
      AND pm.status = 'pending'::public.member_status;

    UPDATE public.residents res
    SET
      status = 'deregistered',
      updated_at = now()
    WHERE res.property_id = p_property_id
      AND res.user_id = p_user_id;

    UPDATE public.profiles prof
    SET
      status = 'suspended',
      updated_at = now()
    WHERE prof.id = p_user_id;

    RETURN jsonb_build_object('ok', true, 'action', 'remove');
  END IF;

  RETURN jsonb_build_object('ok', false, 'error', 'invalid_action');
END;
$$;

COMMENT ON FUNCTION public.review_property_member_membership(uuid, uuid, text) IS
  'Admin/council on property: approve (pending→active), suspend pending membership, or remove pending membership row.';

REVOKE ALL ON FUNCTION public.review_property_member_membership(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_property_member_membership(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_property_member_membership(uuid, uuid, text) TO service_role;
