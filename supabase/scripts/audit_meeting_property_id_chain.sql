-- ---------------------------------------------------------------------------
-- Meeting + tenant chain audit (run in SQL editor or psql against target DB)
-- Purpose: find NULL property_id, orphan FKs, before tightening NOT NULL.
-- ---------------------------------------------------------------------------

-- 1) Top-level: meetings missing tenant
SELECT 'meetings.property_id IS NULL' AS check_name, COUNT(*) AS cnt
FROM public.meetings
WHERE property_id IS NULL;

SELECT id, meeting_type, status, created_at
FROM public.meetings
WHERE property_id IS NULL
ORDER BY created_at DESC
LIMIT 50;

-- 2) Minutes stack
SELECT 'meeting_minutes.property_id IS NULL' AS check_name, COUNT(*) AS cnt
FROM public.meeting_minutes
WHERE property_id IS NULL;

SELECT mm.id, mm.meeting_id, mm.status, m.property_id AS meeting_property_id
FROM public.meeting_minutes mm
LEFT JOIN public.meetings m ON m.id = mm.meeting_id
WHERE mm.property_id IS NULL
ORDER BY mm.created_at DESC
LIMIT 50;

SELECT 'meeting_minutes_versions.property_id IS NULL' AS check_name, COUNT(*) AS cnt
FROM public.meeting_minutes_versions
WHERE property_id IS NULL;

SELECT v.id, v.minutes_id, mm.meeting_id, mm.property_id AS minutes_property_id
FROM public.meeting_minutes_versions v
LEFT JOIN public.meeting_minutes mm ON mm.id = v.minutes_id
WHERE v.property_id IS NULL
ORDER BY v.modified_at DESC NULLS LAST
LIMIT 50;

-- 3) Resolutions & vote options (post-migration columns)
SELECT 'meeting_resolutions.property_id IS NULL' AS check_name, COUNT(*) AS cnt
FROM public.meeting_resolutions
WHERE property_id IS NULL;

SELECT r.id, r.meeting_id, m.property_id AS meeting_property_id
FROM public.meeting_resolutions r
LEFT JOIN public.meetings m ON m.id = r.meeting_id
WHERE r.property_id IS NULL
ORDER BY r.created_at DESC
LIMIT 50;

SELECT 'meeting_vote_options.property_id IS NULL' AS check_name, COUNT(*) AS cnt
FROM public.meeting_vote_options
WHERE property_id IS NULL;

SELECT o.id, o.vote_id, v.property_id AS vote_property_id, v.meeting_id
FROM public.meeting_vote_options o
LEFT JOIN public.meeting_votes v ON v.id = o.vote_id
WHERE o.property_id IS NULL
LIMIT 50;

-- 4) Orphans: child row points to missing / mismatched parent property
SELECT 'meeting_minutes -> meetings missing' AS check_name, COUNT(*) AS cnt
FROM public.meeting_minutes mm
LEFT JOIN public.meetings m ON m.id = mm.meeting_id
WHERE m.id IS NULL;

SELECT 'meeting_minutes.property_id <> meetings.property_id' AS check_name, COUNT(*) AS cnt
FROM public.meeting_minutes mm
JOIN public.meetings m ON m.id = mm.meeting_id
WHERE mm.property_id IS NOT NULL
  AND m.property_id IS NOT NULL
  AND mm.property_id IS DISTINCT FROM m.property_id;

SELECT 'meeting_resolutions -> meetings missing' AS check_name, COUNT(*) AS cnt
FROM public.meeting_resolutions r
LEFT JOIN public.meetings m ON m.id = r.meeting_id
WHERE m.id IS NULL;

SELECT 'meeting_resolutions.property_id <> meetings.property_id' AS check_name, COUNT(*) AS cnt
FROM public.meeting_resolutions r
JOIN public.meetings m ON m.id = r.meeting_id
WHERE r.property_id IS NOT NULL
  AND m.property_id IS NOT NULL
  AND r.property_id IS DISTINCT FROM m.property_id;

SELECT 'meeting_vote_options.property_id <> meeting_votes.property_id' AS check_name, COUNT(*) AS cnt
FROM public.meeting_vote_options o
JOIN public.meeting_votes v ON v.id = o.vote_id
WHERE o.property_id IS NOT NULL
  AND v.property_id IS NOT NULL
  AND o.property_id IS DISTINCT FROM v.property_id;

-- 5) meeting_votes / meeting_agenda_items null property (should be empty if multi-tenant migration applied)
SELECT 'meeting_votes.property_id IS NULL' AS check_name, COUNT(*) AS cnt
FROM public.meeting_votes
WHERE property_id IS NULL;

SELECT 'meeting_agenda_items.property_id IS NULL' AS check_name, COUNT(*) AS cnt
FROM public.meeting_agenda_items
WHERE property_id IS NULL;

SELECT 'meeting_documents.property_id IS NULL' AS check_name, COUNT(*) AS cnt
FROM public.meeting_documents
WHERE property_id IS NULL;

SELECT 'meeting_attendees.property_id IS NULL' AS check_name, COUNT(*) AS cnt
FROM public.meeting_attendees
WHERE property_id IS NULL;
