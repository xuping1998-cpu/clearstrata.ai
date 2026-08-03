/**
 * E-01 Phase 4 / IU-4.1 — Blueprint §9 domain types for dual-snapshot read layer.
 * Read-only; aligned with deployed schema (20261728120000 head).
 */

/** How voter rows were resolved for this bundle. */
export type SnapshotReadMode = 'legacy_meeting' | 'event_linked';

/** Owner-vote session (`owner_vote_meetings`). */
export interface OwnerVoteMeetingSnapshot {
  id: string;
  propertyId: string;
  status: string;
  votingOpensAt: string | null;
  votingClosesAt: string | null;
  snapshotFreezeAt: string | null;
  snapshotFrozenAt: string | null;
  scheduledAt: string | null;
  meetingType: string | null;
  createdAt: string;
}

/** Freeze Event anchor (`owner_vote_freeze_events`). */
export interface FreezeEvent {
  id: string;
  ownerVoteMeetingId: string;
  propertyId: string;
  frozenAt: string;
  isPrimary: boolean;
  createdAt: string;
}

/** Voter Snapshot entry (`owner_vote_voter_snapshot`). */
export interface VoterSnapshotEntry {
  id: string;
  meetingId: string;
  propertyId: string;
  unitNo: string;
  userId: string;
  role: string;
  isEligible: boolean;
  frozenAt: string;
  createdAt: string;
  freezeEventId: string | null;
}

/** Resolution Snapshot instrument header (`owner_vote_resolution_snapshot`). */
export interface ResolutionSnapshot {
  id: string;
  freezeEventId: string;
  ownerVoteMeetingId: string;
  propertyId: string;
  frozenAt: string;
  createdAt: string;
}

/** Frozen formal motion row (`owner_vote_frozen_motions`). */
export interface FrozenMotion {
  id: string;
  resolutionSnapshotId: string;
  freezeEventId: string;
  ownerVoteMeetingId: string;
  propertyId: string;
  displayOrder: number;
  title: string;
  description: string | null;
  threshold: string;
  voteMethod: string | null;
  sourceAgendaItemId: string | null;
  sourceResolutionId: string | null;
  sourceFormalResolutionVersion: number | null;
  frozenAt: string;
  createdAt: string;
}

/**
 * Strongly typed aggregate — single engineering entry point for frozen meeting state reads.
 * Resolution snapshot and frozen motions may be null/empty until E-02 population.
 */
export interface FrozenMeetingBundle {
  meeting: OwnerVoteMeetingSnapshot;
  freezeEvent: FreezeEvent | null;
  voterEntries: VoterSnapshotEntry[];
  resolutionSnapshot: ResolutionSnapshot | null;
  frozenMotions: FrozenMotion[];
  readMode: SnapshotReadMode;
}
