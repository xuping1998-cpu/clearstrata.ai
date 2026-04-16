/*
  # Meeting module — production repair (idempotent)

  Fixes common partial-failure states:
  - meetings.property_id (or other columns) missing
  - GRANT on views before views existed (aborted earlier migration mid-file)
  - meeting_invitations / meeting_resolutions / new meeting_votes stack / stats views never created

  Safe to re-run. Uses ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE VIEW.

  Order: (1) meetings columns → (2–4) backfills & constraints → (5) legacy vote rename →
  (6) agenda → (7) child tables → (8) schedule trigger → (9) views + GRANT → (10) indexes → (11) RLS.
*/

-- ============================================================================
-- 1) meetings — ensure ALL required columns exist BEFORE any UPDATE / INDEX / VIEW
-- ============================================================================

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id),
  ADD COLUMN IF NOT EXISTS fiscal_year integer,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS meeting_format text,
  ADD COLUMN IF NOT EXISTS notice_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS voting_open_at timestamptz,
  ADD COLUMN IF NOT EXISTS voting_close_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

UPDATE public.meetings
SET created_at = now()
WHERE created_at IS NULL;

-- ============================================================================
-- 2) Backfill scheduled_at (no reference to scheduled_date unless column exists)
-- ============================================================================

DO $sd$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'meetings' AND column_name = 'scheduled_date'
  ) THEN
    UPDATE public.meetings SET scheduled_at = COALESCE(scheduled_at, scheduled_date) WHERE scheduled_at IS NULL;
  ELSE
    UPDATE public.meetings SET scheduled_at = COALESCE(scheduled_at, created_at) WHERE scheduled_at IS NULL;
  END IF;
END $sd$;

DO $mf$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'meetings'
      AND column_name = 'is_virtual'
  ) THEN
    UPDATE public.meetings
    SET meeting_format = CASE
      WHEN meeting_format IS NOT NULL AND trim(meeting_format) <> '' THEN meeting_format
      WHEN COALESCE(is_virtual, false) = true THEN 'electronic'
      ELSE 'hybrid'
    END
    WHERE meeting_format IS NULL OR trim(meeting_format) = '';
  ELSE
    UPDATE public.meetings
    SET meeting_format = 'hybrid'
    WHERE meeting_format IS NULL OR trim(meeting_format) = '';
  END IF;
END $mf$;

ALTER TABLE public.meetings ALTER COLUMN meeting_format SET DEFAULT 'hybrid';
UPDATE public.meetings SET meeting_format = 'hybrid' WHERE meeting_format IS NULL;

ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_meeting_format_check;
ALTER TABLE public.meetings
  ADD CONSTRAINT meetings_meeting_format_check
  CHECK (meeting_format IN ('in_person', 'electronic', 'hybrid'));

DO $mfn$
BEGIN
  ALTER TABLE public.meetings ALTER COLUMN meeting_format SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $mfn$;

-- ============================================================================
-- 3) meeting_type / status → text + checks (only if still enum-backed)
-- ============================================================================

DO $mt$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'meetings'
      AND column_name = 'meeting_type' AND udt_name = 'meeting_type'
  ) THEN
    ALTER TABLE public.meetings
      ALTER COLUMN meeting_type TYPE text
      USING (
        CASE meeting_type::text
          WHEN 'agm' THEN 'agm'
          WHEN 'sgm' THEN 'sgm'
          ELSE 'council'
        END
      );
  END IF;
END $mt$;

ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_meeting_type_check;
ALTER TABLE public.meetings
  ADD CONSTRAINT meetings_meeting_type_check
  CHECK (meeting_type IN ('agm', 'sgm', 'council'));

DO $st$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'meetings'
      AND column_name = 'status' AND udt_name = 'meeting_status'
  ) THEN
    ALTER TABLE public.meetings
      ALTER COLUMN status TYPE text
      USING (
        CASE status::text
          WHEN 'draft' THEN 'draft'
          WHEN 'scheduled' THEN 'scheduled'
          WHEN 'in_progress' THEN 'open'
          WHEN 'completed' THEN 'closed'
          WHEN 'cancelled' THEN 'archived'
          ELSE 'draft'
        END
      );
  END IF;
