/**
 * Valid freeze-source and cardinality fixture builders (synthetic only).
 */

import type { FreezeEvent, FrozenMeetingBundle, FrozenMotion, ResolutionSnapshot, VoterSnapshotEntry } from '@/lib/ownerVote/snapshotDomain';
import type { PrimaryFreezeAuditRecord } from '@/lib/ownerVote/committedAuthority/types';

import { buildSyntheticMeeting } from './meeting';

const BOUNDARY = '2026-08-21T12:00:00.000Z';

export function buildFreezeEvent(
  meetingId: string,
  propertyId: string,
  overrides?: Partial<FreezeEvent>,
): FreezeEvent {
  return {
    id: overrides?.id ?? crypto.randomUUID(),
    ownerVoteMeetingId: meetingId,
    propertyId,
    frozenAt: overrides?.frozenAt ?? BOUNDARY,
    isPrimary: overrides?.isPrimary ?? true,
    createdAt: overrides?.createdAt ?? BOUNDARY,
    ...overrides,
  };
}

export function buildVoter(
  meetingId: string,
  propertyId: string,
  freezeEventId: string,
): VoterSnapshotEntry {
  return {
    id: crypto.randomUUID(),
    meetingId,
    propertyId,
    unitNo: '101',
    userId: crypto.randomUUID(),
    role: 'owner',
    isEligible: true,
    frozenAt: BOUNDARY,
    createdAt: BOUNDARY,
    freezeEventId,
  };
}

export function buildResolution(
  meetingId: string,
  propertyId: string,
  freezeEventId: string,
): ResolutionSnapshot {
  return {
    id: crypto.randomUUID(),
    freezeEventId,
    ownerVoteMeetingId: meetingId,
    propertyId,
    frozenAt: BOUNDARY,
    createdAt: BOUNDARY,
  };
}

export function buildMotion(
  meetingId: string,
  propertyId: string,
  freezeEventId: string,
  resolutionSnapshotId: string,
  displayOrder = 0,
): FrozenMotion {
  return {
    id: crypto.randomUUID(),
    resolutionSnapshotId,
    freezeEventId,
    ownerVoteMeetingId: meetingId,
    propertyId,
    displayOrder,
    title: 'Synthetic Motion',
    description: null,
    threshold: 'majority',
    voteMethod: null,
    sourceAgendaItemId: null,
    sourceResolutionId: null,
    sourceFormalResolutionVersion: null,
    frozenAt: BOUNDARY,
    createdAt: BOUNDARY,
  };
}

export function buildPrimaryAudit(
  meetingId: string,
  propertyId: string,
  freezeEventId: string,
  overrides?: Partial<PrimaryFreezeAuditRecord>,
): PrimaryFreezeAuditRecord {
  return {
    id: overrides?.id ?? crypto.randomUUID(),
    freezeEventId,
    ownerVoteMeetingId: meetingId,
    propertyId,
    attemptId: overrides?.attemptId ?? crypto.randomUUID(),
    freezeBoundaryAt: overrides?.freezeBoundaryAt ?? BOUNDARY,
    auditKind: 'PRIMARY_FREEZE_AUDIT',
    schemaVersion: 1,
    primaryEventIsPrimary: true,
    voterSnapshotCount: overrides?.voterSnapshotCount ?? 1,
    resolutionSnapshotCount: overrides?.resolutionSnapshotCount ?? 1,
    frozenMotionCount: overrides?.frozenMotionCount ?? 1,
    materializationSummary: {},
    commitSetResult: 'ATOMIC_SET_COMPLETE',
    markerEvidence: {},
    meetingLifecycleCompatibility: {
      status_mutated: false,
      compatible: true,
    },
    transactionOutcome: 'ATOMIC_ENVELOPE_MEMBER',
    commitEvidence: {},
    transactionReferenceAt: BOUNDARY,
    createdAt: BOUNDARY,
    ...overrides,
  };
}

/** validFreezeSourceMeeting — happy path / C9 source scaffold. */
export function buildValidFreezeSourceBundle(evidenceRunId: string): {
  bundle: FrozenMeetingBundle;
  audit: PrimaryFreezeAuditRecord;
} {
  const propertyId = crypto.randomUUID();
  const meeting = buildSyntheticMeeting(evidenceRunId, propertyId, {
    snapshotFrozenAt: BOUNDARY,
    status: 'scheduled',
  });
  const freezeEvent = buildFreezeEvent(meeting.id, propertyId);
  const voter = buildVoter(meeting.id, propertyId, freezeEvent.id);
  const resolution = buildResolution(meeting.id, propertyId, freezeEvent.id);
  const motion = buildMotion(meeting.id, propertyId, freezeEvent.id, resolution.id);

  const bundle: FrozenMeetingBundle = {
    meeting,
    freezeEvent,
    voterEntries: [voter],
    resolutionSnapshot: resolution,
    frozenMotions: [motion],
    readMode: 'event_linked',
  };

  const audit = buildPrimaryAudit(meeting.id, propertyId, freezeEvent.id, {
    voterSnapshotCount: 1,
    resolutionSnapshotCount: 1,
    frozenMotionCount: 1,
  });

  return { bundle, audit };
}

