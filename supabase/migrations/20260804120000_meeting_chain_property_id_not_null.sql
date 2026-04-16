/*
  Meeting chain: tighten property_id to NOT NULL where safe.

  One DO block per table: skips missing table/column, NULL rows, or already NOT NULL;
  unexpected ALTER errors are logged and skipped so other tables still run (environment drift).

  No DML. Outcomes: RAISE NOTICE lines prefixed with
  [20260804120000 meeting_chain_property_id_nn]
*/

-- 1) meetings
DO $t1$
DECLARE
  v_tag constant text := '[20260804120000 meeting_chain_property_id_nn]';
BEGIN
  IF to_regclass('public.meetings') IS NULL THEN
    RAISE NOTICE '% meetings: skipped (table missing)', v_tag;
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'meetings' AND column_name = 'property_id'
  ) THEN
    RAISE NOTICE '% meetings: skipped (column property_id missing)', v_tag;
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.meetings WHERE property_id IS NULL LIMIT 1) THEN
    RAISE NOTICE '% meetings: skipped (NULL property_id rows exist)', v_tag;
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'meetings' AND a.attname = 'property_id'
      AND a.attnum > 0 AND NOT a.attisdropped AND a.attnotnull
  ) THEN
    RAISE NOTICE '% meetings: OK (property_id already NOT NULL)', v_tag;
    RETURN;
  END IF;
  ALTER TABLE public.meetings ALTER COLUMN property_id SET NOT NULL;
  RAISE NOTICE '% meetings: OK (SET NOT NULL applied)', v_tag;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '% meetings: skipped (ALTER failed: % | %)', v_tag, SQLSTATE, SQLERRM;
END;
$t1$;

-- 2) meeting_votes
DO $t2$
DECLARE
  v_tag constant text := '[20260804120000 meeting_chain_property_id_nn]';
BEGIN
  IF to_regclass('public.meeting_votes') IS NULL THEN
    RAISE NOTICE '% meeting_votes: skipped (table missing)', v_tag;
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'meeting_votes' AND column_name = 'property_id'
  ) THEN
    RAISE NOTICE '% meeting_votes: skipped (column property_id missing)', v_tag;
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.meeting_votes WHERE property_id IS NULL LIMIT 1) THEN
    RAISE NOTICE '% meeting_votes: skipped (NULL property_id rows exist)', v_tag;
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'meeting_votes' AND a.attname = 'property_id'
      AND a.attnum > 0 AND NOT a.attisdropped AND a.attnotnull
  ) THEN
    RAISE NOTICE '% meeting_votes: OK (property_id already NOT NULL)', v_tag;
    RETURN;
  END IF;
  ALTER TABLE public.meeting_votes ALTER COLUMN property_id SET NOT NULL;
  RAISE NOTICE '% meeting_votes: OK (SET NOT NULL applied)', v_tag;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '% meeting_votes: skipped (ALTER failed: % | %)', v_tag, SQLSTATE, SQLERRM;
END;
$t2$;

-- 3) meeting_agenda_items
DO $t3$
DECLARE
  v_tag constant text := '[20260804120000 meeting_chain_property_id_nn]';
BEGIN
  IF to_regclass('public.meeting_agenda_items') IS NULL THEN
    RAISE NOTICE '% meeting_agenda_items: skipped (table missing)', v_tag;
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'meeting_agenda_items' AND column_name = 'property_id'
  ) THEN
    RAISE NOTICE '% meeting_agenda_items: skipped (column property_id missing)', v_tag;
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.meeting_agenda_items WHERE property_id IS NULL LIMIT 1) THEN
    RAISE NOTICE '% meeting_agenda_items: skipped (NULL property_id rows exist)', v_tag;
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'meeting_agenda_items' AND a.attname = 'property_id'
      AND a.attnum > 0 AND NOT a.attisdropped AND a.attnotnull
  ) THEN
    RAISE NOTICE '% meeting_agenda_items: OK (property_id already NOT NULL)', v_tag;
    RETURN;
  END IF;
  ALTER TABLE public.meeting_agenda_items ALTER COLUMN property_id SET NOT NULL;
  RAISE NOTICE '% meeting_agenda_items: OK (SET NOT NULL applied)', v_tag;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '% meeting_agenda_items: skipped (ALTER failed: % | %)', v_tag, SQLSTATE, SQLERRM;
END;
$t3$;

-- 4) meeting_documents
DO $t4$
DECLARE
  v_tag constant text := '[20260804120000 meeting_chain_property_id_nn]';
