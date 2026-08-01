-- RC-011 IU-5 / E-01 immutability negative tests (transactional fixtures; ROLLBACK at end)
BEGIN;

DO $$
DECLARE
  v_meeting_id uuid;
  v_property_id uuid;
  v_user_id uuid;
  v_unit_no text;
  v_fe_id uuid := gen_random_uuid();
  v_vs_id uuid := gen_random_uuid();
  v_rs_id uuid := gen_random_uuid();
  v_fm_id uuid := gen_random_uuid();
  v_legacy_id uuid := gen_random_uuid();
  v_err text;
BEGIN
  SELECT meeting_id, property_id, user_id, unit_no
  INTO v_meeting_id, v_property_id, v_user_id, v_unit_no
  FROM public.owner_vote_voter_snapshot
  LIMIT 1;

  IF v_meeting_id IS NULL THEN
    RAISE EXCEPTION 'No voter snapshot seed row available for fixtures';
  END IF;

  -- Fixtures for event-linked immutability (Tests A, B, D, E, F, G)
  INSERT INTO public.owner_vote_freeze_events (id, owner_vote_meeting_id, property_id)
  VALUES (v_fe_id, v_meeting_id, v_property_id);

  INSERT INTO public.owner_vote_voter_snapshot (
    id, meeting_id, property_id, unit_no, user_id, role, is_eligible, freeze_event_id
  ) VALUES (
    v_vs_id, v_meeting_id, v_property_id, 'IU5-TEST-UNIT', v_user_id, 'owner', true, v_fe_id
  );

  INSERT INTO public.owner_vote_resolution_snapshot (
    id, freeze_event_id, owner_vote_meeting_id, property_id
  ) VALUES (
    v_rs_id, v_fe_id, v_meeting_id, v_property_id
  );

  INSERT INTO public.owner_vote_frozen_motions (
    id, resolution_snapshot_id, freeze_event_id, owner_vote_meeting_id, property_id,
    title, threshold
  ) VALUES (
    v_fm_id, v_rs_id, v_fe_id, v_meeting_id, v_property_id,
    'IU5 test motion', 'majority'
  );

  -- Test A: event-linked voter snapshot UPDATE rejected
  BEGIN
    UPDATE public.owner_vote_voter_snapshot SET unit_no = 'changed' WHERE id = v_vs_id;
    RAISE EXCEPTION 'Test A FAILED: UPDATE should have been rejected';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    IF v_err NOT LIKE '%immutable (E-01 INV-1)%' THEN
      RAISE EXCEPTION 'Test A unexpected error: %', v_err;
    END IF;
    RAISE NOTICE 'Test A PASSED: %', v_err;
  END;

  -- Test B: event-linked voter snapshot DELETE rejected
  BEGIN
    DELETE FROM public.owner_vote_voter_snapshot WHERE id = v_vs_id;
    RAISE EXCEPTION 'Test B FAILED: DELETE should have been rejected';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    IF v_err NOT LIKE '%cannot be deleted (E-01 INV-1)%' THEN
      RAISE EXCEPTION 'Test B unexpected error: %', v_err;
    END IF;
    RAISE NOTICE 'Test B PASSED: %', v_err;
  END;

  -- Test C: legacy NULL-linked row DELETE allowed
  INSERT INTO public.owner_vote_voter_snapshot (
    id, meeting_id, property_id, unit_no, user_id, role, is_eligible, freeze_event_id
  ) VALUES (
    v_legacy_id, v_meeting_id, v_property_id, 'IU5-LEGACY-TEST', v_user_id, 'owner', true, NULL
  );
  DELETE FROM public.owner_vote_voter_snapshot WHERE id = v_legacy_id;
  RAISE NOTICE 'Test C PASSED: legacy NULL freeze_event_id DELETE succeeded';

  -- Test D: resolution snapshot UPDATE rejected
  BEGIN
    UPDATE public.owner_vote_resolution_snapshot SET frozen_at = now() WHERE id = v_rs_id;
    RAISE EXCEPTION 'Test D FAILED: UPDATE should have been rejected';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    IF v_err NOT LIKE '%owner_vote_resolution_snapshot rows are immutable%' THEN
      RAISE EXCEPTION 'Test D unexpected error: %', v_err;
    END IF;
    RAISE NOTICE 'Test D PASSED: %', v_err;
  END;

  -- Test E: resolution snapshot DELETE rejected
  BEGIN
    DELETE FROM public.owner_vote_resolution_snapshot WHERE id = v_rs_id;
    RAISE EXCEPTION 'Test E FAILED: DELETE should have been rejected';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    IF v_err NOT LIKE '%owner_vote_resolution_snapshot rows cannot be deleted%' THEN
      RAISE EXCEPTION 'Test E unexpected error: %', v_err;
    END IF;
    RAISE NOTICE 'Test E PASSED: %', v_err;
  END;

  -- Test F: frozen motion UPDATE rejected
  BEGIN
    UPDATE public.owner_vote_frozen_motions SET title = 'changed' WHERE id = v_fm_id;
    RAISE EXCEPTION 'Test F FAILED: UPDATE should have been rejected';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    IF v_err NOT LIKE '%owner_vote_frozen_motions rows are immutable%' THEN
      RAISE EXCEPTION 'Test F unexpected error: %', v_err;
    END IF;
    RAISE NOTICE 'Test F PASSED: %', v_err;
  END;

  -- Test G: frozen motion DELETE rejected
  BEGIN
    DELETE FROM public.owner_vote_frozen_motions WHERE id = v_fm_id;
    RAISE EXCEPTION 'Test G FAILED: DELETE should have been rejected';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    IF v_err NOT LIKE '%owner_vote_frozen_motions rows cannot be deleted%' THEN
      RAISE EXCEPTION 'Test G unexpected error: %', v_err;
    END IF;
    RAISE NOTICE 'Test G PASSED: %', v_err;
  END;
END $$;

ROLLBACK;
