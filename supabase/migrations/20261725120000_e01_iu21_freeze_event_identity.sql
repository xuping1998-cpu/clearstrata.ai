-- E-01 / IU-2.1 — Freeze Event Identity (Phase 2 foundation)
-- Authority: IA-001 · Blueprint §9 · INV-8
-- Scope: Freeze Event entity + voter snapshot correlation only.
-- No population, immutability hooks, resolution snapshot, RPC, or orchestration changes.

BEGIN;

-- ---------------------------------------------------------------------------
-- owner_vote_freeze_events — Blueprint §9 Freeze Event
-- Globally unique id per freeze boundary (INV-8). E-02 materializes rows on commit.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.owner_vote_freeze_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_vote_meeting_id uuid NOT NULL,
  property_id uuid NOT NULL,
  frozen_at timestamptz NOT NULL DEFAULT now(),
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.owner_vote_freeze_events IS
  'E-01 / Blueprint §9 — immutable marker that authoring ended and voting instrument is fixed (Freeze Event). '
  'Populated by E-02 freeze orchestration; legacy freezes may exist without rows until migration.';

COMMENT ON COLUMN public.owner_vote_freeze_events.id IS
  'Stable freeze event identity (INV-8); correlates voter snapshot entries and future resolution snapshot.';
COMMENT ON COLUMN public.owner_vote_freeze_events.owner_vote_meeting_id IS
  'owner_vote_meetings.id — owner-vote session for this freeze boundary.';
COMMENT ON COLUMN public.owner_vote_freeze_events.property_id IS
  'Tenant isolation (RC000); must match owner_vote_meetings.property_id at write time (E-02).';
COMMENT ON COLUMN public.owner_vote_freeze_events.frozen_at IS
  'Freeze commit instant; distinct from owner_vote_meetings.snapshot_frozen_at until E-02 aligns writes.';
COMMENT ON COLUMN public.owner_vote_freeze_events.is_primary IS
  'When true, the active primary freeze event for the meeting; at most one per meeting (partial unique index). '
  'Authorized reissue (E-06) sets prior rows is_primary=false before inserting a new primary event.';
COMMENT ON COLUMN public.owner_vote_freeze_events.created_at IS
  'Row creation timestamp.';

-- Parent FKs (conditional; skip when orphans would block ADD on existing data).
DO $$
BEGIN
  IF to_regclass('public.owner_vote_meetings') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint c
       JOIN pg_class rel ON rel.oid = c.conrelid
       JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey) AND NOT a.attisdropped
       JOIN pg_class pref ON pref.oid = c.confrelid
       WHERE nsp.nspname = 'public'
         AND rel.relname = 'owner_vote_freeze_events'
         AND c.contype = 'f'
         AND a.attname = 'owner_vote_meeting_id'
         AND pref.relname = 'owner_vote_meetings'
     ) THEN
    ALTER TABLE public.owner_vote_freeze_events
      ADD CONSTRAINT owner_vote_freeze_events_meeting_id_fkey
      FOREIGN KEY (owner_vote_meeting_id) REFERENCES public.owner_vote_meetings(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.properties') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint c
       JOIN pg_class rel ON rel.oid = c.conrelid
       JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey) AND NOT a.attisdropped
       JOIN pg_class pref ON pref.oid = c.confrelid
       WHERE nsp.nspname = 'public'
         AND rel.relname = 'owner_vote_freeze_events'
         AND c.contype = 'f'
         AND a.attname = 'property_id'
         AND pref.relname = 'properties'
     ) THEN
    ALTER TABLE public.owner_vote_freeze_events
      ADD CONSTRAINT owner_vote_freeze_events_property_id_fkey
      FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
  END IF;
END $$;

-- INV-8 / Blueprint §9: one primary successful freeze event per meeting boundary.
CREATE UNIQUE INDEX IF NOT EXISTS owner_vote_freeze_events_one_primary_per_meeting
  ON public.owner_vote_freeze_events (owner_vote_meeting_id)
  WHERE is_primary IS TRUE;

CREATE INDEX IF NOT EXISTS idx_owner_vote_freeze_events_meeting_id
  ON public.owner_vote_freeze_events (owner_vote_meeting_id);

CREATE INDEX IF NOT EXISTS idx_owner_vote_freeze_events_property_id
  ON public.owner_vote_freeze_events (property_id);

-- ---------------------------------------------------------------------------
-- Voter snapshot correlation — nullable for legacy rows and current production RPC.
-- ---------------------------------------------------------------------------
ALTER TABLE public.owner_vote_voter_snapshot
  ADD COLUMN IF NOT EXISTS freeze_event_id uuid;

COMMENT ON COLUMN public.owner_vote_voter_snapshot.freeze_event_id IS
  'E-01 IU-2.1 — correlation to owner_vote_freeze_events.id (Blueprint §9). '
  'NULL for legacy/production rows until E-02 freeze orchestration populates on commit.';

DO $$
BEGIN
  IF to_regclass('public.owner_vote_freeze_events') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint c
       JOIN pg_class rel ON rel.oid = c.conrelid
       JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey) AND NOT a.attisdropped
       JOIN pg_class pref ON pref.oid = c.confrelid
       WHERE nsp.nspname = 'public'
         AND rel.relname = 'owner_vote_voter_snapshot'
         AND c.contype = 'f'
         AND a.attname = 'freeze_event_id'
         AND pref.relname = 'owner_vote_freeze_events'
     )
     AND NOT EXISTS (
       SELECT 1
       FROM public.owner_vote_voter_snapshot ovs
       WHERE ovs.freeze_event_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM public.owner_vote_freeze_events fe WHERE fe.id = ovs.freeze_event_id
         )
     ) THEN
    ALTER TABLE public.owner_vote_voter_snapshot
      ADD CONSTRAINT owner_vote_voter_snapshot_freeze_event_id_fkey
      FOREIGN KEY (freeze_event_id) REFERENCES public.owner_vote_freeze_events(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_owner_vote_voter_snapshot_freeze_event_id
  ON public.owner_vote_voter_snapshot (freeze_event_id)
  WHERE freeze_event_id IS NOT NULL;

-- RLS: tenant-scoped read; writes via E-02 SECURITY DEFINER paths.
ALTER TABLE public.owner_vote_freeze_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'owner_vote_freeze_events'
  ) THEN
    CREATE POLICY ovfe_select_tenant_member
      ON public.owner_vote_freeze_events
      FOR SELECT
      TO authenticated
      USING (property_id IN (SELECT public.user_property_ids()));
  END IF;
END $$;

GRANT SELECT ON public.owner_vote_freeze_events TO authenticated;
GRANT ALL ON public.owner_vote_freeze_events TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
