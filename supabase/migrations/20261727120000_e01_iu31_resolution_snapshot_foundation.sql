-- E-01 / IU-3.1 — Resolution Snapshot Foundation (Phase 3)
-- Authority: IA-001 · Blueprint §9 · RC010-A dual snapshot
-- Scope: Resolution Snapshot instrument header + Frozen Motion persistence only.
-- No population, immutability hooks, ballot identity, RPC, or orchestration changes.

BEGIN;

-- ---------------------------------------------------------------------------
-- owner_vote_resolution_snapshot — Blueprint §9 Resolution Snapshot (instrument header)
-- One row per Freeze Event (1:1). E-02 materializes on commit.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.owner_vote_resolution_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  freeze_event_id uuid NOT NULL,
  owner_vote_meeting_id uuid NOT NULL,
  property_id uuid NOT NULL,
  frozen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.owner_vote_resolution_snapshot IS
  'E-01 / Blueprint §9 — immutable voting instrument header at freeze (Resolution Snapshot). '
  'One instrument per Freeze Event; formal motion content lives in owner_vote_frozen_motions. '
  'Populated by E-02 freeze orchestration; legacy freezes may exist without rows until migration.';

COMMENT ON COLUMN public.owner_vote_resolution_snapshot.id IS
  'Stable Resolution Snapshot identity; correlates frozen motions and future ballot binding (CITM 2).';
COMMENT ON COLUMN public.owner_vote_resolution_snapshot.freeze_event_id IS
  'owner_vote_freeze_events.id — 1:1 binding to the same Freeze Event as voter snapshot (INV-7).';
COMMENT ON COLUMN public.owner_vote_resolution_snapshot.owner_vote_meeting_id IS
  'owner_vote_meetings.id — owner-vote session for this instrument.';
COMMENT ON COLUMN public.owner_vote_resolution_snapshot.property_id IS
  'Tenant isolation (RC000); must match owner_vote_meetings.property_id at write time (E-02).';
COMMENT ON COLUMN public.owner_vote_resolution_snapshot.frozen_at IS
  'Instrument materialization instant; distinct from freeze event frozen_at until E-02 aligns writes.';
COMMENT ON COLUMN public.owner_vote_resolution_snapshot.created_at IS
  'Row creation timestamp.';

-- ---------------------------------------------------------------------------
-- owner_vote_frozen_motions — Blueprint §9 Formal Motions (frozen content)
-- N motions per Resolution Snapshot; stable id distinct from live owner_vote_resolutions.id.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.owner_vote_frozen_motions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resolution_snapshot_id uuid NOT NULL,
  freeze_event_id uuid NOT NULL,
  owner_vote_meeting_id uuid NOT NULL,
  property_id uuid NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  description text,
  threshold text NOT NULL,
  vote_method text,
  source_agenda_item_id uuid,
  source_resolution_id uuid,
  source_formal_resolution_version integer,
  frozen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.owner_vote_frozen_motions IS
  'E-01 / Blueprint §9 — immutable formal motion rows at freeze (Resolution Snapshot content). '
  'Stable frozen motion identity (id) is distinct from live owner_vote_resolutions.id. '
  'Materialized from meeting-owned formal resolutions at freeze instant by E-02.';

COMMENT ON COLUMN public.owner_vote_frozen_motions.id IS
  'Stable frozen motion identity — future ballot binding target (CITM 11); not live resolution row id.';
COMMENT ON COLUMN public.owner_vote_frozen_motions.resolution_snapshot_id IS
  'Parent Resolution Snapshot instrument header (owner_vote_resolution_snapshot.id).';
COMMENT ON COLUMN public.owner_vote_frozen_motions.freeze_event_id IS
  'Denormalized correlation to owner_vote_freeze_events.id for dual-snapshot queries.';
COMMENT ON COLUMN public.owner_vote_frozen_motions.display_order IS
  'Presentation order within the frozen instrument at freeze instant.';
COMMENT ON COLUMN public.owner_vote_frozen_motions.title IS
  'Formal motion title at freeze instant.';
COMMENT ON COLUMN public.owner_vote_frozen_motions.description IS
  'Formal resolution text / body at freeze instant (RC010-A element B).';
COMMENT ON COLUMN public.owner_vote_frozen_motions.threshold IS
  'Approval threshold at freeze instant (e.g. majority, three_quarter, unanimous).';
COMMENT ON COLUMN public.owner_vote_frozen_motions.vote_method IS
  'Voting method at freeze instant when applicable; nullable until E-02 maps source.';
COMMENT ON COLUMN public.owner_vote_frozen_motions.source_agenda_item_id IS
  'meeting_agenda_items.id — Meeting-owned authoring source at freeze (RC010-A element F).';
COMMENT ON COLUMN public.owner_vote_frozen_motions.source_resolution_id IS
  'owner_vote_resolutions.id — live projection source at freeze; nullable for legacy paths.';
COMMENT ON COLUMN public.owner_vote_frozen_motions.source_formal_resolution_version IS
  'formal_resolution_version from agenda item at freeze instant when available.';

