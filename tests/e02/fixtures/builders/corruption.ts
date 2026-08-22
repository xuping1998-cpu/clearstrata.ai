/**
 * ABNORMAL_PRIVILEGED_FIXTURE builders — evaluator resilience only.
 * Does NOT claim RU-1.2 normally produces partial/corrupt states.
 */

import type { FrozenMeetingBundle } from '@/lib/ownerVote/snapshotDomain';

import { ABNORMAL_PRIVILEGED_FIXTURE } from '../catalog';
import {
  buildPrimaryAudit,
  buildResolution,
  buildValidFreezeSourceBundle,
  buildVoter,
} from './freezeSource';
import { buildSyntheticMeeting } from './meeting';

export type AbnormalFixtureMeta = {
  marker: typeof ABNORMAL_PRIVILEGED_FIXTURE;
  scenario: string;
  evidenceRunId: string;
};

function abnormalMeta(evidenceRunId: string, scenario: string): AbnormalFixtureMeta {
  return { marker: ABNORMAL_PRIVILEGED_FIXTURE, scenario, evidenceRunId };
}

/** partialAuditMissingScenario — EEP-AUDIT-MISS-001 */
export function buildPartialAuditMissingScenario(evidenceRunId: string): {
  meta: AbnormalFixtureMeta;
  bundle: FrozenMeetingBundle;
  audit: null;
} {
  const { bundle } = buildValidFreezeSourceBundle(evidenceRunId);
  return {
    meta: abnormalMeta(evidenceRunId, 'partialAuditMissingScenario'),
    bundle,
    audit: null,
  };
}

/** markerMissingScenario — EEP-MARKER-MISS-001 */
export function buildMarkerMissingScenario(evidenceRunId: string): {
  meta: AbnormalFixtureMeta;
  bundle: FrozenMeetingBundle;
  audit: ReturnType<typeof buildPrimaryAudit>;
} {
  const { bundle, audit } = buildValidFreezeSourceBundle(evidenceRunId);
  bundle.meeting = { ...bundle.meeting, snapshotFrozenAt: null };
  return {
    meta: abnormalMeta(evidenceRunId, 'markerMissingScenario'),
    bundle,
    audit,
  };
}

/** countMismatchScenario — voter/resolution/motion mismatches */
export function buildVoterCountMismatchScenario(evidenceRunId: string) {
  const { bundle, audit } = buildValidFreezeSourceBundle(evidenceRunId);
  audit.voterSnapshotCount = 2;
  return { meta: abnormalMeta(evidenceRunId, 'voterCountMismatch'), bundle, audit };
}

export function buildResolutionCountMismatchScenario(evidenceRunId: string) {
  const { bundle, audit } = buildValidFreezeSourceBundle(evidenceRunId);
  audit.resolutionSnapshotCount = 0;
  return { meta: abnormalMeta(evidenceRunId, 'resolutionCountMismatch'), bundle, audit };
}

export function buildMotionCountMismatchScenario(evidenceRunId: string) {
  const { bundle, audit } = buildValidFreezeSourceBundle(evidenceRunId);
  audit.frozenMotionCount = 99;
  return { meta: abnormalMeta(evidenceRunId, 'motionCountMismatch'), bundle, audit };
}

/** crossPropertyScenario — READ GUARD EEP-PROP-002 */
export function buildCrossPropertyScenario(evidenceRunId: string) {
  const propertyId = crypto.randomUUID();
  const wrongPropertyId = crypto.randomUUID();
  const meeting = buildSyntheticMeeting(evidenceRunId, propertyId, {
    snapshotFrozenAt: '2026-08-21T12:00:00.000Z',
  });
  const freezeEventId = crypto.randomUUID();
  const bundle: FrozenMeetingBundle = {
    meeting,
    freezeEvent: {
      id: freezeEventId,
      ownerVoteMeetingId: meeting.id,
      propertyId: wrongPropertyId,
      frozenAt: '2026-08-21T12:00:00.000Z',
      isPrimary: true,
      createdAt: '2026-08-21T12:00:00.000Z',
    },
    voterEntries: [buildVoter(meeting.id, propertyId, freezeEventId)],
    resolutionSnapshot: buildResolution(meeting.id, propertyId, freezeEventId),
    frozenMotions: [],
    readMode: 'event_linked',
  };
  const audit = buildPrimaryAudit(meeting.id, propertyId, freezeEventId);
  return { meta: abnormalMeta(evidenceRunId, 'crossPropertyScenario'), bundle, audit };
}

/** Artifact F invalid — status_mutated !== false */
export function buildArtifactFInvalidScenario(evidenceRunId: string) {
  const { bundle, audit } = buildValidFreezeSourceBundle(evidenceRunId);
  audit.meetingLifecycleCompatibility = { status_mutated: true, compatible: true };
  return { meta: abnormalMeta(evidenceRunId, 'artifactFInvalid'), bundle, audit };
}

/** Boundary mismatch — marker / event / audit misaligned */
export function buildBoundaryMismatchScenario(evidenceRunId: string) {
  const { bundle, audit } = buildValidFreezeSourceBundle(evidenceRunId);
  audit.freezeBoundaryAt = '2026-08-21T13:00:00.000Z';
  return { meta: abnormalMeta(evidenceRunId, 'boundaryMismatch'), bundle, audit };
}
