-- E-01 / IU-3.2 — Resolution Snapshot Immutability (Phase 3)
-- Authority: IA-001 · Blueprint §9 · INV-1
-- Scope: UPDATE/DELETE protection for owner_vote_resolution_snapshot and owner_vote_frozen_motions
--        where freeze_event_id IS NOT NULL (all E-02-populated rows).
-- No population, ballot binding, orchestration, RPC, or application changes.

BEGIN;

COMMENT ON TABLE public.owner_vote_resolution_snapshot IS
  'E-01 / Blueprint §9 — immutable voting instrument header at freeze (Resolution Snapshot). '
  'One instrument per Freeze Event; formal motion content lives in owner_vote_frozen_motions. '
  'Event-linked rows are immutable (IU-3.2); populated by E-02 freeze orchestration.';

COMMENT ON TABLE public.owner_vote_frozen_motions IS
  'E-01 / Blueprint §9 — immutable formal motion rows at freeze (Resolution Snapshot content). '
  'Stable frozen motion identity (id) is distinct from live owner_vote_resolutions.id. '
  'Event-linked rows are immutable (IU-3.2); materialized by E-02.';

-- ---------------------------------------------------------------------------
-- Resolution Snapshot instrument header — event-linked immutability (INV-1)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.owner_vote_resolution_snapshot_event_linked_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION
      'Event-linked owner_vote_resolution_snapshot rows are immutable (E-01 INV-1)';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'Event-linked owner_vote_resolution_snapshot rows cannot be deleted (E-01 INV-1)';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.owner_vote_resolution_snapshot_event_linked_immutable() IS
  'E-01 IU-3.2 — blocks UPDATE/DELETE on Resolution Snapshot rows correlated to a freeze event.';

DROP TRIGGER IF EXISTS trg_owner_vote_resolution_snapshot_event_linked_immutable
  ON public.owner_vote_resolution_snapshot;

CREATE TRIGGER trg_owner_vote_resolution_snapshot_event_linked_immutable
  BEFORE UPDATE OR DELETE ON public.owner_vote_resolution_snapshot
  FOR EACH ROW
  WHEN (OLD.freeze_event_id IS NOT NULL)
  EXECUTE FUNCTION public.owner_vote_resolution_snapshot_event_linked_immutable();

-- ---------------------------------------------------------------------------
-- Frozen Motion rows — event-linked immutability (INV-1)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.owner_vote_frozen_motions_event_linked_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION
      'Event-linked owner_vote_frozen_motions rows are immutable (E-01 INV-1)';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'Event-linked owner_vote_frozen_motions rows cannot be deleted (E-01 INV-1)';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.owner_vote_frozen_motions_event_linked_immutable() IS
  'E-01 IU-3.2 — blocks UPDATE/DELETE on frozen motion rows correlated to a freeze event.';

DROP TRIGGER IF EXISTS trg_owner_vote_frozen_motions_event_linked_immutable
  ON public.owner_vote_frozen_motions;

CREATE TRIGGER trg_owner_vote_frozen_motions_event_linked_immutable
  BEFORE UPDATE OR DELETE ON public.owner_vote_frozen_motions
  FOR EACH ROW
  WHEN (OLD.freeze_event_id IS NOT NULL)
  EXECUTE FUNCTION public.owner_vote_frozen_motions_event_linked_immutable();

COMMIT;

NOTIFY pgrst, 'reload schema';