END $st$;

ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_status_check;
ALTER TABLE public.meetings
  ADD CONSTRAINT meetings_status_check
  CHECK (status IN ('draft', 'scheduled', 'open', 'closed', 'archived'));

ALTER TABLE public.meetings ALTER COLUMN title_en DROP NOT NULL;

-- ============================================================================
-- 4) property_id + fiscal_year backfill (columns guaranteed to exist)
-- ============================================================================

DO $bf$
DECLARE
  bcs_id uuid;
  def_id uuid := '00000000-0000-4000-a000-000000000001'::uuid;
  has_sched_date boolean;
BEGIN
  IF to_regclass('public.properties') IS NOT NULL THEN
    SELECT p.id INTO bcs_id
    FROM public.properties p
    WHERE lower(trim(coalesce(p.property_code, ''))) = 'bcs3736'
    LIMIT 1;

    UPDATE public.meetings m
    SET property_id = COALESCE(bcs_id, def_id)
    WHERE m.property_id IS NULL;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'meetings' AND column_name = 'scheduled_date'
  ) INTO has_sched_date;

  IF has_sched_date THEN
    UPDATE public.meetings m
    SET fiscal_year = COALESCE(
      m.fiscal_year,
      EXTRACT(YEAR FROM COALESCE(m.scheduled_at, m.scheduled_date, m.created_at, now()))::integer
    )
    WHERE m.fiscal_year IS NULL;
  ELSE
    UPDATE public.meetings m
    SET fiscal_year = COALESCE(
      m.fiscal_year,
      EXTRACT(YEAR FROM COALESCE(m.scheduled_at, m.created_at, now()))::integer
    )
    WHERE m.fiscal_year IS NULL;
  END IF;
END $bf$;

-- ============================================================================
-- 5) Legacy per-row votes → meeting_votes_legacy (only if legacy-shaped)
-- ============================================================================

DROP TRIGGER IF EXISTS meeting_quota_tracker_trigger ON public.meetings;

DO $dv$
BEGIN
  IF to_regclass('public.meeting_votes') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS vote_count_trigger ON public.meeting_votes';
  END IF;
END $dv$;

DO $rn$
BEGIN
  IF to_regclass('public.meeting_votes') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'meeting_votes' AND column_name = 'status'
     )
     AND to_regclass('public.meeting_votes_legacy') IS NULL THEN
    ALTER TABLE public.meeting_votes RENAME TO meeting_votes_legacy;
  END IF;
END $rn$;

ALTER TABLE public.meeting_agenda_items
  ADD COLUMN IF NOT EXISTS vote_for integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vote_against integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vote_abstain integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION public.update_vote_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  aid uuid;
BEGIN
  IF to_regclass('public.meeting_votes_legacy') IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  aid := COALESCE(NEW.agenda_item_id, OLD.agenda_item_id);
  IF aid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  UPDATE public.meeting_agenda_items mai
  SET
    vote_for = (SELECT COUNT(*)::int FROM public.meeting_votes_legacy WHERE agenda_item_id = aid AND vote_decision = 'for'),
    vote_against = (SELECT COUNT(*)::int FROM public.meeting_votes_legacy WHERE agenda_item_id = aid AND vote_decision = 'against'),
    vote_abstain = (SELECT COUNT(*)::int FROM public.meeting_votes_legacy WHERE agenda_item_id = aid AND vote_decision = 'abstain'),
    updated_at = now()
  WHERE mai.id = aid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $tr$
BEGIN
  IF to_regclass('public.meeting_votes_legacy') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS vote_count_trigger ON public.meeting_votes_legacy';
    EXECUTE $qt$
      CREATE TRIGGER vote_count_trigger
        AFTER INSERT OR UPDATE OR DELETE ON public.meeting_votes_legacy
        FOR EACH ROW
        EXECUTE FUNCTION public.update_vote_counts();
    $qt$;
  END IF;
END $tr$;

-- ============================================================================
-- 6) meeting_agenda_items — sort_order, vote_rule
-- ============================================================================

ALTER TABLE public.meeting_agenda_items
  ADD COLUMN IF NOT EXISTS sort_order integer,
  ADD COLUMN IF NOT EXISTS vote_rule text;

