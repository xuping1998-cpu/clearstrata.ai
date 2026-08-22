/**
 * Synthetic meeting builder — clean / legacy scenarios.
 */

import type { OwnerVoteMeetingSnapshot } from '@/lib/ownerVote/snapshotDomain';

export function buildSyntheticMeeting(
  evidenceRunId: string,
  propertyId: string,
  overrides?: Partial<OwnerVoteMeetingSnapshot>,
): OwnerVoteMeetingSnapshot {
  const id = overrides?.id ?? crypto.randomUUID();
  return {
    id,
    propertyId,
    status: overrides?.status ?? 'scheduled',
    votingOpensAt: overrides?.votingOpensAt ?? null,
    votingClosesAt: overrides?.votingClosesAt ?? null,
    snapshotFreezeAt: overrides?.snapshotFreezeAt ?? null,
    snapshotFrozenAt: overrides?.snapshotFrozenAt ?? null,
    scheduledAt: overrides?.scheduledAt ?? new Date().toISOString(),
    meetingType: overrides?.meetingType ?? 'agm',
    createdAt: overrides?.createdAt ?? new Date().toISOString(),
    ...overrides,
  };
}

/** cleanMeeting — NO_FREEZE eligible (EEP-NO-FREEZE-001). */
export function buildCleanMeeting(evidenceRunId: string, propertyId: string): OwnerVoteMeetingSnapshot {
  return buildSyntheticMeeting(evidenceRunId, propertyId, {
    snapshotFrozenAt: null,
    status: 'scheduled',
  });
}

/** legacyMeeting — legacy read mode scenario (EEP-LEGACY-001). */
export function buildLegacyMeetingSnapshot(evidenceRunId: string, propertyId: string): OwnerVoteMeetingSnapshot {
  return buildSyntheticMeeting(evidenceRunId, propertyId, {
    snapshotFrozenAt: '2020-01-01T00:00:00.000Z',
    status: 'completed',
  });
}
