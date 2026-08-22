import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase as defaultClient } from '@/lib/supabaseClient';
import {
  createFrozenMeetingBundleRepository,
  type FrozenMeetingBundleRepository,
} from '@/lib/ownerVote/snapshotDomain';
import type { FrozenMeetingBundle } from '@/lib/ownerVote/snapshotDomain';

import {
  authorityErr,
  authorityOk,
  type CommittedFreezeAuthorityResult,
} from './errors';
import {
  createPrimaryFreezeAuditRepository,
  type PrimaryFreezeAuditRepository,
} from './primaryFreezeAuditRepository';
import type {
  CommittedFreezeAuthorityEvaluation,
  CommittedFreezeAuthorityNonCommittedEvaluation,
  CommittedFreezeAuthorityReason,
  PrimaryFreezeAuditRecord,
} from './types';

export type CommittedAuthorityEvaluatorDeps = {
  client?: SupabaseClient;
  bundleRepository?: FrozenMeetingBundleRepository;
  auditRepository?: PrimaryFreezeAuditRepository;
};

function nonCommitted(
  status: CommittedFreezeAuthorityNonCommittedEvaluation['status'],
  reason: CommittedFreezeAuthorityReason,
  ids?: { ownerVoteMeetingId?: string; freezeEventId?: string; propertyId?: string },
): CommittedFreezeAuthorityEvaluation {
  return {
    status,
    authority: false,
    reason,
    ...ids,
  };
}

/** Normalize ISO timestamps for safe instant equality (C5). */
function normalizeInstant(value: string | null | undefined): string | null {
  if (value == null || value === '') {
    return null;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return new Date(parsed).toISOString();
}

function instantsEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeInstant(a);
  const nb = normalizeInstant(b);
  return na !== null && nb !== null && na === nb;
}

function validateArtifactF(audit: PrimaryFreezeAuditRecord): boolean {
  const f = audit.meetingLifecycleCompatibility;
  return f.status_mutated === false && f.compatible === true;
}

function hasPartialEventLinkedFootprint(bundle: FrozenMeetingBundle): boolean {
  const { meeting, freezeEvent, readMode } = bundle;
  if (readMode !== 'event_linked' || !freezeEvent) {
    return false;
  }
  const hasMarker = meeting.snapshotFrozenAt != null;
  const hasVoters = bundle.voterEntries.length > 0;
  const hasResolution = bundle.resolutionSnapshot != null;
  const hasMotions = bundle.frozenMotions.length > 0;
  return hasMarker || hasVoters || hasResolution || hasMotions;
}

function verifyPropertyCorrelation(
  bundle: FrozenMeetingBundle,
  audit: PrimaryFreezeAuditRecord,
): CommittedFreezeAuthorityEvaluation | null {
  const { meeting, freezeEvent } = bundle;
  if (!freezeEvent) {
    return null;
  }

  const propertyId = meeting.propertyId;

  if (meeting.propertyId !== propertyId) {
    return nonCommitted('CORRELATION_MISMATCH', {
      code: 'PROPERTY_MISMATCH',
      message: 'Meeting property_id does not match authoritative property',
    }, { ownerVoteMeetingId: meeting.id, freezeEventId: freezeEvent.id, propertyId: meeting.propertyId });
  }

  if (freezeEvent.propertyId !== propertyId) {
    return nonCommitted('CORRELATION_MISMATCH', {
      code: 'PROPERTY_MISMATCH',
      message: 'Freeze event property_id does not match meeting property',
    }, { ownerVoteMeetingId: meeting.id, freezeEventId: freezeEvent.id, propertyId });
  }

  if (audit.propertyId !== propertyId) {
    return nonCommitted('CORRELATION_MISMATCH', {
      code: 'PROPERTY_MISMATCH',
      message: 'Primary Audit property_id does not match meeting property',
    }, { ownerVoteMeetingId: meeting.id, freezeEventId: freezeEvent.id, propertyId });
  }

  for (const voter of bundle.voterEntries) {
    if (voter.propertyId !== propertyId) {
      return nonCommitted('CORRELATION_MISMATCH', {
        code: 'PROPERTY_MISMATCH',
        message: 'Voter snapshot property_id mismatch',
      }, { ownerVoteMeetingId: meeting.id, freezeEventId: freezeEvent.id, propertyId });
    }
  }

  if (bundle.resolutionSnapshot && bundle.resolutionSnapshot.propertyId !== propertyId) {
    return nonCommitted('CORRELATION_MISMATCH', {
      code: 'PROPERTY_MISMATCH',
      message: 'Resolution snapshot property_id mismatch',
    }, { ownerVoteMeetingId: meeting.id, freezeEventId: freezeEvent.id, propertyId });
  }

  for (const motion of bundle.frozenMotions) {
    if (motion.propertyId !== propertyId) {
      return nonCommitted('CORRELATION_MISMATCH', {
        code: 'PROPERTY_MISMATCH',
        message: 'Frozen motion property_id mismatch',
      }, { ownerVoteMeetingId: meeting.id, freezeEventId: freezeEvent.id, propertyId });
    }
  }

  return null;
}