UPDATE public.meeting_agenda_items
SET sort_order = COALESCE(sort_order, item_number, 0)
WHERE sort_order IS NULL;

ALTER TABLE public.meeting_agenda_items ALTER COLUMN sort_order SET DEFAULT 0;
UPDATE public.meeting_agenda_items SET sort_order = 0 WHERE sort_order IS NULL;

DO $so$
BEGIN
  ALTER TABLE public.meeting_agenda_items ALTER COLUMN sort_order SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $so$;

ALTER TABLE public.meeting_agenda_items ALTER COLUMN title_en DROP NOT NULL;

ALTER TABLE public.meeting_agenda_items DROP CONSTRAINT IF EXISTS meeting_agenda_items_vote_rule_check;
ALTER TABLE public.meeting_agenda_items
  ADD CONSTRAINT meeting_agenda_items_vote_rule_check
  CHECK (vote_rule IS NULL OR vote_rule IN ('simple_majority', 'three_quarter', 'unanimous'));

-- ============================================================================
-- 7) New voting + invitations + resolutions tables
-- ============================================================================

DO $mv_rename$
BEGIN
  IF to_regclass('public.meeting_votes') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'meeting_votes' AND column_name = 'status'
     )
     AND to_regclass('public.meeting_votes_legacy') IS NOT NULL
  THEN
    IF NOT EXISTS (SELECT 1 FROM public.meeting_votes LIMIT 1) THEN
      DROP TABLE public.meeting_votes CASCADE;
    ELSE
      RAISE EXCEPTION
        'meeting_votes: per-row table has rows while meeting_votes_legacy exists; resolve manually before re-running migration';
    END IF;
  END IF;

  IF to_regclass('public.meeting_votes') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'meeting_votes' AND column_name = 'status'
     )
     AND to_regclass('public.meeting_votes_legacy') IS NULL THEN
    ALTER TABLE public.meeting_votes RENAME TO meeting_votes_legacy;
  END IF;
END $mv_rename$;

CREATE TABLE IF NOT EXISTS public.meeting_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  agenda_item_id uuid NOT NULL REFERENCES public.meeting_agenda_items(id) ON DELETE CASCADE,
  title_en text,
  title_zh text,
  description_en text,
  description_zh text,
  vote_rule text NOT NULL CHECK (vote_rule IN ('simple_majority', 'three_quarter', 'unanimous')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'passed', 'failed')),
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $fix_vote_options$
BEGIN
  IF to_regclass('public.meeting_vote_options') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'meeting_vote_options' AND column_name = 'option_key'
     )
  THEN
    IF NOT EXISTS (SELECT 1 FROM public.meeting_vote_options LIMIT 1) THEN
      DROP TABLE public.meeting_vote_options CASCADE;
    ELSE
      RAISE EXCEPTION
        'meeting_vote_options: non-empty table without option_key; resolve manually before re-running migration';
    END IF;
  END IF;
END $fix_vote_options$;

CREATE TABLE IF NOT EXISTS public.meeting_vote_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id uuid NOT NULL REFERENCES public.meeting_votes(id) ON DELETE CASCADE,
  option_key text NOT NULL,
  label_en text,
  label_zh text,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (vote_id, option_key)
);

DO $fix_ballots$
BEGIN
  IF to_regclass('public.meeting_ballots') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'meeting_ballots' AND column_name = 'property_id'
     )
  THEN
    IF NOT EXISTS (SELECT 1 FROM public.meeting_ballots LIMIT 1) THEN
      DROP TABLE public.meeting_ballots CASCADE;
    ELSE
      RAISE EXCEPTION
        'meeting_ballots: non-empty table without property_id; resolve manually before re-running migration';
    END IF;
  END IF;
END $fix_ballots$;

CREATE TABLE IF NOT EXISTS public.meeting_ballots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id uuid NOT NULL REFERENCES public.meeting_votes(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  voter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_option_key text NOT NULL,
  unit_weight numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vote_id, voter_user_id)
);

