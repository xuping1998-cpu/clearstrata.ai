-- E-01 / IU-1.1 — Snapshot Domain Schema (Phase 1 foundation)
-- IU-1.1C — re-timestamped from 20260622190000 (after migration head 20261723140000).
-- Authority: IA-001 · Blueprint §9 · RC010-B §7.7
-- Scope: schema-as-code alignment only. No RPC changes. No immutability hooks.
-- Pre-flight: docs/implementation/E-01-IU-1.1C-Deployment-Readiness.md
-- Legacy rows without future freeze-event linkage remain governed by current production behavior.

BEGIN;

-- ---------------------------------------------------------------------------
-- owner_vote_meetings.snapshot_frozen_at — production handoff marker (RC010-B §7.6)
-- Referenced in repo since 20261324120000; column CREATE was missing from migrations.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.owner_vote_meetings') IS NOT NULL THEN
    ALTER TABLE public.owner_vote_meetings
      ADD COLUMN IF NOT EXISTS snapshot_frozen_at timestamptz;

    COMMENT ON COLUMN public.owner_vote_meetings.snapshot_frozen_at IS
      'E-01 / RC010-B — voter-roll freeze completion marker (handoff to voting). Distinct from snapshot_freeze_at (planned time).';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- owner_vote_voter_snapshot — Blueprint §9 Voter Snapshot / Voter Entry persistence
-- Production contract: RC010-B §7.7 (confirmed via linked Supabase, 2026-06-23).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.owner_vote_voter_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL,
  property_id uuid NOT NULL,
  unit_no text NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL,
  is_eligible boolean NOT NULL,
  frozen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.owner_vote_voter_snapshot IS
  'E-01 / Blueprint §9 — legal voter roll entries at freeze (Voter Snapshot domain). '
  'Materialized by freeze_owner_vote_snapshot in production; immutable enforcement deferred to Phase 2+ / E-02.';

COMMENT ON COLUMN public.owner_vote_voter_snapshot.meeting_id IS
  'owner_vote_meetings.id — owner-vote session bound to property.';
COMMENT ON COLUMN public.owner_vote_voter_snapshot.property_id IS
  'Tenant isolation (RC000).';
COMMENT ON COLUMN public.owner_vote_voter_snapshot.unit_no IS
  'One eligible voter per unit at freeze instant (council beats owner in ranking).';
COMMENT ON COLUMN public.owner_vote_voter_snapshot.user_id IS
  'Eligible voter auth.users id at freeze instant.';
COMMENT ON COLUMN public.owner_vote_voter_snapshot.role IS
  'property_members.role at freeze instant (owner or council).';
COMMENT ON COLUMN public.owner_vote_voter_snapshot.is_eligible IS
  'True when this row is the ranked eligible voter for the unit.';
COMMENT ON COLUMN public.owner_vote_voter_snapshot.frozen_at IS
  'Row materialization instant (defaults now() on insert; production RPC may rely on default).';
COMMENT ON COLUMN public.owner_vote_voter_snapshot.created_at IS
  'Row creation timestamp.';

-- Foreign keys: skip when parent absent, when equivalent FK exists (any name), or when orphans would block ADD.
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
         AND rel.relname = 'owner_vote_voter_snapshot'
         AND c.contype = 'f'
         AND a.attname = 'meeting_id'
         AND pref.relname = 'owner_vote_meetings'
     )
     AND NOT EXISTS (
       SELECT 1
       FROM public.owner_vote_voter_snapshot ovs
       LEFT JOIN public.owner_vote_meetings om ON om.id = ovs.meeting_id
       WHERE om.id IS NULL
     ) THEN
    ALTER TABLE public.owner_vote_voter_snapshot
      ADD CONSTRAINT owner_vote_voter_snapshot_meeting_id_fkey
      FOREIGN KEY (meeting_id) REFERENCES public.owner_vote_meetings(id) ON DELETE CASCADE;
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
         AND rel.relname = 'owner_vote_voter_snapshot'
         AND c.contype = 'f'
         AND a.attname = 'property_id'
         AND pref.relname = 'properties'
     )
     AND NOT EXISTS (
       SELECT 1
       FROM public.owner_vote_voter_snapshot ovs
       LEFT JOIN public.properties p ON p.id = ovs.property_id
       WHERE p.id IS NULL
     ) THEN
    ALTER TABLE public.owner_vote_voter_snapshot
      ADD CONSTRAINT owner_vote_voter_snapshot_property_id_fkey
      FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Query paths: meeting meta load, viewer unit lookup, election RLS, voting notices.
CREATE INDEX IF NOT EXISTS idx_owner_vote_voter_snapshot_meeting_id
  ON public.owner_vote_voter_snapshot (meeting_id);

CREATE INDEX IF NOT EXISTS idx_owner_vote_voter_snapshot_meeting_user
  ON public.owner_vote_voter_snapshot (meeting_id, user_id);

CREATE INDEX IF NOT EXISTS idx_owner_vote_voter_snapshot_meeting_eligible
  ON public.owner_vote_voter_snapshot (meeting_id)
  WHERE is_eligible IS TRUE;

CREATE INDEX IF NOT EXISTS idx_owner_vote_voter_snapshot_meeting_unit_norm
  ON public.owner_vote_voter_snapshot (
    meeting_id,
    lower(trim(both FROM unit_no))
  );

-- RLS: enable on new installs; add baseline SELECT policy only when table has none (preserve production policies).
ALTER TABLE public.owner_vote_voter_snapshot ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'owner_vote_voter_snapshot'
  ) THEN
    CREATE POLICY ovvs_select_tenant_member
      ON public.owner_vote_voter_snapshot
      FOR SELECT
      TO authenticated
      USING (property_id IN (SELECT public.user_property_ids()));
  END IF;
END $$;

GRANT SELECT ON public.owner_vote_voter_snapshot TO authenticated;
GRANT ALL ON public.owner_vote_voter_snapshot TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