-- Parent FKs (conditional; skip when orphans would block ADD on existing data).
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
         AND rel.relname = 'owner_vote_resolution_snapshot'
         AND c.contype = 'f'
         AND a.attname = 'freeze_event_id'
         AND pref.relname = 'owner_vote_freeze_events'
     )
     AND NOT EXISTS (
       SELECT 1
       FROM public.owner_vote_resolution_snapshot rs
       WHERE rs.freeze_event_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM public.owner_vote_freeze_events fe WHERE fe.id = rs.freeze_event_id
         )
     ) THEN
    ALTER TABLE public.owner_vote_resolution_snapshot
      ADD CONSTRAINT owner_vote_resolution_snapshot_freeze_event_id_fkey
      FOREIGN KEY (freeze_event_id) REFERENCES public.owner_vote_freeze_events(id) ON DELETE RESTRICT;
  END IF;

  IF to_regclass('public.owner_vote_meetings') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint c
       JOIN pg_class rel ON rel.oid = c.conrelid
       JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey) AND NOT a.attisdropped
       JOIN pg_class pref ON pref.oid = c.confrelid
       WHERE nsp.nspname = 'public'
         AND rel.relname = 'owner_vote_resolution_snapshot'
         AND c.contype = 'f'
         AND a.attname = 'owner_vote_meeting_id'
         AND pref.relname = 'owner_vote_meetings'
     )
     AND NOT EXISTS (
       SELECT 1
       FROM public.owner_vote_resolution_snapshot rs
       LEFT JOIN public.owner_vote_meetings om ON om.id = rs.owner_vote_meeting_id
       WHERE om.id IS NULL
     ) THEN
    ALTER TABLE public.owner_vote_resolution_snapshot
      ADD CONSTRAINT owner_vote_resolution_snapshot_meeting_id_fkey
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
         AND rel.relname = 'owner_vote_resolution_snapshot'
         AND c.contype = 'f'
         AND a.attname = 'property_id'
         AND pref.relname = 'properties'
     )
     AND NOT EXISTS (
       SELECT 1
       FROM public.owner_vote_resolution_snapshot rs
       LEFT JOIN public.properties p ON p.id = rs.property_id
       WHERE p.id IS NULL
     ) THEN
    ALTER TABLE public.owner_vote_resolution_snapshot
      ADD CONSTRAINT owner_vote_resolution_snapshot_property_id_fkey
      FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.owner_vote_resolution_snapshot') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint c
       JOIN pg_class rel ON rel.oid = c.conrelid
       JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey) AND NOT a.attisdropped
       JOIN pg_class pref ON pref.oid = c.confrelid
       WHERE nsp.nspname = 'public'
         AND rel.relname = 'owner_vote_frozen_motions'
         AND c.contype = 'f'
         AND a.attname = 'resolution_snapshot_id'
         AND pref.relname = 'owner_vote_resolution_snapshot'
     ) THEN
    ALTER TABLE public.owner_vote_frozen_motions
      ADD CONSTRAINT owner_vote_frozen_motions_resolution_snapshot_id_fkey
      FOREIGN KEY (resolution_snapshot_id) REFERENCES public.owner_vote_resolution_snapshot(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.owner_vote_freeze_events') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint c
       JOIN pg_class rel ON rel.oid = c.conrelid
       JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey) AND NOT a.attisdropped
       JOIN pg_class pref ON pref.oid = c.confrelid
       WHERE nsp.nspname = 'public'
         AND rel.relname = 'owner_vote_frozen_motions'
         AND c.contype = 'f'
         AND a.attname = 'freeze_event_id'
         AND pref.relname = 'owner_vote_freeze_events'
     )
     AND NOT EXISTS (
       SELECT 1
       FROM public.owner_vote_frozen_motions fm
       WHERE fm.freeze_event_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM public.owner_vote_freeze_events fe WHERE fe.id = fm.freeze_event_id
         )
     ) THEN
    ALTER TABLE public.owner_vote_frozen_motions
      ADD CONSTRAINT owner_vote_frozen_motions_freeze_event_id_fkey
      FOREIGN KEY (freeze_event_id) REFERENCES public.owner_vote_freeze_events(id) ON DELETE RESTRICT;
  END IF;

  IF to_regclass('public.owner_vote_meetings') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint c
       JOIN pg_class rel ON rel.oid = c.conrelid
       JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey) AND NOT a.attisdropped
       JOIN pg_class pref ON pref.oid = c.confrelid
       WHERE nsp.nspname = 'public'
         AND rel.relname = 'owner_vote_frozen_motions'
         AND c.contype = 'f'
         AND a.attname = 'owner_vote_meeting_id'
         AND pref.relname = 'owner_vote_meetings'
     )
     AND NOT EXISTS (
       SELECT 1
       FROM public.owner_vote_frozen_motions fm
       LEFT JOIN public.owner_vote_meetings om ON om.id = fm.owner_vote_meeting_id
       WHERE om.id IS NULL
     ) THEN
    ALTER TABLE public.owner_vote_frozen_motions
      ADD CONSTRAINT owner_vote_frozen_motions_meeting_id_fkey
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
         AND rel.relname = 'owner_vote_frozen_motions'
         AND c.contype = 'f'
         AND a.attname = 'property_id'
         AND pref.relname = 'properties'
     )
     AND NOT EXISTS (
       SELECT 1
       FROM public.owner_vote_frozen_motions fm
       LEFT JOIN public.properties p ON p.id = fm.property_id
       WHERE p.id IS NULL
     ) THEN
    ALTER TABLE public.owner_vote_frozen_motions
      ADD CONSTRAINT owner_vote_frozen_motions_property_id_fkey
      FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.meeting_agenda_items') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint c
       JOIN pg_class rel ON rel.oid = c.conrelid
       JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey) AND NOT a.attisdropped
       JOIN pg_class pref ON pref.oid = c.confrelid
       WHERE nsp.nspname = 'public'
         AND rel.relname = 'owner_vote_frozen_motions'
         AND c.contype = 'f'
         AND a.attname = 'source_agenda_item_id'
         AND pref.relname = 'meeting_agenda_items'
     )
     AND NOT EXISTS (
       SELECT 1
       FROM public.owner_vote_frozen_motions fm
       WHERE fm.source_agenda_item_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM public.meeting_agenda_items ai WHERE ai.id = fm.source_agenda_item_id
         )
     ) THEN
    ALTER TABLE public.owner_vote_frozen_motions
      ADD CONSTRAINT owner_vote_frozen_motions_source_agenda_item_id_fkey
      FOREIGN KEY (source_agenda_item_id) REFERENCES public.meeting_agenda_items(id) ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.owner_vote_resolutions') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint c
       JOIN pg_class rel ON rel.oid = c.conrelid
       JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey) AND NOT a.attisdropped
       JOIN pg_class pref ON pref.oid = c.confrelid
       WHERE nsp.nspname = 'public'
         AND rel.relname = 'owner_vote_frozen_motions'
         AND c.contype = 'f'
         AND a.attname = 'source_resolution_id'
         AND pref.relname = 'owner_vote_resolutions'
     )
     AND NOT EXISTS (
       SELECT 1
       FROM public.owner_vote_frozen_motions fm
       WHERE fm.source_resolution_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM public.owner_vote_resolutions r WHERE r.id = fm.source_resolution_id
         )
     ) THEN
    ALTER TABLE public.owner_vote_frozen_motions
      ADD CONSTRAINT owner_vote_frozen_motions_source_resolution_id_fkey
      FOREIGN KEY (source_resolution_id) REFERENCES public.owner_vote_resolutions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Blueprint §9: one Resolution Snapshot instrument per Freeze Event.