CREATE OR REPLACE FUNCTION public.meeting_ballots_sync_property_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid;
BEGIN
  SELECT m.property_id INTO pid
  FROM public.meeting_votes v
  JOIN public.meetings m ON m.id = v.meeting_id
  WHERE v.id = NEW.vote_id;

  IF pid IS NULL THEN
    RAISE EXCEPTION 'meeting_ballots: vote % has no property', NEW.vote_id;
  END IF;
  NEW.property_id := pid;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meeting_ballots_sync_property ON public.meeting_ballots;
CREATE TRIGGER trg_meeting_ballots_sync_property
  BEFORE INSERT OR UPDATE OF vote_id ON public.meeting_ballots
  FOR EACH ROW
  EXECUTE FUNCTION public.meeting_ballots_sync_property_id();

CREATE TABLE IF NOT EXISTS public.meeting_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_channel text NOT NULL DEFAULT 'in_app' CHECK (delivery_channel IN ('in_app', 'email')),
  delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed', 'opened')),
  sent_at timestamptz,
  opened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, recipient_user_id)
);

CREATE TABLE IF NOT EXISTS public.meeting_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  agenda_item_id uuid REFERENCES public.meeting_agenda_items(id) ON DELETE SET NULL,
  resolution_text text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('passed', 'failed', 'deferred')),
  followup_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 8) Schedule guard trigger on meetings
-- ============================================================================

CREATE OR REPLACE FUNCTION public.meetings_enforce_schedule_readiness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n_agenda integer;
  has_title boolean;
  entering_scheduled boolean;
BEGIN
  entering_scheduled := NEW.status = 'scheduled'
    AND (
      TG_OP = 'INSERT'
      OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'scheduled')
    );

  IF entering_scheduled THEN
    has_title := length(trim(coalesce(NEW.title_en, ''))) > 0
      OR length(trim(coalesce(NEW.title_zh, ''))) > 0;

    SELECT COUNT(*)::integer INTO n_agenda
    FROM public.meeting_agenda_items a
    WHERE a.meeting_id = NEW.id;

    IF NOT has_title THEN
      RAISE EXCEPTION 'meetings: cannot move to scheduled without title_en or title_zh';
    END IF;
    IF NEW.scheduled_at IS NULL THEN
      RAISE EXCEPTION 'meetings: cannot move to scheduled without scheduled_at';
    END IF;
    IF NEW.meeting_type IS NULL OR trim(NEW.meeting_type) = '' THEN
      RAISE EXCEPTION 'meetings: cannot move to scheduled without meeting_type';
    END IF;
    IF NEW.meeting_format IS NULL OR trim(NEW.meeting_format) = '' THEN
      RAISE EXCEPTION 'meetings: cannot move to scheduled without meeting_format';
    END IF;
    IF n_agenda < 1 THEN
      RAISE EXCEPTION 'meetings: cannot move to scheduled without at least one agenda item';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meetings_schedule_guard ON public.meetings;
CREATE TRIGGER trg_meetings_schedule_guard
  BEFORE INSERT OR UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.meetings_enforce_schedule_readiness();

-- Drop legacy scheduled_date after scheduled_at is populated (optional)
ALTER TABLE public.meetings DROP COLUMN IF EXISTS scheduled_date;

-- ============================================================================
-- 9) Stats views — create before GRANT; before indexes that reference meetings
-- ============================================================================

CREATE OR REPLACE VIEW public.meeting_yearly_stats AS
SELECT
  m.property_id,
  m.fiscal_year,
  COUNT(*) FILTER (WHERE m.meeting_type = 'agm')::bigint AS agm_count,
  COUNT(*) FILTER (WHERE m.meeting_type = 'sgm')::bigint AS sgm_count,
  COUNT(*) FILTER (WHERE m.meeting_type IN ('agm', 'sgm'))::bigint AS total_general_meetings,
  COUNT(*)::bigint AS total_meetings
FROM public.meetings m
GROUP BY m.property_id, m.fiscal_year;

CREATE OR REPLACE VIEW public.meeting_dashboard_cards AS
SELECT
  y.property_id,
  y.fiscal_year,
  y.total_general_meetings::integer AS used_meetings,
  8 AS quota_meetings,
  GREATEST(0, 8 - y.total_general_meetings::integer) AS remaining_meetings,
  CASE
    WHEN y.agm_count >= 1 THEN 'ok'::text
    ELSE 'missing_agm'::text
  END AS agm_status