/**
 * C1–C9 composite durable authority evaluation from fresh bundle + audit reads.
 * C9 = durable visibility of complete C1–C8 from independent post-transaction reads.
 */
function evaluateC1ThroughC9(
  bundle: FrozenMeetingBundle,
  audit: PrimaryFreezeAuditRecord,
): CommittedFreezeAuthorityEvaluation {
  const { meeting, freezeEvent } = bundle;
  const ids = {
    ownerVoteMeetingId: meeting.id,
    freezeEventId: freezeEvent?.id,
    propertyId: meeting.propertyId,
  };

  // C1 — authoritative primary event
  if (bundle.readMode !== 'event_linked' || !freezeEvent) {
    return nonCommitted('LEGACY_NOT_AUTHORITATIVE', {
      code: 'LEGACY_MEETING',
      message: 'No event-linked authoritative primary freeze event',
    }, ids);
  }

  if (!freezeEvent.isPrimary) {
    return nonCommitted('NON_PRIMARY_EVENT', {
      code: 'EVENT_NOT_PRIMARY',
      message: 'Freeze event is not the authoritative primary event',
    }, ids);
  }

  if (freezeEvent.ownerVoteMeetingId !== meeting.id) {
    return nonCommitted('CORRELATION_MISMATCH', {
      code: 'MEETING_EVENT_MISMATCH',
      message: 'Primary freeze event owner_vote_meeting_id does not match meeting',
    }, ids);
  }

  if (freezeEvent.propertyId !== meeting.propertyId) {
    return nonCommitted('CORRELATION_MISMATCH', {
      code: 'PROPERTY_MISMATCH',
      message: 'Primary freeze event property_id does not match meeting',
    }, ids);
  }

  // C6 partial — audit contract (before full C6, catch missing audit with footprint)
  if (
    audit.freezeEventId !== freezeEvent.id ||
    audit.ownerVoteMeetingId !== meeting.id ||
    audit.propertyId !== meeting.propertyId
  ) {
    return nonCommitted('CORRELATION_MISMATCH', {
      code: 'AUDIT_CORRELATION_MISMATCH',
      message: 'Primary Audit identity columns do not correlate with bundle',
    }, ids);
  }

  const propertyCheck = verifyPropertyCorrelation(bundle, audit);
  if (propertyCheck) {
    return propertyCheck;
  }

  // C2 — voter snapshot
  if (bundle.voterEntries.length !== audit.voterSnapshotCount) {
    return nonCommitted('FAIL_CLOSED', {
      code: 'VOTER_COUNT_MISMATCH',
      message: `Voter count ${bundle.voterEntries.length} does not match audit count ${audit.voterSnapshotCount}`,
    }, ids);
  }

  if (audit.voterSnapshotCount >= 1 && bundle.voterEntries.length < 1) {
    return nonCommitted('FAIL_CLOSED', {
      code: 'VOTER_COUNT_MISMATCH',
      message: 'E-02 materialized path requires at least one voter snapshot',
    }, ids);
  }

  for (const voter of bundle.voterEntries) {
    if (voter.freezeEventId !== freezeEvent.id) {
      return nonCommitted('CORRELATION_MISMATCH', {
        code: 'VOTER_CORRELATION_MISMATCH',
        message: 'Voter snapshot freeze_event_id mismatch',
      }, ids);
    }
    if (voter.meetingId !== meeting.id) {
      return nonCommitted('CORRELATION_MISMATCH', {
        code: 'VOTER_CORRELATION_MISMATCH',
        message: 'Voter snapshot meeting_id mismatch',
      }, ids);
    }
    if (voter.propertyId !== meeting.propertyId) {
      return nonCommitted('CORRELATION_MISMATCH', {
        code: 'PROPERTY_MISMATCH',
        message: 'Voter snapshot property_id mismatch',
      }, ids);
    }
  }

  // C3 — resolution snapshot (zero-cardinality)
  if (audit.resolutionSnapshotCount === 0) {
    if (bundle.resolutionSnapshot !== null) {
      return nonCommitted('FAIL_CLOSED', {
        code: 'RESOLUTION_COUNT_MISMATCH',
        message: 'Resolution snapshot present when audit count is 0',
      }, ids);
    }
  } else if (audit.resolutionSnapshotCount === 1) {
    if (!bundle.resolutionSnapshot) {
      return nonCommitted('FAIL_CLOSED', {
        code: 'RESOLUTION_COUNT_MISMATCH',
        message: 'Resolution snapshot missing when audit count is 1',
      }, ids);
    }
    const rs = bundle.resolutionSnapshot;
    if (
      rs.freezeEventId !== freezeEvent.id ||
      rs.ownerVoteMeetingId !== meeting.id ||
      rs.propertyId !== meeting.propertyId
    ) {
      return nonCommitted('CORRELATION_MISMATCH', {
        code: 'RESOLUTION_CORRELATION_MISMATCH',
        message: 'Resolution snapshot correlation mismatch',
      }, ids);
    }
  } else {
    return nonCommitted('FAIL_CLOSED', {
      code: 'CARDINALITY_VIOLATION',
      message: `Invalid resolution_snapshot_count: ${audit.resolutionSnapshotCount}`,
    }, ids);
  }

  // C4 — frozen motions (zero-cardinality)
  if (bundle.frozenMotions.length !== audit.frozenMotionCount) {
    return nonCommitted('FAIL_CLOSED', {
      code: 'MOTION_COUNT_MISMATCH',
      message: `Frozen motion count ${bundle.frozenMotions.length} does not match audit count ${audit.frozenMotionCount}`,
    }, ids);
  }

  for (const motion of bundle.frozenMotions) {
    if (
      motion.freezeEventId !== freezeEvent.id ||
      motion.ownerVoteMeetingId !== meeting.id ||
      motion.propertyId !== meeting.propertyId
    ) {
      return nonCommitted('CORRELATION_MISMATCH', {
        code: 'MOTION_CORRELATION_MISMATCH',
        message: 'Frozen motion correlation mismatch',
      }, ids);
    }
  }

  // C5 — marker
  if (meeting.snapshotFrozenAt == null) {
    return nonCommitted('FAIL_CLOSED', {
      code: 'MARKER_MISSING',
      message: 'Meeting snapshot_frozen_at marker is absent with event-linked footprint',
    }, ids);
  }

  if (
    !instantsEqual(meeting.snapshotFrozenAt, freezeEvent.frozenAt) ||
    !instantsEqual(meeting.snapshotFrozenAt, audit.freezeBoundaryAt) ||
    !instantsEqual(freezeEvent.frozenAt, audit.freezeBoundaryAt)
  ) {
    return nonCommitted('CORRELATION_MISMATCH', {
      code: 'BOUNDARY_MISMATCH',
      message: 'Marker, event frozen_at, and audit freeze_boundary_at are not aligned',
    }, ids);
  }

  // C6 — Primary Audit contract + Artifact F
  if (
    audit.auditKind !== 'PRIMARY_FREEZE_AUDIT' ||
    audit.schemaVersion < 1 ||
    !audit.primaryEventIsPrimary ||
    audit.commitSetResult !== 'ATOMIC_SET_COMPLETE' ||
    audit.transactionOutcome !== 'ATOMIC_ENVELOPE_MEMBER'
  ) {
    return nonCommitted('FAIL_CLOSED', {
      code: 'AUDIT_CONTRACT_INVALID',
      message: 'Primary Audit contract fields are invalid',
    }, ids);
  }

  if (!validateArtifactF(audit)) {
    return nonCommitted('FAIL_CLOSED', {
      code: 'ARTIFACT_F_INVALID',
      message: 'Artifact F evidence requires status_mutated=false and compatible=true',
    }, ids);
  }

  // C7 — correlation (column-level; commit_evidence / materialization_summary not sole proof)
  // Covered by C1–C6 independent checks above.

  // C8 — exactly-one cardinality
  if (audit.voterSnapshotCount !== bundle.voterEntries.length) {
    return nonCommitted('FAIL_CLOSED', {
      code: 'CARDINALITY_VIOLATION',
      message: 'Voter cardinality mismatch',
    }, ids);
  }

  // C9 — durable COMMIT visibility: complete C1–C8 from fresh independent reads ⇒ COMMITTED
  return {
    status: 'COMMITTED',
    authority: true,
    ownerVoteMeetingId: meeting.id,
    freezeEventId: freezeEvent.id,
    primaryAuditId: audit.id,
    attemptId: audit.attemptId,
    freezeBoundaryAt: audit.freezeBoundaryAt,
    propertyId: meeting.propertyId,
  };
}

