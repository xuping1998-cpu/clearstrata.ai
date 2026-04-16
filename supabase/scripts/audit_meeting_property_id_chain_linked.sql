-- Linked-project audit (schema may lag migrations): counts + orphans + mismatches where columns exist.

SELECT 'meetings.property_id IS NULL' AS check_name, COUNT(*)::bigint AS cnt FROM public.meetings WHERE property_id IS NULL
UNION ALL SELECT 'meeting_invitations.property_id IS NULL', COUNT(*)::bigint FROM public.meeting_invitations WHERE property_id IS NULL
UNION ALL SELECT 'meeting_dashboard_cards.property_id IS NULL', COUNT(*)::bigint FROM public.meeting_dashboard_cards WHERE property_id IS NULL
UNION ALL SELECT 'meeting_yearly_stats.property_id IS NULL', COUNT(*)::bigint FROM public.meeting_yearly_stats WHERE property_id IS NULL
UNION ALL SELECT 'meeting_invitations.property_id <> meetings.property_id', COUNT(*)::bigint FROM public.meeting_invitations i JOIN public.meetings m ON m.id = i.meeting_id WHERE i.property_id IS NOT NULL AND m.property_id IS NOT NULL AND i.property_id IS DISTINCT FROM m.property_id
UNION ALL SELECT 'meeting_agenda_items -> meetings missing (orphan)', COUNT(*)::bigint FROM public.meeting_agenda_items a LEFT JOIN public.meetings m ON m.id = a.meeting_id WHERE m.id IS NULL
UNION ALL SELECT 'meeting_attendees -> meetings missing (orphan)', COUNT(*)::bigint FROM public.meeting_attendees a LEFT JOIN public.meetings m ON m.id = a.meeting_id WHERE m.id IS NULL
UNION ALL SELECT 'meeting_documents -> meetings missing (orphan)', COUNT(*)::bigint FROM public.meeting_documents d LEFT JOIN public.meetings m ON m.id = d.meeting_id WHERE m.id IS NULL
UNION ALL SELECT 'meeting_minutes -> meetings missing (orphan)', COUNT(*)::bigint FROM public.meeting_minutes mm LEFT JOIN public.meetings m ON m.id = mm.meeting_id WHERE m.id IS NULL
UNION ALL SELECT 'meeting_resolutions -> meetings missing (orphan)', COUNT(*)::bigint FROM public.meeting_resolutions r LEFT JOIN public.meetings m ON m.id = r.meeting_id WHERE m.id IS NULL
UNION ALL SELECT 'meeting_votes -> meetings missing (orphan)', COUNT(*)::bigint FROM public.meeting_votes v LEFT JOIN public.meetings m ON m.id = v.meeting_id WHERE m.id IS NULL
UNION ALL SELECT 'meeting_invitations -> meetings missing (orphan)', COUNT(*)::bigint FROM public.meeting_invitations i LEFT JOIN public.meetings m ON m.id = i.meeting_id WHERE m.id IS NULL;