FROM public.meeting_yearly_stats y;

GRANT SELECT ON public.meeting_yearly_stats TO authenticated;
GRANT SELECT ON public.meeting_dashboard_cards TO authenticated;

COMMENT ON VIEW public.meeting_yearly_stats IS 'Derived meeting counts per property/year; replaces meeting_quota_tracker reads.';
COMMENT ON VIEW public.meeting_dashboard_cards IS 'Dashboard card fields: product quota 8, AGM compliance hint.';

-- ============================================================================
-- 10) Indexes (after views; idempotent IF NOT EXISTS)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_meetings_property_fiscal
  ON public.meetings(property_id, fiscal_year);

CREATE INDEX IF NOT EXISTS idx_meetings_property_status
  ON public.meetings(property_id, status);

CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_at
  ON public.meetings(scheduled_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_meeting_agenda_meeting_sort
  ON public.meeting_agenda_items(meeting_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_meeting_votes_meeting_status
  ON public.meeting_votes(meeting_id, status);

CREATE INDEX IF NOT EXISTS idx_meeting_invitations_meeting_status
  ON public.meeting_invitations(meeting_id, delivery_status);

-- ============================================================================
-- 11) RLS on new tables (idempotent policy names)
-- ============================================================================

ALTER TABLE public.meeting_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_vote_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_resolutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mvn_select_member ON public.meeting_votes;
CREATE POLICY mvn_select_member
  ON public.meeting_votes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.meetings mt
      JOIN public.property_members pm
        ON pm.property_id = mt.property_id
       AND pm.user_id = (SELECT auth.uid())
      WHERE mt.id = meeting_votes.meeting_id
    )
  );

DROP POLICY IF EXISTS mvn_write_staff ON public.meeting_votes;
CREATE POLICY mvn_write_staff
  ON public.meeting_votes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.meetings mt
      JOIN public.property_members pm
        ON pm.property_id = mt.property_id
       AND pm.user_id = (SELECT auth.uid())
       AND pm.role IN ('admin', 'council', 'manager', 'property_admin')
      WHERE mt.id = meeting_votes.meeting_id
    )
  );

DROP POLICY IF EXISTS mvn_update_staff ON public.meeting_votes;
CREATE POLICY mvn_update_staff
  ON public.meeting_votes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.meetings mt
      JOIN public.property_members pm
        ON pm.property_id = mt.property_id
       AND pm.user_id = (SELECT auth.uid())
       AND pm.role IN ('admin', 'council', 'manager', 'property_admin')
      WHERE mt.id = meeting_votes.meeting_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.meetings mt
      JOIN public.property_members pm
        ON pm.property_id = mt.property_id
       AND pm.user_id = (SELECT auth.uid())
       AND pm.role IN ('admin', 'council', 'manager', 'property_admin')
      WHERE mt.id = meeting_votes.meeting_id
    )
  );

DROP POLICY IF EXISTS mvn_delete_staff ON public.meeting_votes;
CREATE POLICY mvn_delete_staff
  ON public.meeting_votes FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.meetings mt
      JOIN public.property_members pm
        ON pm.property_id = mt.property_id
       AND pm.user_id = (SELECT auth.uid())
       AND pm.role IN ('admin', 'council', 'manager', 'property_admin')
      WHERE mt.id = meeting_votes.meeting_id
    )
  );

DROP POLICY IF EXISTS mvopt_select_member ON public.meeting_vote_options;
CREATE POLICY mvopt_select_member
  ON public.meeting_vote_options FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.meeting_votes v
      JOIN public.meetings mt ON mt.id = v.meeting_id
      JOIN public.property_members pm
        ON pm.property_id = mt.property_id
       AND pm.user_id = (SELECT auth.uid())
      WHERE v.id = meeting_vote_options.vote_id
    )
  );

