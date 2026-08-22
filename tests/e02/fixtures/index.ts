/**
 * E-02 RU-1.4 fixture registry and mock repository factories for L2 unit tests.
 */

export {
  ABNORMAL_PRIVILEGED_FIXTURE,
  CITM_EEP_MAPPING,
  E02_RUNTIME_EXECUTION_AUTHORIZED,
  EEP_TEST_IDS,
  EVIDENCE_LEVEL,
  FIXTURE_CLASS_IDS,
  TG_REGISTER,
} from './catalog';
export type { FixtureClassId, TestabilityGapDefinition, TestabilityGapId } from './catalog';

export { buildSyntheticProperty } from './builders/property';
export { buildTestIdentities } from './builders/identities';
export { buildCleanMeeting, buildLegacyMeetingSnapshot, buildSyntheticMeeting } from './builders/meeting';
export {
  buildMultiMotionBundle,
  buildNonPrimaryEventBundle,
  buildOneResolutionBundle,
  buildValidFreezeSourceBundle,
  buildZeroMotionBundle,
  buildZeroResolutionEvaluatorBundle,
} from './builders/freezeSource';
export {
  buildArtifactFInvalidScenario,
  buildBoundaryMismatchScenario,
  buildCrossPropertyScenario,
  buildMarkerMissingScenario,
  buildMotionCountMismatchScenario,
  buildPartialAuditMissingScenario,
  buildResolutionCountMismatchScenario,
  buildVoterCountMismatchScenario,
} from './builders/corruption';

import type { FrozenMeetingBundleRepository } from '@/lib/ownerVote/snapshotDomain';
import type { PrimaryFreezeAuditRepository } from '@/lib/ownerVote/committedAuthority/primaryFreezeAuditRepository';
import type { FrozenMeetingBundle } from '@/lib/ownerVote/snapshotDomain';
import type { PrimaryFreezeAuditRecord } from '@/lib/ownerVote/committedAuthority/types';
import { authorityOk } from '@/lib/ownerVote/committedAuthority/errors';
import { SnapshotDomainReadError, snapshotReadOk } from '@/lib/ownerVote/snapshotDomain/errors';

export function createMockBundleRepository(
  bundle: FrozenMeetingBundle,
): FrozenMeetingBundleRepository {
  return {
    loadByOwnerVoteMeetingId: async (meetingId: string) => {
      if (meetingId !== bundle.meeting.id) {
        return {
          ok: false,
          error: new SnapshotDomainReadError('MEETING_NOT_FOUND', 'Meeting not found'),
        };
      }
      return snapshotReadOk(bundle);
    },
    loadByFreezeEventId: async (freezeEventId: string) => {
      const eventId = bundle.freezeEvent?.id;
      if (!eventId || freezeEventId !== eventId) {
        return {
          ok: false,
          error: new SnapshotDomainReadError('FREEZE_EVENT_NOT_FOUND', 'Event not found'),
        };
      }
      return snapshotReadOk(bundle);
    },
  };
}

export function createMockAuditRepository(
  audit: PrimaryFreezeAuditRecord | null,
): PrimaryFreezeAuditRepository {
  return {
    loadByFreezeEventId: async (freezeEventId: string) => authorityOk(audit),
  };
}

export function createLegacyBundle(evidenceRunId: string, propertyId: string): FrozenMeetingBundle {
  const meetingId = crypto.randomUUID();
  return {
    meeting: {
      id: meetingId,
      propertyId,
      status: 'completed',
      votingOpensAt: null,
      votingClosesAt: null,
      snapshotFreezeAt: null,
      snapshotFrozenAt: '2020-01-01T00:00:00.000Z',
      scheduledAt: '2020-01-01T00:00:00.000Z',
      meetingType: 'agm',
      createdAt: '2020-01-01T00:00:00.000Z',
    },
    freezeEvent: null,
    voterEntries: [],
    resolutionSnapshot: null,
    frozenMotions: [],
    readMode: 'legacy_meeting',
  };
}

export function createNoFreezeBundle(evidenceRunId: string, propertyId: string): FrozenMeetingBundle {
  const meetingId = crypto.randomUUID();
  return {
    meeting: {
      id: meetingId,
      propertyId,
      status: 'scheduled',
      votingOpensAt: null,
      votingClosesAt: null,
      snapshotFreezeAt: null,
      snapshotFrozenAt: null,
      scheduledAt: new Date().toISOString(),
      meetingType: 'agm',
      createdAt: new Date().toISOString(),
    },
    freezeEvent: null,
    voterEntries: [],
    resolutionSnapshot: null,
    frozenMotions: [],
    readMode: 'event_linked',
  };
}

/** Default evidence run id for unit tests — synthetic only. */
export const UNIT_TEST_EVIDENCE_RUN_ID = '00000000-0000-4000-8000-e02unit0001';
