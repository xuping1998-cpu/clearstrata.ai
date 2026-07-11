/*
  BF-001: atomic delivery claim for SGM pause emails.
  - Add status 'sending' for in-flight reservation
  - RPC claim_sgm_pause_email_delivery: INSERT ON CONFLICT DO NOTHING before Resend
*/

ALTER TABLE public.sgm_pause_email_deliveries
  DROP CONSTRAINT IF EXISTS sgm_pause_email_deliveries_status_check;

ALTER TABLE public.sgm_pause_email_deliveries
  ADD CONSTRAINT sgm_pause_email_deliveries_status_check
  CHECK (status IN ('sending', 'sent', 'failed'));

COMMENT ON TABLE public.sgm_pause_email_deliveries IS
  'Email send attempts for SGM pause notices; sending reserves one in-flight attempt per meeting+user+attempt_no.';

CREATE OR REPLACE FUNCTION public.claim_sgm_pause_email_delivery(
  p_meeting_id uuid,
  p_property_id uuid,
  p_user_id uuid,
  p_email text,
  p_max_attempts integer DEFAULT 3
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_count integer;
  v_attempt_no integer;
  v_id uuid;
BEGIN
  IF p_max_attempts < 1 THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'max_attempts');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.sgm_pause_email_deliveries d
    WHERE d.meeting_id = p_meeting_id
      AND d.user_id = p_user_id
      AND d.status = 'sent'
  ) THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'already_sent');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.sgm_pause_email_deliveries d
    WHERE d.meeting_id = p_meeting_id
      AND d.user_id = p_user_id
      AND d.status = 'sending'
  ) THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'already_claimed');
  END IF;

  SELECT COUNT(*)::integer
  INTO v_attempt_count
  FROM public.sgm_pause_email_deliveries d
  WHERE d.meeting_id = p_meeting_id
    AND d.user_id = p_user_id;

  IF v_attempt_count >= p_max_attempts THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'max_attempts');
  END IF;

  v_attempt_no := v_attempt_count + 1;

  INSERT INTO public.sgm_pause_email_deliveries (
    meeting_id,
    property_id,
    user_id,
    email,
    status,
    attempt_no
  )
  VALUES (
    p_meeting_id,
    p_property_id,
    p_user_id,
    p_email,
    'sending',
    v_attempt_no
  )
  ON CONFLICT ON CONSTRAINT sgm_pause_email_deliveries_meeting_user_attempt_unique DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'already_claimed');
  END IF;

  RETURN jsonb_build_object(
    'claimed', true,
    'deliveryId', v_id,
    'attemptNo', v_attempt_no
  );
END;
$$;

COMMENT ON FUNCTION public.claim_sgm_pause_email_delivery(uuid, uuid, uuid, text, integer) IS
  'BF-001: atomically reserve one SGM pause email attempt (status=sending) before Resend.';

REVOKE ALL ON FUNCTION public.claim_sgm_pause_email_delivery(uuid, uuid, uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_sgm_pause_email_delivery(uuid, uuid, uuid, text, integer) TO service_role;

NOTIFY pgrst, 'reload schema';
