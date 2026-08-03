import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase as defaultClient } from '@/lib/supabaseClient';

import {
  FREEZE_EVENT_SELECT,
  FROZEN_MOTION_SELECT,
  OWNER_VOTE_MEETING_SELECT,
  RESOLUTION_SNAPSHOT_SELECT,
  VOTER_SNAPSHOT_SELECT,
  type FreezeEventDbRow,
  type FrozenMotionDbRow,
  type OwnerVoteMeetingDbRow,
  type ResolutionSnapshotDbRow,
  type VoterSnapshotDbRow,
} from './dbRows';
import {
  SnapshotDomainReadError,
  snapshotReadErr,
  snapshotReadFromPostgrestError,
  snapshotReadOk,
  type SnapshotDomainReadResult,
} from './errors';
import {
  assembleFrozenMeetingBundle,
  mapFreezeEvent,
  mapFrozenMotion,
  mapOwnerVoteMeeting,
  mapResolutionSnapshot,
  mapVoterSnapshotEntry,
} from './mappers';
import type { FreezeEvent, FrozenMeetingBundle } from './types';
import {
  assertBundleCorrelation,
  validateFreezeEventRow,
  validateFrozenMotionRow,
  validateOwnerVoteMeetingRow,
  validateResolutionSnapshotRow,
  validateVoterSnapshotRow,
} from './validators';

/** Read-only repository contract for dual-snapshot frozen meeting state. */
export interface FrozenMeetingBundleRepository {
  loadByOwnerVoteMeetingId(ownerVoteMeetingId: string): Promise<SnapshotDomainReadResult<FrozenMeetingBundle>>;
  loadByFreezeEventId(freezeEventId: string): Promise<SnapshotDomainReadResult<FrozenMeetingBundle>>;
}

export type CreateFrozenMeetingBundleRepositoryOptions = {
  client?: SupabaseClient;
};

async function fetchMeeting(
  client: SupabaseClient,
  meetingId: string,
): Promise<SnapshotDomainReadResult<OwnerVoteMeetingDbRow>> {
  const { data, error } = await client
    .from('owner_vote_meetings')
    .select(OWNER_VOTE_MEETING_SELECT)
    .eq('id', meetingId)
    .maybeSingle();

  if (error) {
    return snapshotReadErr('DATABASE_ERROR', snapshotReadFromPostgrestError('load meeting', error.message).message);
  }
  if (!data) {
    return snapshotReadErr('MEETING_NOT_FOUND', `Owner vote meeting not found: ${meetingId}`);
  }

  try {
    return snapshotReadOk(validateOwnerVoteMeetingRow(data));
  } catch (e) {
    return snapshotReadErr(
      'INVALID_ROW',
      e instanceof SnapshotDomainReadError ? e.message : 'Invalid owner_vote_meetings row',
    );
  }
}

async function fetchPrimaryFreezeEventForMeeting(
  client: SupabaseClient,
  meetingId: string,
): Promise<SnapshotDomainReadResult<FreezeEventDbRow | null>> {
  const { data, error } = await client
    .from('owner_vote_freeze_events')
    .select(FREEZE_EVENT_SELECT)
    .eq('owner_vote_meeting_id', meetingId)
    .eq('is_primary', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return snapshotReadErr(
      'DATABASE_ERROR',
      snapshotReadFromPostgrestError('load primary freeze event', error.message).message,
    );
  }
  if (!data) {
    return snapshotReadOk(null);
  }

  try {
    return snapshotReadOk(validateFreezeEventRow(data));
  } catch (e) {
    return snapshotReadErr(
      'INVALID_ROW',
      e instanceof SnapshotDomainReadError ? e.message : 'Invalid owner_vote_freeze_events row',
    );
  }
}

