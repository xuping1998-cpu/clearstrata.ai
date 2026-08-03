/**
 * E-01 Phase 4 / IU-4.1 — Typed dual-snapshot read layer.
 * Read-only: SELECT, map, validate, return. No writes, freeze, or voting.
 */

export type {
  SnapshotDomainReadErrorCode,
  SnapshotDomainReadResult,
} from './errors';
export {
  SnapshotDomainReadError,
  snapshotReadErr,
  snapshotReadFromPostgrestError,
  snapshotReadOk,
} from './errors';

export type {
  FreezeEvent,
  FrozenMeetingBundle,
  FrozenMotion,
  OwnerVoteMeetingSnapshot,
  ResolutionSnapshot,
  SnapshotReadMode,
  VoterSnapshotEntry,
} from './types';

export type { FrozenMeetingBundleRepository } from './frozenMeetingBundleRepository';
export {
  createFrozenMeetingBundleRepository,
  frozenMeetingBundleRepository,
  loadFrozenMeetingBundleByFreezeEventId,
  loadFrozenMeetingBundleByOwnerVoteMeetingId,
} from './frozenMeetingBundleRepository';

export {
  assembleFrozenMeetingBundle,
  mapFreezeEvent,
  mapFrozenMotion,
  mapOwnerVoteMeeting,
  mapResolutionSnapshot,
  mapVoterSnapshotEntry,
} from './mappers';

export {
  assertBundleCorrelation,
  validateFreezeEventRow,
  validateFrozenMotionRow,
  validateOwnerVoteMeetingRow,
  validateResolutionSnapshotRow,
  validateVoterSnapshotRow,
} from './validators';