CREATE UNIQUE INDEX IF NOT EXISTS owner_vote_resolution_snapshot_one_per_freeze_event
  ON public.owner_vote_resolution_snapshot (freeze_event_id);

CREATE INDEX IF NOT EXISTS idx_owner_vote_resolution_snapshot_meeting_id
  ON public.owner_vote_resolution_snapshot (owner_vote_meeting_id);

CREATE INDEX IF NOT EXISTS idx_owner_vote_resolution_snapshot_property_id
  ON public.owner_vote_resolution_snapshot (property_id);

CREATE UNIQUE INDEX IF NOT EXISTS owner_vote_frozen_motions_snapshot_display_order
  ON public.owner_vote_frozen_motions (resolution_snapshot_id, display_order);

CREATE INDEX IF NOT EXISTS idx_owner_vote_frozen_motions_freeze_event_id
  ON public.owner_vote_frozen_motions (freeze_event_id);

CREATE INDEX IF NOT EXISTS idx_owner_vote_frozen_motions_meeting_id
  ON public.owner_vote_frozen_motions (owner_vote_meeting_id);

CREATE INDEX IF NOT EXISTS idx_owner_vote_frozen_motions_property_id
  ON public.owner_vote_frozen_motions (property_id);

CREATE INDEX IF NOT EXISTS idx_owner_vote_frozen_motions_source_resolution_id
  ON public.owner_vote_frozen_motions (source_resolution_id)
  WHERE source_resolution_id IS NOT NULL;

-- RLS: tenant-scoped read; writes via E-02 SECURITY DEFINER paths.
ALTER TABLE public.owner_vote_resolution_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_vote_frozen_motions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'owner_vote_resolution_snapshot'
  ) THEN
    CREATE POLICY ovrs_select_tenant_member
      ON public.owner_vote_resolution_snapshot
      FOR SELECT
      TO authenticated
      USING (property_id IN (SELECT public.user_property_ids()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'owner_vote_frozen_motions'
  ) THEN
    CREATE POLICY ovfm_select_tenant_member
      ON public.owner_vote_frozen_motions
      FOR SELECT
      TO authenticated
      USING (property_id IN (SELECT public.user_property_ids()));
  END IF;
END $$;

GRANT SELECT ON public.owner_vote_resolution_snapshot TO authenticated;
GRANT ALL ON public.owner_vote_resolution_snapshot TO service_role;

GRANT SELECT ON public.owner_vote_frozen_motions TO authenticated;
GRANT ALL ON public.owner_vote_frozen_motions TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
