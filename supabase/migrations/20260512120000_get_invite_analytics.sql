-- ---------------------------------------------------------------------------
-- Invite source analytics for property staff
-- Covers:
--   1) public property_invite_codes
--   2) property_direct_invites
--   3) legacy property_invites
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_invite_analytics(
  p_property_id uuid,
  p_since timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_rows jsonb;
  v_summary jsonb;
  v_total_defs int;
  v_total_req bigint;
  v_total_app bigint;
  v_total_rej bigint;
  v_avg numeric;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'not_authenticated'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.user_id = v_uid
      AND pm.property_id = p_property_id
      AND pm.status = 'active'
      AND pm.role::text IN ('property_admin', 'admin', 'council', 'manager')
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'forbidden'
    );
  END IF;

  WITH
  pub AS (
    SELECT
      pic.id AS source_id,
      'public'::text AS kind,
      COALESCE(NULLIF(trim(pic.label), ''), pic.code) AS label,
      pic.code AS identifier,
      pic.is_active,
      pic.expires_at,
      COUNT(jr.id) FILTER (
        WHERE jr.id IS NOT NULL
          AND (p_since IS NULL OR jr.created_at >= p_since)
      )::bigint AS request_count,
      COUNT(jr.id) FILTER (
        WHERE (p_since IS NULL OR jr.created_at >= p_since)
          AND jr.status = 'approved'::public.join_request_status
      )::bigint AS approved_count,
      COUNT(jr.id) FILTER (
        WHERE (p_since IS NULL OR jr.created_at >= p_since)
          AND jr.status = 'rejected'::public.join_request_status
      )::bigint AS rejected_count,
      MAX(jr.created_at) FILTER (
        WHERE p_since IS NULL OR jr.created_at >= p_since
      ) AS last_used_at
    FROM public.property_invite_codes pic
    LEFT JOIN public.join_requests jr
      ON jr.property_id = pic.property_id
      AND NULLIF(lower(trim(jr.invite_code)), '') = lower(trim(pic.code))
      AND jr.invite_id IS NULL
      AND jr.direct_invite_id IS NULL
    WHERE pic.property_id = p_property_id
    GROUP BY pic.id, pic.code, pic.label, pic.is_active, pic.expires_at
  ),
  targeted AS (
    SELECT
      pdi.id AS source_id,
      'direct'::text AS kind,
      COALESCE(NULLIF(trim(pdi.label), ''), left(pdi.invite_token, 12) || '...') AS label,
      pdi.invite_token AS identifier,
      pdi.is_active,
      pdi.expires_at,
      COUNT(jr.id) FILTER (
        WHERE jr.id IS NOT NULL
          AND (p_since IS NULL OR jr.created_at >= p_since)
      )::bigint AS request_count,
      COUNT(jr.id) FILTER (
        WHERE (p_since IS NULL OR jr.created_at >= p_since)
          AND jr.status = 'approved'::public.join_request_status
      )::bigint AS approved_count,
      COUNT(jr.id) FILTER (
        WHERE (p_since IS NULL OR jr.created_at >= p_since)
          AND jr.status = 'rejected'::public.join_request_status
      )::bigint AS rejected_count,
      MAX(jr.created_at) FILTER (
        WHERE p_since IS NULL OR jr.created_at >= p_since
      ) AS last_used_at
    FROM public.property_direct_invites pdi
    LEFT JOIN public.join_requests jr
      ON jr.direct_invite_id = pdi.id
      AND jr.property_id = pdi.property_id
    WHERE pdi.property_id = p_property_id
    GROUP BY pdi.id, pdi.invite_token, pdi.label, pdi.is_active, pdi.expires_at
  ),
  legacy AS (
    SELECT
      pi.id AS source_id,
      'legacy'::text AS kind,
      pi.code AS label,
      pi.code AS identifier,
      (pi.status = 'active') AS is_active,
      pi.expires_at,
      COUNT(jr.id) FILTER (
        WHERE jr.id IS NOT NULL
          AND (p_since IS NULL OR jr.created_at >= p_since)
      )::bigint AS request_count,
      COUNT(jr.id) FILTER (
        WHERE (p_since IS NULL OR jr.created_at >= p_since)
          AND jr.status = 'approved'::public.join_request_status
      )::bigint AS approved_count,
      COUNT(jr.id) FILTER (
        WHERE (p_since IS NULL OR jr.created_at >= p_since)
          AND jr.status = 'rejected'::public.join_request_status
      )::bigint AS rejected_count,
      MAX(jr.created_at) FILTER (
        WHERE p_since IS NULL OR jr.created_at >= p_since
      ) AS last_used_at
    FROM public.property_invites pi
    LEFT JOIN public.join_requests jr
      ON jr.invite_id = pi.id
      AND jr.property_id = pi.property_id
    WHERE pi.property_id = p_property_id
    GROUP BY pi.id, pi.code, pi.status, pi.expires_at
  ),
  unioned AS (
    SELECT * FROM pub
    UNION ALL
    SELECT * FROM targeted
    UNION ALL
    SELECT * FROM legacy
  ),
  numbered AS (
    SELECT
      u.*,
      CASE
        WHEN u.request_count > 0
          THEN round(u.approved_count::numeric / u.request_count::numeric, 4)
        ELSE 0::numeric
      END AS conversion_rate
    FROM unioned u
  )
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'kind', n.kind,
          'source_id', n.source_id,
          'label', n.label,
          'identifier', n.identifier,
          'request_count', n.request_count,
          'approved_count', n.approved_count,
          'rejected_count', n.rejected_count,
          'conversion_rate', n.conversion_rate,
          'last_used_at', n.last_used_at,
          'is_active', n.is_active,
          'expires_at', n.expires_at
        )
        ORDER BY n.request_count DESC, n.label ASC
      ),
      '[]'::jsonb
    ),
    COUNT(*)::int,
    COALESCE(SUM(n.request_count), 0::bigint),
    COALESCE(SUM(n.approved_count), 0::bigint),
    COALESCE(SUM(n.rejected_count), 0::bigint)
  INTO v_rows, v_total_defs, v_total_req, v_total_app, v_total_rej
  FROM numbered n;

  IF v_total_req > 0 THEN
    v_avg := round(v_total_app::numeric / v_total_req::numeric, 4);
  ELSE
    v_avg := 0;
  END IF;

  v_summary := jsonb_build_object(
    'invite_definitions_total', v_total_defs,
    'total_requests', v_total_req,
    'total_approved', v_total_app,
    'total_rejected', v_total_rej,
    'avg_conversion', v_avg
  );

  RETURN jsonb_build_object(
    'ok', true,
    'summary', v_summary,
    'rows', COALESCE(v_rows, '[]'::jsonb)
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.get_invite_analytics(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_analytics(uuid, timestamptz) TO authenticated;

NOTIFY pgrst, 'reload schema';



