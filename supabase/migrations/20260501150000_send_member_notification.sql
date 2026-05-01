-- Add priority + created_by to user_notifications for direct member messaging.
-- Creates a SECURITY DEFINER RPC so council/admin can insert notifications
-- for any member of a property they manage, without exposing a broad INSERT policy.

ALTER TABLE public.user_notifications
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'important', 'urgent'));

ALTER TABLE public.user_notifications
  ADD COLUMN IF NOT EXISTS created_by uuid
    REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: send_member_notification
-- Caller must be an active council/admin/manager on the property.
-- Inserts a single user_notifications row for the specified recipient.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.send_member_notification(
  p_property_id        uuid,
  p_recipient_user_id  uuid,
  p_title              text,
  p_message            text,
  p_priority           text DEFAULT 'normal'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor     uuid := auth.uid();
  v_staff_role text;
BEGIN
  -- 1. Caller must be authenticated
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authenticated');
  END IF;

  -- 2. Validate priority value
  IF p_priority NOT IN ('normal', 'important', 'urgent') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_priority');
  END IF;

  -- 3. Validate non-empty fields
  IF trim(p_title) = '' OR trim(p_message) = '' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'empty_fields');
  END IF;

  -- 4. Caller must be active council / admin / manager on this property
  SELECT pm.role INTO v_staff_role
  FROM public.property_members pm
  WHERE pm.property_id = p_property_id
    AND pm.user_id = v_actor
    AND pm.status = 'active'
    AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
  LIMIT 1;

  IF v_staff_role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authorized');
  END IF;

  -- 5. Recipient must be an active member of the same property
  IF NOT EXISTS (
    SELECT 1 FROM public.property_members
    WHERE property_id = p_property_id
      AND user_id = p_recipient_user_id
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'recipient_not_member');
  END IF;

  -- 6. Insert the notification
  INSERT INTO public.user_notifications (
    user_id,
    type,
    title,
    message,
    related_property_id,
    priority,
    created_by,
    is_read
  ) VALUES (
    p_recipient_user_id,
    'direct_message',
    trim(p_title),
    trim(p_message),
    p_property_id,
    p_priority,
    v_actor,
    false
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_member_notification(uuid, uuid, text, text, text)
  TO authenticated;