async function fetchFreezeEventById(
  client: SupabaseClient,
  freezeEventId: string,
): Promise<SnapshotDomainReadResult<FreezeEventDbRow>> {
  const { data, error } = await client
    .from('owner_vote_freeze_events')
    .select(FREEZE_EVENT_SELECT)
    .eq('id', freezeEventId)
    .maybeSingle();

  if (error) {
    return snapshotReadErr(
      'DATABASE_ERROR',
      snapshotReadFromPostgrestError('load freeze event', error.message).message,
    );
  }
  if (!data) {
    return snapshotReadErr('FREEZE_EVENT_NOT_FOUND', `Freeze event not found: ${freezeEventId}`);
  }

  try {
    return snapshotReadOk(validateFreezeEventRow(data));
  } catch (e) {
    return snapshotReadErr(
      'INVALID_ROW',
      e instanceof SnapshotDomainReadError ? e.message : 'Invalid owner_vote_freeze_events row',
    );
  }
}

async function fetchVoterSnapshots(
  client: SupabaseClient,
  params: { meetingId: string; freezeEventId: string | null },
): Promise<SnapshotDomainReadResult<VoterSnapshotDbRow[]>> {
  let query = client.from('owner_vote_voter_snapshot').select(VOTER_SNAPSHOT_SELECT);

  if (params.freezeEventId) {
    query = query.eq('freeze_event_id', params.freezeEventId);
  } else {
    query = query.eq('meeting_id', params.meetingId);
  }

  const { data, error } = await query.order('unit_no', { ascending: true });

  if (error) {
    return snapshotReadErr(
      'DATABASE_ERROR',
      snapshotReadFromPostgrestError('load voter snapshot', error.message).message,
    );
  }

  try {
    const rows = (data ?? []).map((row) => validateVoterSnapshotRow(row));
    return snapshotReadOk(rows);
  } catch (e) {
    return snapshotReadErr(
      'INVALID_ROW',
      e instanceof SnapshotDomainReadError ? e.message : 'Invalid owner_vote_voter_snapshot row',
    );
  }
}

async function fetchResolutionSnapshot(
  client: SupabaseClient,
  freezeEventId: string,
): Promise<SnapshotDomainReadResult<ResolutionSnapshotDbRow | null>> {
  const { data, error } = await client
    .from('owner_vote_resolution_snapshot')
    .select(RESOLUTION_SNAPSHOT_SELECT)
    .eq('freeze_event_id', freezeEventId)
    .maybeSingle();

  if (error) {
    return snapshotReadErr(
      'DATABASE_ERROR',
      snapshotReadFromPostgrestError('load resolution snapshot', error.message).message,
    );
  }
  if (!data) {
    return snapshotReadOk(null);
  }

  try {
    return snapshotReadOk(validateResolutionSnapshotRow(data));
  } catch (e) {
    return snapshotReadErr(
      'INVALID_ROW',
      e instanceof SnapshotDomainReadError ? e.message : 'Invalid owner_vote_resolution_snapshot row',
    );
  }
}

async function fetchFrozenMotions(
  client: SupabaseClient,
  freezeEventId: string,
): Promise<SnapshotDomainReadResult<FrozenMotionDbRow[]>> {
  const { data, error } = await client
    .from('owner_vote_frozen_motions')
    .select(FROZEN_MOTION_SELECT)
    .eq('freeze_event_id', freezeEventId)
    .order('display_order', { ascending: true });

  if (error) {
    return snapshotReadErr(
      'DATABASE_ERROR',
      snapshotReadFromPostgrestError('load frozen motions', error.message).message,
    );
  }

  try {
    const rows = (data ?? []).map((row) => validateFrozenMotionRow(row));
    return snapshotReadOk(rows);
  } catch (e) {
    return snapshotReadErr(
      'INVALID_ROW',
      e instanceof SnapshotDomainReadError ? e.message : 'Invalid owner_vote_frozen_motions row',
    );
  }
}