function classifyMissingAudit(
  bundle: FrozenMeetingBundle,
): CommittedFreezeAuthorityEvaluation {
  const { meeting, freezeEvent } = bundle;
  const ids = {
    ownerVoteMeetingId: meeting.id,
    freezeEventId: freezeEvent?.id,
    propertyId: meeting.propertyId,
  };

  if (bundle.readMode === 'legacy_meeting') {
    return nonCommitted('LEGACY_NOT_AUTHORITATIVE', {
      code: 'LEGACY_MEETING',
      message: 'Legacy meeting-scoped snapshot is not E-02 authoritative',
    }, ids);
  }

  if (!freezeEvent) {
    return nonCommitted('NO_FREEZE', {
      code: 'NO_AUTHORITATIVE_FREEZE',
      message: 'No authoritative E-02 freeze footprint',
    }, ids);
  }

  if (hasPartialEventLinkedFootprint(bundle)) {
    return nonCommitted('FAIL_CLOSED', {
      code: 'PARTIAL_DURABLE_STATE',
      message: 'Event-linked durable footprint present without Primary Audit',
    }, ids);
  }

  return nonCommitted('NO_FREEZE', {
    code: 'NO_AUTHORITATIVE_FREEZE',
    message: 'No authoritative E-02 freeze footprint',
  }, ids);
}