DROP POLICY IF EXISTS mvopt_write_staff ON public.meeting_vote_options;
CREATE POLICY mvopt_write_staff
  ON public.meeting_vote_options FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.meeting_votes v
      JOIN public.meetings mt ON mt.id = v.meeting_id
      JOIN public.property_members pm
        ON pm.property_id = mt.property_id
       AND pm.user_id = (SELECT auth.uid())
       AND pm.role IN ('admin', 'council', 'manager', 'property_admin')
      WHERE v.id = meeting_vote_options.vote_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.meeting_votes v
      JOIN public.meetings mt ON mt.id = v.meeting_id
      JOIN public.property_members pm
        ON pm.property_id = mt.property_id
       AND pm.user_id = (SELECT auth.uid())
       AND pm.role IN ('admin', 'council', 'manager', 'property_admin')
      WHERE v.id = meeting_vote_options.vote_id
    )
  );

DROP POLICY IF EXISTS mb_select_member ON public.meeting_ballots;
CREATE POLICY mb_select_member
  ON public.meeting_ballots FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

DROP POLICY IF EXISTS mb_insert_own_open ON public.meeting_ballots;
CREATE POLICY mb_insert_own_open
  ON public.meeting_ballots FOR INSERT TO authenticated
  WITH CHECK (
    voter_user_id = (SELECT auth.uid())
    AND property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.meeting_votes v
      WHERE v.id = meeting_ballots.vote_id AND v.status = 'open'
    )
  );

DROP POLICY IF EXISTS mb_update_own ON public.meeting_ballots;
CREATE POLICY mb_update_own
  ON public.meeting_ballots FOR UPDATE TO authenticated
  USING (voter_user_id = (SELECT auth.uid()))
  WITH CHECK (
    voter_user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.meeting_votes v
      WHERE v.id = meeting_ballots.vote_id AND v.status = 'open'
    )
  );

DROP POLICY IF EXISTS mb_delete_staff ON public.meeting_ballots;
CREATE POLICY mb_delete_staff
  ON public.meeting_ballots FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.property_id = meeting_ballots.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.role IN ('admin', 'council', 'manager', 'property_admin')
    )
  );

DROP POLICY IF EXISTS minv_select ON public.meeting_invitations;
CREATE POLICY minv_select
  ON public.meeting_invitations FOR SELECT TO authenticated
  USING (
    recipient_user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.property_id = meeting_invitations.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.role IN ('admin', 'council', 'manager', 'property_admin')
    )
  );

DROP POLICY IF EXISTS minv_write_staff ON public.meeting_invitations;
CREATE POLICY minv_write_staff
  ON public.meeting_invitations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.property_id = meeting_invitations.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.role IN ('admin', 'council', 'manager', 'property_admin')
    )
  );

DROP POLICY IF EXISTS minv_update_staff ON public.meeting_invitations;
CREATE POLICY minv_update_staff
  ON public.meeting_invitations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.property_id = meeting_invitations.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.role IN ('admin', 'council', 'manager', 'property_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.property_id = meeting_invitations.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.role IN ('admin', 'council', 'manager', 'property_admin')
    )
  );

DROP POLICY IF EXISTS minv_update_recipient_opened ON public.meeting_invitations;
CREATE POLICY minv_update_recipient_opened
  ON public.meeting_invitations FOR UPDATE TO authenticated
  USING (recipient_user_id = (SELECT auth.uid()))
  WITH CHECK (recipient_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS mres_select ON public.meeting_resolutions;
CREATE POLICY mres_select
  ON public.meeting_resolutions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings mt
      JOIN public.property_members pm
        ON pm.property_id = mt.property_id
       AND pm.user_id = (SELECT auth.uid())
      WHERE mt.id = meeting_resolutions.meeting_id
    )
  );

DROP POLICY IF EXISTS mres_write_staff ON public.meeting_resolutions;
CREATE POLICY mres_write_staff
  ON public.meeting_resolutions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings mt
      JOIN public.property_members pm
        ON pm.property_id = mt.property_id
       AND pm.user_id = (SELECT auth.uid())
       AND pm.role IN ('admin', 'council', 'manager', 'property_admin')
      WHERE mt.id = meeting_resolutions.meeting_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings mt
      JOIN public.property_members pm
        ON pm.property_id = mt.property_id
       AND pm.user_id = (SELECT auth.uid())
       AND pm.role IN ('admin', 'council', 'manager', 'property_admin')
      WHERE mt.id = meeting_resolutions.meeting_id
    )
  );
