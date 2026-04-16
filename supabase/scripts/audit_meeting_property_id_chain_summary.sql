-- ---------------------------------------------------------------------------
-- Meeting chain — property_id audit (single result set)
-- Run: npx supabase db query --linked -f supabase/scripts/audit_meeting_property_id_chain_summary.sql -o table
-- Use before release / after migrations touching meetings + tenant columns.
-- ---------------------------------------------------------------------------

SELECT category, metric, cnt
FROM (
  /* -------- property_id IS NULL (base tables + views) -------- */
  SELECT 'null_count'::text AS category, 'meetings.property_id'::text AS metric, COUNT(*)::bigint AS cnt
  FROM public.meetings WHERE property_id IS NULL
  UNION ALL SELECT 'null_count', 'meeting_invitations.property_id', COUNT(*) FROM public.meeting_invitations WHERE property_id IS NULL
  UNION ALL SELECT 'null_count', 'meeting_minutes.property_id', COUNT(*) FROM public.meeting_minutes WHERE property_id IS NULL
  UNION ALL SELECT 'null_count', 'meeting_minutes_versions.property_id', COUNT(*) FROM public.meeting_minutes_versions WHERE property_id IS NULL
  UNION ALL SELECT 'null_count', 'meeting_resolutions.property_id', COUNT(*) FROM public.meeting_resolutions WHERE property_id IS NULL
  UNION ALL SELECT 'null_count', 'meeting_vote_options.property_id', COUNT(*) FROM public.meeting_vote_options WHERE property_id IS NULL
  UNION ALL SELECT 'null_count', 'meeting_votes.property_id', COUNT(*) FROM public.meeting_votes WHERE property_id IS NULL
  UNION ALL SELECT 'null_count', 'meeting_agenda_items.property_id', COUNT(*) FROM public.meeting_agenda_items WHERE property_id IS NULL
  UNION ALL SELECT 'null_count', 'meeting_documents.property_id', COUNT(*) FROM public.meeting_documents WHERE property_id IS NULL
  UNION ALL SELECT 'null_count', 'meeting_attendees.property_id', COUNT(*) FROM public.meeting_attendees WHERE property_id IS NULL
  UNION ALL SELECT 'null_count', 'meeting_dashboard_cards.property_id (view)', COUNT(*) FROM public.meeting_dashboard_cards WHERE property_id IS NULL
  UNION ALL SELECT 'null_count', 'meeting_yearly_stats.property_id (view)', COUNT(*) FROM public.meeting_yearly_stats WHERE property_id IS NULL

  /* -------- parent / child property_id mismatch -------- */
  UNION ALL SELECT 'mismatch', 'meeting_invitations vs meetings', COUNT(*)
  FROM public.meeting_invitations i
  JOIN public.meetings m ON m.id = i.meeting_id
  WHERE i.property_id IS NOT NULL AND m.property_id IS NOT NULL AND i.property_id IS DISTINCT FROM m.property_id

  UNION ALL SELECT 'mismatch', 'meeting_minutes vs meetings', COUNT(*)
  FROM public.meeting_minutes mm
  JOIN public.meetings m ON m.id = mm.meeting_id
  WHERE mm.property_id IS NOT NULL AND m.property_id IS NOT NULL AND mm.property_id IS DISTINCT FROM m.property_id

  UNION ALL SELECT 'mismatch', 'meeting_minutes_versions vs meeting_minutes', COUNT(*)
  FROM public.meeting_minutes_versions v
  JOIN public.meeting_minutes mm ON mm.id = v.minutes_id
  WHERE v.property_id IS NOT NULL AND mm.property_id IS NOT NULL AND v.property_id IS DISTINCT FROM mm.property_id

  UNION ALL SELECT 'mismatch', 'meeting_resolutions vs meetings', COUNT(*)
  FROM public.meeting_resolutions r
  JOIN public.meetings m ON m.id = r.meeting_id
  WHERE r.property_id IS NOT NULL AND m.property_id IS NOT NULL AND r.property_id IS DISTINCT FROM m.property_id

  UNION ALL SELECT 'mismatch', 'meeting_vote_options vs meeting_votes', COUNT(*)
  FROM public.meeting_vote_options o
  JOIN public.meeting_votes v ON v.id = o.vote_id
  WHERE o.property_id IS NOT NULL AND v.property_id IS NOT NULL AND o.property_id IS DISTINCT FROM v.property_id

  UNION ALL SELECT 'mismatch', 'meeting_votes vs meetings', COUNT(*)
  FROM public.meeting_votes v
  JOIN public.meetings m ON m.id = v.meeting_id
  WHERE v.property_id IS NOT NULL AND m.property_id IS NOT NULL AND v.property_id IS DISTINCT FROM m.property_id

  UNION ALL SELECT 'mismatch', 'meeting_agenda_items vs meetings', COUNT(*)
  FROM public.meeting_agenda_items a
  JOIN public.meetings m ON m.id = a.meeting_id
  WHERE a.property_id IS NOT NULL AND m.property_id IS NOT NULL AND a.property_id IS DISTINCT FROM m.property_id

  UNION ALL SELECT 'mismatch', 'meeting_documents vs meetings', COUNT(*)
  FROM public.meeting_documents d
  JOIN public.meetings m ON m.id = d.meeting_id
  WHERE d.property_id IS NOT NULL AND m.property_id IS NOT NULL AND d.property_id IS DISTINCT FROM m.property_id

  UNION ALL SELECT 'mismatch', 'meeting_attendees vs meetings', COUNT(*)
  FROM public.meeting_attendees a
  JOIN public.meetings m ON m.id = a.meeting_id
  WHERE a.property_id IS NOT NULL AND m.property_id IS NOT NULL AND a.property_id IS DISTINCT FROM m.property_id

  /* -------- orphan FKs (missing parent row) -------- */
  UNION ALL SELECT 'orphan', 'meeting_minutes.meeting_id -> meetings', COUNT(*)
  FROM public.meeting_minutes mm
  LEFT JOIN public.meetings m ON m.id = mm.meeting_id
  WHERE m.id IS NULL

  UNION ALL SELECT 'orphan', 'meeting_minutes_versions.minutes_id -> meeting_minutes', COUNT(*)
  FROM public.meeting_minutes_versions v
  LEFT JOIN public.meeting_minutes mm ON mm.id = v.minutes_id
  WHERE mm.id IS NULL

  UNION ALL SELECT 'orphan', 'meeting_resolutions.meeting_id -> meetings', COUNT(*)
  FROM public.meeting_resolutions r
  LEFT JOIN public.meetings m ON m.id = r.meeting_id
  WHERE m.id IS NULL

  UNION ALL SELECT 'orphan', 'meeting_vote_options.vote_id -> meeting_votes', COUNT(*)
  FROM public.meeting_vote_options o
  LEFT JOIN public.meeting_votes v ON v.id = o.vote_id
  WHERE v.id IS NULL

  UNION ALL SELECT 'orphan', 'meeting_votes.meeting_id -> meetings', COUNT(*)
  FROM public.meeting_votes v
  LEFT JOIN public.meetings m ON m.id = v.meeting_id
  WHERE m.id IS NULL

  UNION ALL SELECT 'orphan', 'meeting_agenda_items.meeting_id -> meetings', COUNT(*)
  FROM public.meeting_agenda_items a
  LEFT JOIN public.meetings m ON m.id = a.meeting_id
  WHERE m.id IS NULL

  UNION ALL SELECT 'orphan', 'meeting_documents.meeting_id -> meetings', COUNT(*)
  FROM public.meeting_documents d
  LEFT JOIN public.meetings m ON m.id = d.meeting_id
  WHERE m.id IS NULL

  UNION ALL SELECT 'orphan', 'meeting_attendees.meeting_id -> meetings', COUNT(*)
  FROM public.meeting_attendees a
  LEFT JOIN public.meetings m ON m.id = a.meeting_id
  WHERE m.id IS NULL

  UNION ALL SELECT 'orphan', 'meeting_invitations.meeting_id -> meetings', COUNT(*)
  FROM public.meeting_invitations i
  LEFT JOIN public.meetings m ON m.id = i.meeting_id
  WHERE m.id IS NULL
) x
ORDER BY
  CASE category
    WHEN 'null_count' THEN 1
    WHEN 'mismatch' THEN 2
    WHEN 'orphan' THEN 3
    ELSE 9
  END,
  metric;
