-- E-02 / RU-1.1 — Primary Audit Physical Foundation (Artifact G)
-- Authority: E-02-RU-1.1-Implementation-Authorization.md · E-02-RU-1.1-Implementation-Review.md
-- Scope: physical persistence target only. No RPC, orchestration, backfill, or meeting status writes.
-- Prior migration head: 20261728120000_e01_iu32_resolution_snapshot_immutability.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- owner_vote_primary_freeze_audits — E-02 Artifact G (Primary Freeze Audit)
-- INSERT ONCE → COMMIT ONCE → NEVER UPDATE. No committed_at column.
-- ---------------------------------------------------------------------------
CREATE TABLE public.owner_vote_primary_freeze_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  freeze_event_id uuid NOT NULL,
  owner_vote_meeting_id uuid NOT NULL,
  property_id uuid NOT NULL,
  attempt_id uuid NOT NULL,
  freeze_boundary_at timestamptz NOT NULL,
  audit_kind text NOT NULL,
  schema_version integer NOT NULL DEFAULT 1,
  primary_event_is_primary boolean NOT NULL,
  voter_snapshot_count integer NOT NULL,
  resolution_snapshot_count integer NOT NULL,
  frozen_motion_count integer NOT NULL,
  materialization_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  commit_set_result text NOT NULL,
  marker_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  meeting_lifecycle_compatibility jsonb NOT NULL DEFAULT '{}'::jsonb,
  transaction_outcome text NOT NULL,
  commit_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  transaction_reference_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT owner_vote_primary_freeze_audits_audit_kind_check
    CHECK (audit_kind = 'PRIMARY_FREEZE_AUDIT'),
  CONSTRAINT owner_vote_primary_freeze_audits_schema_version_check
    CHECK (schema_version >= 1),
  CONSTRAINT owner_vote_primary_freeze_audits_voter_snapshot_count_check
    CHECK (voter_snapshot_count >= 0),
  CONSTRAINT owner_vote_primary_freeze_audits_resolution_snapshot_count_check
    CHECK (resolution_snapshot_count BETWEEN 0 AND 1),
  CONSTRAINT owner_vote_primary_freeze_audits_frozen_motion_count_check
    CHECK (frozen_motion_count >= 0),
  CONSTRAINT owner_vote_primary_freeze_audits_commit_set_result_check
    CHECK (commit_set_result = 'ATOMIC_SET_COMPLETE'),
  CONSTRAINT owner_vote_primary_freeze_audits_transaction_outcome_check
    CHECK (transaction_outcome = 'ATOMIC_ENVELOPE_MEMBER'),
  CONSTRAINT owner_vote_primary_freeze_audits_freeze_event_id_key
    UNIQUE (freeze_event_id),
  CONSTRAINT owner_vote_primary_freeze_audits_freeze_event_id_fkey
    FOREIGN KEY (freeze_event_id) REFERENCES public.owner_vote_freeze_events(id) ON DELETE RESTRICT,
  CONSTRAINT owner_vote_primary_freeze_audits_owner_vote_meeting_id_fkey
    FOREIGN KEY (owner_vote_meeting_id) REFERENCES public.owner_vote_meetings(id) ON DELETE RESTRICT,
  CONSTRAINT owner_vote_primary_freeze_audits_property_id_fkey
    FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE RESTRICT
);

COMMENT ON TABLE public.owner_vote_primary_freeze_audits IS
  'E-02 / RU-1.1 — Primary Freeze Audit (Artifact G). Immutable evidence row per Freeze Event. '
  'Populated by E-02 RU-1.2 orchestration; no direct client mutation. INSERT ONCE only.';

COMMENT ON COLUMN public.owner_vote_primary_freeze_audits.freeze_event_id IS
  'owner_vote_freeze_events.id — exactly one Primary Audit per Freeze Event (UNIQUE).';
COMMENT ON COLUMN public.owner_vote_primary_freeze_audits.transaction_reference_at IS
  'Server transaction reference instant at INSERT (transaction_timestamp()). '
  'Not committed_at; not sole COMMITTED authority; durable only if row survives COMMIT.';
COMMENT ON COLUMN public.owner_vote_primary_freeze_audits.transaction_outcome IS
  'Pre-commit atomic envelope membership (ATOMIC_ENVELOPE_MEMBER). Not COMMITTED runtime authority.';
COMMENT ON COLUMN public.owner_vote_primary_freeze_audits.meeting_lifecycle_compatibility IS
  'Artifact F verify-only evidence snapshot. Does not mutate owner_vote_meetings.status.';
COMMENT ON COLUMN public.owner_vote_primary_freeze_audits.created_at IS
  'Row insert metadata only; not COMMITTED authority.';

CREATE INDEX idx_owner_vote_primary_freeze_audits_property_id
  ON public.owner_vote_primary_freeze_audits (property_id);

CREATE INDEX idx_owner_vote_primary_freeze_audits_meeting_id
  ON public.owner_vote_primary_freeze_audits (owner_vote_meeting_id);

-- ---------------------------------------------------------------------------
-- Immutability — all rows fail closed on UPDATE/DELETE (RU-1.1)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.owner_vote_primary_freeze_audits_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION
      'owner_vote_primary_freeze_audits rows are immutable (E-02 RU-1.1)';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'owner_vote_primary_freeze_audits rows cannot be deleted (E-02 RU-1.1)';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.owner_vote_primary_freeze_audits_immutable() IS
  'E-02 RU-1.1 — blocks UPDATE/DELETE on Primary Freeze Audit rows. INSERT via authorized server writer only.';

CREATE TRIGGER trg_owner_vote_primary_freeze_audits_immutable
  BEFORE UPDATE OR DELETE ON public.owner_vote_primary_freeze_audits
  FOR EACH ROW
  EXECUTE FUNCTION public.owner_vote_primary_freeze_audits_immutable();

-- RLS: tenant-scoped read; writes via future SECURITY DEFINER orchestration (RU-1.2).
ALTER TABLE public.owner_vote_primary_freeze_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY ovpfa_select_tenant_member
  ON public.owner_vote_primary_freeze_audits
  FOR SELECT
  TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

GRANT SELECT ON public.owner_vote_primary_freeze_audits TO authenticated;
GRANT ALL ON public.owner_vote_primary_freeze_audits TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
