-- E-01 / IU-2.2 — Voter Snapshot Immutability (Phase 2)
-- Authority: IA-001 · Blueprint §9 · INV-1
-- Scope: UPDATE/DELETE protection for rows where freeze_event_id IS NOT NULL only.
-- Legacy rows (freeze_event_id IS NULL) retain production DELETE + INSERT rebuild path.
-- No RPC, orchestration, resolution snapshot, or application changes.

BEGIN;

COMMENT ON TABLE public.owner_vote_voter_snapshot IS
  'E-01 / Blueprint §9 — legal voter roll entries at freeze (Voter Snapshot domain). '
  'Materialized by freeze_owner_vote_snapshot in production. '
  'Rows with freeze_event_id IS NOT NULL are immutable (IU-2.2); legacy rows without linkage remain DELETE+rebuild until E-02.';

-- ---------------------------------------------------------------------------
-- Event-linked immutability guard (INV-1 foundation)
-- Fires only when OLD.freeze_event_id IS NOT NULL (legacy path unchanged).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.owner_vote_voter_snapshot_event_linked_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION
      'Event-linked owner_vote_voter_snapshot rows are immutable (E-01 INV-1)';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'Event-linked owner_vote_voter_snapshot rows cannot be deleted (E-01 INV-1)';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.owner_vote_voter_snapshot_event_linked_immutable() IS
  'E-01 IU-2.2 — blocks UPDATE/DELETE on voter snapshot rows correlated to a freeze event. '
  'Legacy rows with freeze_event_id IS NULL are not affected.';

DROP TRIGGER IF EXISTS trg_owner_vote_voter_snapshot_event_linked_immutable
  ON public.owner_vote_voter_snapshot;

CREATE TRIGGER trg_owner_vote_voter_snapshot_event_linked_immutable
  BEFORE UPDATE OR DELETE ON public.owner_vote_voter_snapshot
  FOR EACH ROW
  WHEN (OLD.freeze_event_id IS NOT NULL)
  EXECUTE FUNCTION public.owner_vote_voter_snapshot_event_linked_immutable();

COMMIT;

NOTIFY pgrst, 'reload schema';
