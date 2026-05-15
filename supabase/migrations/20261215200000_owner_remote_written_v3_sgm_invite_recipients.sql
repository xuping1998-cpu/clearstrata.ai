-- Remote-written v3 owner-requisitioned SGM: meeting creator (active owner) prepares invitation rows for all members.
-- Replaces prior prepare_owner_remote_written_v3_sgm_invitations behavior: no participation-window block on send;
-- preserves sent/opened/voted rows; does not overwrite with pending.

BEGIN;

CREATE OR REPLACE FUNCTION public.prepare_owner_remote_written_v3_sgm_invitations(p_meeting_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  m record;
  v_ids uuid[] := ARRAY[]::uuid[];
  v_count int := 0;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authenticated');
  END IF;

  IF p_meeting_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'meeting_not_found');
  END IF;

  SELECT id, property_id, created_by, status, description_zh
  INTO m
  FROM public.meetings
  WHERE id = p_meeting_id
  LIMIT 1;

  IF NOT FOUND OR m.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'meeting_not_found');
  END IF;

  IF m.created_by IS DISTINCT FROM uid THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_owner_creator');
  END IF;

  IF NOT public.is_remote_written_v3_meeting(p_meeting_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_owner_requisitioned_v3');
  END IF;

  IF coalesce(m.description_zh, '') NOT LIKE '%owner_requisitioned%' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_owner_requisitioned_v3');
  END IF;

  IF lower(trim(both FROM coalesce(m.status, ''))) IS DISTINCT FROM 'draft' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_owner_requisitioned_v3');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.user_id = uid
      AND pm.property_id = m.property_id
      AND pm.status = 'active'
      AND lower(trim(both FROM coalesce(pm.role::text, ''))) = 'owner'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_owner_creator');
  END IF;

  INSERT INTO public.meeting_invitations AS mi (
    meeting_id,
    property_id,
    recipient_user_id,
    email,
    delivery_channel,
    delivery_status,
    sent_at
  )
  SELECT
    p_meeting_id,
    m.property_id,
    pm.user_id,
    pr.email,
    'email',
    'pending',
    NULL
  FROM public.property_members pm
  LEFT JOIN public.profiles pr ON pr.id = pm.user_id
  WHERE pm.property_id = m.property_id
    AND pm.status = 'active'
    AND pm.user_id IS NOT NULL
  ON CONFLICT (meeting_id, recipient_user_id) DO UPDATE SET
    property_id = EXCLUDED.property_id,
    email = COALESCE(NULLIF(trim(both FROM EXCLUDED.email::text), ''), meeting_invitations.email),
    delivery_channel = 'email',
    delivery_status = CASE
      WHEN meeting_invitations.delivery_status IN ('sent', 'opened', 'voted') THEN meeting_invitations.delivery_status
      ELSE 'pending'
    END,
    sent_at = CASE
      WHEN meeting_invitations.delivery_status IN ('sent', 'opened', 'voted') THEN meeting_invitations.sent_at
      ELSE NULL
    END;

  SELECT coalesce(array_agg(DISTINCT pm.user_id ORDER BY pm.user_id), ARRAY[]::uuid[])
  INTO v_ids
  FROM public.property_members pm
  WHERE pm.property_id = m.property_id
    AND pm.status = 'active'
    AND pm.user_id IS NOT NULL;

  v_count := coalesce(cardinality(v_ids), 0);

  RETURN jsonb_build_object(
    'ok', true,
    'meeting_id', p_meeting_id,
    'property_id', m.property_id,
    'recipient_user_ids', coalesce(to_jsonb(v_ids), '[]'::jsonb),
    'count', v_count
  );
END;
$$;

COMMENT ON FUNCTION public.prepare_owner_remote_written_v3_sgm_invitations(uuid) IS
  'Active owner + meeting creator: upsert meeting_invitations for all active members on draft owner-requisitioned remote-written v3; preserves sent/opened/voted.';

REVOKE ALL ON FUNCTION public.prepare_owner_remote_written_v3_sgm_invitations(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prepare_owner_remote_written_v3_sgm_invitations(uuid) TO authenticated;

COMMIT;