BEGIN
  IF to_regclass('public.meeting_documents') IS NULL THEN
    RAISE NOTICE '% meeting_documents: skipped (table missing)', v_tag;
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'meeting_documents' AND column_name = 'property_id'
  ) THEN
    RAISE NOTICE '% meeting_documents: skipped (column property_id missing)', v_tag;
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.meeting_documents WHERE property_id IS NULL LIMIT 1) THEN
    RAISE NOTICE '% meeting_documents: skipped (NULL property_id rows exist)', v_tag;
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'meeting_documents' AND a.attname = 'property_id'
      AND a.attnum > 0 AND NOT a.attisdropped AND a.attnotnull
  ) THEN
    RAISE NOTICE '% meeting_documents: OK (property_id already NOT NULL)', v_tag;
    RETURN;
  END IF;
  ALTER TABLE public.meeting_documents ALTER COLUMN property_id SET NOT NULL;
  RAISE NOTICE '% meeting_documents: OK (SET NOT NULL applied)', v_tag;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '% meeting_documents: skipped (ALTER failed: % | %)', v_tag, SQLSTATE, SQLERRM;
END;
$t4$;

-- 5) meeting_attendees
DO $t5$
DECLARE
  v_tag constant text := '[20260804120000 meeting_chain_property_id_nn]';
BEGIN
  IF to_regclass('public.meeting_attendees') IS NULL THEN
    RAISE NOTICE '% meeting_attendees: skipped (table missing)', v_tag;
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'meeting_attendees' AND column_name = 'property_id'
  ) THEN
    RAISE NOTICE '% meeting_attendees: skipped (column property_id missing)', v_tag;
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.meeting_attendees WHERE property_id IS NULL LIMIT 1) THEN
    RAISE NOTICE '% meeting_attendees: skipped (NULL property_id rows exist)', v_tag;
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'meeting_attendees' AND a.attname = 'property_id'
      AND a.attnum > 0 AND NOT a.attisdropped AND a.attnotnull
  ) THEN
    RAISE NOTICE '% meeting_attendees: OK (property_id already NOT NULL)', v_tag;
    RETURN;
  END IF;
  ALTER TABLE public.meeting_attendees ALTER COLUMN property_id SET NOT NULL;
  RAISE NOTICE '% meeting_attendees: OK (SET NOT NULL applied)', v_tag;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '% meeting_attendees: skipped (ALTER failed: % | %)', v_tag, SQLSTATE, SQLERRM;
END;
$t5$;

-- 6) meeting_invitations
DO $t6$
DECLARE
  v_tag constant text := '[20260804120000 meeting_chain_property_id_nn]';
BEGIN
  IF to_regclass('public.meeting_invitations') IS NULL THEN
    RAISE NOTICE '% meeting_invitations: skipped (table missing)', v_tag;
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'meeting_invitations' AND column_name = 'property_id'
  ) THEN
    RAISE NOTICE '% meeting_invitations: skipped (column property_id missing)', v_tag;
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.meeting_invitations WHERE property_id IS NULL LIMIT 1) THEN
    RAISE NOTICE '% meeting_invitations: skipped (NULL property_id rows exist)', v_tag;
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'meeting_invitations' AND a.attname = 'property_id'
      AND a.attnum > 0 AND NOT a.attisdropped AND a.attnotnull
  ) THEN
    RAISE NOTICE '% meeting_invitations: OK (property_id already NOT NULL)', v_tag;
    RETURN;
  END IF;
  ALTER TABLE public.meeting_invitations ALTER COLUMN property_id SET NOT NULL;
  RAISE NOTICE '% meeting_invitations: OK (SET NOT NULL applied)', v_tag;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '% meeting_invitations: skipped (ALTER failed: % | %)', v_tag, SQLSTATE, SQLERRM;
END;
$t6$;

-- 7) meeting_minutes
DO $t7$
DECLARE
  v_tag constant text := '[20260804120000 meeting_chain_property_id_nn]';
BEGIN
  IF to_regclass('public.meeting_minutes') IS NULL THEN
    RAISE NOTICE '% meeting_minutes: skipped (table missing)', v_tag;
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'meeting_minutes' AND column_name = 'property_id'
  ) THEN
    RAISE NOTICE '% meeting_minutes: skipped (column property_id missing)', v_tag;
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.meeting_minutes WHERE property_id IS NULL LIMIT 1) THEN
    RAISE NOTICE '% meeting_minutes: skipped (NULL property_id rows exist)', v_tag;
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'meeting_minutes' AND a.attname = 'property_id'
      AND a.attnum > 0 AND NOT a.attisdropped AND a.attnotnull
  ) THEN
    RAISE NOTICE '% meeting_minutes: OK (property_id already NOT NULL)', v_tag;
    RETURN;
  END IF;
  ALTER TABLE public.meeting_minutes ALTER COLUMN property_id SET NOT NULL;
  RAISE NOTICE '% meeting_minutes: OK (SET NOT NULL applied)', v_tag;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '% meeting_minutes: skipped (ALTER failed: % | %)', v_tag, SQLSTATE, SQLERRM;
