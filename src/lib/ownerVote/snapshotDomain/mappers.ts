import type {
  FreezeEventDbRow,
  FrozenMotionDbRow,
  OwnerVoteMeetingDbRow,
  ResolutionSnapshotDbRow,
  VoterSnapshotDbRow,
} from './dbRows';
import type {
  FreezeEvent,
  FrozenMeetingBundle,
  FrozenMotion,
  OwnerVoteMeetingSnapshot,
  ResolutionSnapshot,
  SnapshotReadMode,
  VoterSnapshotEntry,
} from './types';

export function mapOwnerVoteMeeting(row: OwnerVoteMeetingDbRow): OwnerVoteMeetingSnapshot {
  return {
    id: row.id,
    propertyId: row.property_id,
    status: row.status,
    votingOpensAt: row.voting_opens_at,
    votingClosesAt: row.voting_closes_at,
    snapshotFreezeAt: row.snapshot_freeze_at,
    snapshotFrozenAt: row.snapshot_frozen_at,
    scheduledAt: row.scheduled_at,
    meetingType: row.meeting_type,
    createdAt: row.created_at,
  };
}

export function mapFreezeEvent(row: FreezeEventDbRow): FreezeEvent {
  return {
    id: row.id,
    ownerVoteMeetingId: row.owner_vote_meeting_id,
    propertyId: row.property_id,
    frozenAt: row.frozen_at,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
  };
}

export function mapVoterSnapshotEntry(row: VoterSnapshotDbRow): VoterSnapshotEntry {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    propertyId: row.property_id,
    unitNo: row.unit_no,
    userId: row.user_id,
    role: row.role,
    isEligible: row.is_eligible,
    frozenAt: row.frozen_at,
    createdAt: row.created_at,
    freezeEventId: row.freeze_event_id,
  };
}

export function mapResolutionSnapshot(row: ResolutionSnapshotDbRow): ResolutionSnapshot {
  return {
    id: row.id,
    freezeEventId: row.freeze_event_id,
    ownerVoteMeetingId: row.owner_vote_meeting_id,
    propertyId: row.property_id,
    frozenAt: row.frozen_at,
    createdAt: row.created_at,
  };
}

export function mapFrozenMotion(row: FrozenMotionDbRow): FrozenMotion {
  return {
    id: row.id,
    resolutionSnapshotId: row.resolution_snapshot_id,
    freezeEventId: row.freeze_event_id,
    ownerVoteMeetingId: row.owner_vote_meeting_id,
    propertyId: row.property_id,
    displayOrder: row.display_order,
    title: row.title,
    description: row.description,
    threshold: row.threshold,
    voteMethod: row.vote_method,
    sourceAgendaItemId: row.source_agenda_item_id,
    sourceResolutionId: row.source_resolution_id,
    sourceFormalResolutionVersion: row.source_formal_resolution_version,
    frozenAt: row.frozen_at,
    createdAt: row.created_at,
  };
}

export function assembleFrozenMeetingBundle(params: {
  meeting: OwnerVoteMeetingSnapshot;
  freezeEvent: FreezeEvent | null;
  voterEntries: VoterSnapshotEntry[];
  resolutionSnapshot: ResolutionSnapshot | null;
  frozenMotions: FrozenMotion[];
  readMode: SnapshotReadMode;
}): FrozenMeetingBundle {
  const sortedMotions = [...params.frozenMotions].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.createdAt.localeCompare(b.createdAt),
  );
  const sortedVoters = [...params.voterEntries].sort(
    (a, b) => a.unitNo.localeCompare(b.unitNo) || a.userId.localeCompare(b.userId),
  );

  return {
    meeting: params.meeting,
    freezeEvent: params.freezeEvent,
    voterEntries: sortedVoters,
    resolutionSnapshot: params.resolutionSnapshot,
    frozenMotions: sortedMotions,
    readMode: params.readMode,
  };
}