async function evaluateWithBundleAndAudit(
  bundle: FrozenMeetingBundle,
  auditRepository: PrimaryFreezeAuditRepository,
): Promise<CommittedFreezeAuthorityResult<CommittedFreezeAuthorityEvaluation>> {
  const { meeting, freezeEvent } = bundle;

  if (bundle.readMode === 'legacy_meeting') {
    return authorityOk(
      nonCommitted('LEGACY_NOT_AUTHORITATIVE', {
        code: 'LEGACY_MEETING',
        message: 'Legacy meeting-scoped snapshot is not E-02 authoritative',
      }, { ownerVoteMeetingId: meeting.id, propertyId: meeting.propertyId }),
    );
  }

  if (!freezeEvent) {
    return authorityOk(
      nonCommitted('NO_FREEZE', {
        code: 'NO_AUTHORITATIVE_FREEZE',
        message: 'No primary freeze event for meeting',
      }, { ownerVoteMeetingId: meeting.id, propertyId: meeting.propertyId }),
    );
  }

  const auditRes = await auditRepository.loadByFreezeEventId(freezeEvent.id);
  if (!auditRes.ok) {
    return auditRes;
  }

  if (!auditRes.data) {
    return authorityOk(classifyMissingAudit(bundle));
  }

  return authorityOk(evaluateC1ThroughC9(bundle, auditRes.data));
}

function createEvaluator(deps: CommittedAuthorityEvaluatorDeps = {}) {
  const client = deps.client ?? defaultClient;
  const bundleRepository = deps.bundleRepository ?? createFrozenMeetingBundleRepository({ client });
  const auditRepository = deps.auditRepository ?? createPrimaryFreezeAuditRepository({ client });

  return {
    evaluateByOwnerVoteMeetingId: (ownerVoteMeetingId: string) =>
      evaluateCommittedFreezeByOwnerVoteMeetingId(ownerVoteMeetingId, { bundleRepository, auditRepository }),
    evaluateByFreezeEventId: (freezeEventId: string) =>
      evaluateCommittedFreezeByFreezeEventId(freezeEventId, { bundleRepository, auditRepository }),
  };
}

export type CommittedAuthorityEvaluator = ReturnType<typeof createEvaluator>;

/**
 * Meeting entry — load authoritative primary bundle, then C1–C9 from fresh reads.
 */