END;
$t7$;

-- 8) meeting_resolutions
DO $t8$
DECLARE
  v_tag constant text := '[20260804120000 meeting_chain_property_id_nn]';
BEGIN
  IF to_regclass('public.meeting_resolutions') IS NULL THEN
    RAISE NOTICE '% meeting_resolutions: skipped (table missing)', v_tag;
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'meeting_resolutions' AND column_name = 'property_id'
  ) THEN
    RAISE NOTICE '% meeting_resolutions: skipped (column property_id missing)', v_tag;
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.meeting_resolutions WHERE property_id IS NULL LIMIT 1) THEN
    RAISE NOTICE '% meeting_resolutions: skipped (NULL property_id rows exist)', v_tag;
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'meeting_resolutions' AND a.attname = 'property_id'
      AND a.attnum > 0 AND NOT a.attisdropped AND a.attnotnull
  ) THEN
    RAISE NOTICE '% meeting_resolutions: OK (property_id already NOT NULL)', v_tag;
    RETURN;
  END IF;
  ALTER TABLE public.meeting_resolutions ALTER COLUMN property_id SET NOT NULL;
  RAISE NOTICE '% meeting_resolutions: OK (SET NOT NULL applied)', v_tag;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '% meeting_resolutions: skipped (ALTER failed: % | %)', v_tag, SQLSTATE, SQLERRM;
END;
$t8$;

-- 9) meeting_minutes_versions
DO $t9$
DECLARE
  v_tag constant text := '[20260804120000 meeting_chain_property_id_nn]';
BEGIN
  IF to_regclass('public.meeting_minutes_versions') IS NULL THEN
    RAISE NOTICE '% meeting_minutes_versions: skipped (table missing)', v_tag;
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'meeting_minutes_versions' AND column_name = 'property_id'
  ) THEN
    RAISE NOTICE '% meeting_minutes_versions: skipped (column property_id missing)', v_tag;
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.meeting_minutes_versions WHERE property_id IS NULL LIMIT 1) THEN
    RAISE NOTICE '% meeting_minutes_versions: skipped (NULL property_id rows exist)', v_tag;
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'meeting_minutes_versions' AND a.attname = 'property_id'
      AND a.attnum > 0 AND NOT a.attisdropped AND a.attnotnull
  ) THEN
    RAISE NOTICE '% meeting_minutes_versions: OK (property_id already NOT NULL)', v_tag;
    RETURN;
  END IF;
  ALTER TABLE public.meeting_minutes_versions ALTER COLUMN property_id SET NOT NULL;
  RAISE NOTICE '% meeting_minutes_versions: OK (SET NOT NULL applied)', v_tag;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '% meeting_minutes_versions: skipped (ALTER failed: % | %)', v_tag, SQLSTATE, SQLERRM;
END;
$t9$;

-- 10) meeting_vote_options
DO $t10$
DECLARE
  v_tag constant text := '[20260804120000 meeting_chain_property_id_nn]';
BEGIN
  IF to_regclass('public.meeting_vote_options') IS NULL THEN
    RAISE NOTICE '% meeting_vote_options: skipped (table missing)', v_tag;
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'meeting_vote_options' AND column_name = 'property_id'
  ) THEN
    RAISE NOTICE '% meeting_vote_options: skipped (column property_id missing)', v_tag;
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.meeting_vote_options WHERE property_id IS NULL LIMIT 1) THEN
    RAISE NOTICE '% meeting_vote_options: skipped (NULL property_id rows exist)', v_tag;
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'meeting_vote_options' AND a.attname = 'property_id'
      AND a.attnum > 0 AND NOT a.attisdropped AND a.attnotnull
  ) THEN
    RAISE NOTICE '% meeting_vote_options: OK (property_id already NOT NULL)', v_tag;
    RETURN;
  END IF;
  ALTER TABLE public.meeting_vote_options ALTER COLUMN property_id SET NOT NULL;
  RAISE NOTICE '% meeting_vote_options: OK (SET NOT NULL applied)', v_tag;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '% meeting_vote_options: skipped (ALTER failed: % | %)', v_tag, SQLSTATE, SQLERRM;
END;
$t10$;