async function buildBundleFromParts(
  client: SupabaseClient,
  meetingRow: OwnerVoteMeetingDbRow,
  freezeEventRow: FreezeEventDbRow | null,
): Promise<SnapshotDomainReadResult<FrozenMeetingBundle>> {
  const meeting = mapOwnerVoteMeeting(meetingRow);
  const freezeEvent: FreezeEvent | null = freezeEventRow ? mapFreezeEvent(freezeEventRow) : null;
  const readMode = freezeEvent ? 'event_linked' : 'legacy_meeting';

  const voterRes = await fetchVoterSnapshots(client, {
    meetingId: meeting.id,
    freezeEventId: freezeEvent?.id ?? null,
  });
  if (!voterRes.ok) return voterRes;

  let resolutionSnapshot = null;
  let frozenMotionRows: FrozenMotionDbRow[] = [];

  if (freezeEvent) {
    const resolutionRes = await fetchResolutionSnapshot(client, freezeEvent.id);
    if (!resolutionRes.ok) return resolutionRes;
    resolutionSnapshot = resolutionRes.data ? mapResolutionSnapshot(resolutionRes.data) : null;

    const motionsRes = await fetchFrozenMotions(client, freezeEvent.id);
    if (!motionsRes.ok) return motionsRes;
    frozenMotionRows = motionsRes.data;
  }

  const voterEntries = voterRes.data.map(mapVoterSnapshotEntry);
  const frozenMotions = frozenMotionRows.map(mapFrozenMotion);

  try {
    assertBundleCorrelation({
      meetingId: meeting.id,
      propertyId: meeting.propertyId,
      freezeEvent,
      voterEntries,
      resolutionSnapshot,
      frozenMotions,
      readMode,
    });
  } catch (e) {
    return snapshotReadErr(
      'CORRELATION_MISMATCH',
      e instanceof SnapshotDomainReadError ? e.message : 'Bundle correlation check failed',
    );
  }

  return snapshotReadOk(
    assembleFrozenMeetingBundle({
      meeting,
      freezeEvent,
      voterEntries,
      resolutionSnapshot,
      frozenMotions,
      readMode,
    }),
  );
}

/**
 * Loads the dual-snapshot bundle for an owner-vote meeting.
 * Uses primary freeze event when present; otherwise legacy meeting-scoped voter rows.
 */
export async function loadFrozenMeetingBundleByOwnerVoteMeetingId(
  ownerVoteMeetingId: string,
  client: SupabaseClient = defaultClient,
): Promise<SnapshotDomainReadResult<FrozenMeetingBundle>> {
  const trimmed = ownerVoteMeetingId.trim();
  if (!trimmed) {
    return snapshotReadErr('MEETING_NOT_FOUND', 'Owner vote meeting id is required');
  }

  const meetingRes = await fetchMeeting(client, trimmed);
  if (!meetingRes.ok) return meetingRes;

  const freezeRes = await fetchPrimaryFreezeEventForMeeting(client, trimmed);
  if (!freezeRes.ok) return freezeRes;

  return buildBundleFromParts(client, meetingRes.data, freezeRes.data);
}

/**
 * Loads the dual-snapshot bundle by freeze event id (fail closed when event missing).
 */
export async function loadFrozenMeetingBundleByFreezeEventId(
  freezeEventId: string,
  client: SupabaseClient = defaultClient,
): Promise<SnapshotDomainReadResult<FrozenMeetingBundle>> {
  const trimmed = freezeEventId.trim();
  if (!trimmed) {
    return snapshotReadErr('FREEZE_EVENT_NOT_FOUND', 'Freeze event id is required');
  }

  const freezeRes = await fetchFreezeEventById(client, trimmed);
  if (!freezeRes.ok) return freezeRes;

  const meetingRes = await fetchMeeting(client, freezeRes.data.owner_vote_meeting_id);
  if (!meetingRes.ok) return meetingRes;

  return buildBundleFromParts(client, meetingRes.data, freezeRes.data);
}

/** Factory for injectable read-only repository (SELECT / map / validate only). */
export function createFrozenMeetingBundleRepository(
  options: CreateFrozenMeetingBundleRepositoryOptions = {},
): FrozenMeetingBundleRepository {
  const client = options.client ?? defaultClient;
  return {
    loadByOwnerVoteMeetingId: (ownerVoteMeetingId) =>
      loadFrozenMeetingBundleByOwnerVoteMeetingId(ownerVoteMeetingId, client),
    loadByFreezeEventId: (freezeEventId) => loadFrozenMeetingBundleByFreezeEventId(freezeEventId, client),
  };
}

/** Default singleton read repository for application use. */
export const frozenMeetingBundleRepository = createFrozenMeetingBundleRepository();