export async function evaluateCommittedFreezeByOwnerVoteMeetingId(
  ownerVoteMeetingId: string,
  deps?: Pick<CommittedAuthorityEvaluatorDeps, 'bundleRepository' | 'auditRepository'>,
): Promise<CommittedFreezeAuthorityResult<CommittedFreezeAuthorityEvaluation>> {
  const bundleRepository =
    deps?.bundleRepository ?? createFrozenMeetingBundleRepository();
  const auditRepository =
    deps?.auditRepository ?? createPrimaryFreezeAuditRepository();

  const bundleRes = await bundleRepository.loadByOwnerVoteMeetingId(ownerVoteMeetingId);
  if (!bundleRes.ok) {
    const code =
      bundleRes.error.code === 'MEETING_NOT_FOUND'
        ? 'MEETING_NOT_FOUND'
        : bundleRes.error.code === 'FREEZE_EVENT_NOT_FOUND'
          ? 'FREEZE_EVENT_NOT_FOUND'
          : bundleRes.error.code === 'CORRELATION_MISMATCH'
            ? 'CORRELATION_MISMATCH'
            : bundleRes.error.code === 'INVALID_ROW'
              ? 'INVALID_ROW'
              : 'DATABASE_ERROR';
    return authorityErr(code, bundleRes.error.message, bundleRes.error.causeDetail);
  }

  return evaluateWithBundleAndAudit(bundleRes.data, auditRepository);
}

/**
 * Explicit event entry — prove event is meeting authoritative primary, then C1–C9.
 */
export async function evaluateCommittedFreezeByFreezeEventId(
  freezeEventId: string,
  deps?: Pick<CommittedAuthorityEvaluatorDeps, 'bundleRepository' | 'auditRepository'>,
): Promise<CommittedFreezeAuthorityResult<CommittedFreezeAuthorityEvaluation>> {
  const bundleRepository =
    deps?.bundleRepository ?? createFrozenMeetingBundleRepository();
  const auditRepository =
    deps?.auditRepository ?? createPrimaryFreezeAuditRepository();

  const explicitRes = await bundleRepository.loadByFreezeEventId(freezeEventId);
  if (!explicitRes.ok) {
    const code =
      explicitRes.error.code === 'FREEZE_EVENT_NOT_FOUND'
        ? 'FREEZE_EVENT_NOT_FOUND'
        : explicitRes.error.code === 'MEETING_NOT_FOUND'
          ? 'MEETING_NOT_FOUND'
          : explicitRes.error.code === 'CORRELATION_MISMATCH'
            ? 'CORRELATION_MISMATCH'
            : explicitRes.error.code === 'INVALID_ROW'
              ? 'INVALID_ROW'
              : 'DATABASE_ERROR';
    return authorityErr(code, explicitRes.error.message, explicitRes.error.causeDetail);
  }

  const explicitBundle = explicitRes.data;
  const meetingId = explicitBundle.meeting.id;

  const primaryRes = await bundleRepository.loadByOwnerVoteMeetingId(meetingId);
  if (!primaryRes.ok) {
    const code =
      primaryRes.error.code === 'MEETING_NOT_FOUND'
        ? 'MEETING_NOT_FOUND'
        : primaryRes.error.code === 'CORRELATION_MISMATCH'
          ? 'CORRELATION_MISMATCH'
          : primaryRes.error.code === 'INVALID_ROW'
            ? 'INVALID_ROW'
            : 'DATABASE_ERROR';
    return authorityErr(code, primaryRes.error.message, primaryRes.error.causeDetail);
  }

  const authoritativeBundle = primaryRes.data;
  const authoritativeEventId = authoritativeBundle.freezeEvent?.id;

  if (authoritativeBundle.readMode === 'legacy_meeting' || !authoritativeEventId) {
    return authorityOk(
      nonCommitted('LEGACY_NOT_AUTHORITATIVE', {
        code: 'LEGACY_MEETING',
        message: 'Meeting has no event-linked authoritative primary freeze event',
      }, {
        ownerVoteMeetingId: meetingId,
        freezeEventId: explicitBundle.freezeEvent?.id,
        propertyId: explicitBundle.meeting.propertyId,
      }),
    );
  }

  if (authoritativeEventId !== freezeEventId.trim()) {
    return authorityOk(
      nonCommitted('NON_PRIMARY_EVENT', {
        code: 'EVENT_NOT_PRIMARY',
        message: 'Requested freeze event is not the authoritative primary for its meeting',
      }, {
        ownerVoteMeetingId: meetingId,
        freezeEventId: freezeEventId.trim(),
        propertyId: explicitBundle.meeting.propertyId,
      }),
    );
  }

  return evaluateWithBundleAndAudit(authoritativeBundle, auditRepository);
}

export { createEvaluator as createCommittedAuthorityEvaluator };