/** oneResolutionMeeting — EEP-C3-ONE-001 */
export function buildOneResolutionBundle(evidenceRunId: string) {
  return buildValidFreezeSourceBundle(evidenceRunId);
}

/** zeroMotionMeeting — EEP-C4-ZERO-001 (0 motions, >=1 voter/resolution). */
export function buildZeroMotionBundle(evidenceRunId: string) {
  const propertyId = crypto.randomUUID();
  const meeting = buildSyntheticMeeting(evidenceRunId, propertyId, { snapshotFrozenAt: BOUNDARY });
  const freezeEvent = buildFreezeEvent(meeting.id, propertyId);
  const voter = buildVoter(meeting.id, propertyId, freezeEvent.id);
  const resolution = buildResolution(meeting.id, propertyId, freezeEvent.id);
  const bundle: FrozenMeetingBundle = {
    meeting,
    freezeEvent,
    voterEntries: [voter],
    resolutionSnapshot: resolution,
    frozenMotions: [],
    readMode: 'event_linked',
  };
  const audit = buildPrimaryAudit(meeting.id, propertyId, freezeEvent.id, {
    voterSnapshotCount: 1,
    resolutionSnapshotCount: 1,
    frozenMotionCount: 0,
  });
  return { bundle, audit };
}

/** zeroResolutionMeeting — L2 evaluator zero-cardinality (RPC path blocked by RU-1.2 >=1 qualifying). */
export function buildZeroResolutionEvaluatorBundle(evidenceRunId: string) {
  const propertyId = crypto.randomUUID();
  const meeting = buildSyntheticMeeting(evidenceRunId, propertyId, { snapshotFrozenAt: BOUNDARY });
  const freezeEvent = buildFreezeEvent(meeting.id, propertyId);
  const voter = buildVoter(meeting.id, propertyId, freezeEvent.id);
  const bundle: FrozenMeetingBundle = {
    meeting,
    freezeEvent,
    voterEntries: [voter],
    resolutionSnapshot: null,
    frozenMotions: [],
    readMode: 'event_linked',
  };
  const audit = buildPrimaryAudit(meeting.id, propertyId, freezeEvent.id, {
    voterSnapshotCount: 1,
    resolutionSnapshotCount: 0,
    frozenMotionCount: 0,
  });
  return { bundle, audit };
}

/** multiMotionMeeting — EEP-C4-N-001 */
export function buildMultiMotionBundle(evidenceRunId: string, motionCount = 2) {
  const propertyId = crypto.randomUUID();
  const meeting = buildSyntheticMeeting(evidenceRunId, propertyId, { snapshotFrozenAt: BOUNDARY });
  const freezeEvent = buildFreezeEvent(meeting.id, propertyId);
  const voter = buildVoter(meeting.id, propertyId, freezeEvent.id);
  const resolution = buildResolution(meeting.id, propertyId, freezeEvent.id);
  const motions = Array.from({ length: motionCount }, (_, i) =>
    buildMotion(meeting.id, propertyId, freezeEvent.id, resolution.id, i),
  );
  const bundle: FrozenMeetingBundle = {
    meeting,
    freezeEvent,
    voterEntries: [voter],
    resolutionSnapshot: resolution,
    frozenMotions: motions,
    readMode: 'event_linked',
  };
  const audit = buildPrimaryAudit(meeting.id, propertyId, freezeEvent.id, {
    frozenMotionCount: motionCount,
  });
  return { bundle, audit };
}

/** nonPrimaryEventScenario — EEP-NON-PRIMARY-001 */
export function buildNonPrimaryEventBundle(evidenceRunId: string) {
  const { bundle, audit } = buildValidFreezeSourceBundle(evidenceRunId);
  if (!bundle.freezeEvent) {
    throw new Error('Expected freeze event');
  }
  bundle.freezeEvent = { ...bundle.freezeEvent, isPrimary: false };
  return { bundle, audit };
}

export { BOUNDARY as E02_SYNTHETIC_BOUNDARY };
