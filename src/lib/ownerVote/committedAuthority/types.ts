/**
 * E-02 RU-1.3 — COMMITTED authority domain types.
 * READ → VERIFY → CLASSIFY only. No writes, no committed_at, no status mutation.
 */

/** Artifact F evidence persisted in meeting_lifecycle_compatibility (RU-1.2 SQL). */
export type MeetingLifecycleCompatibilityEvidence = {
  status_mutated?: boolean;
  compatible?: boolean;
  checks_performed?: unknown;
  lifecycle_observations?: Record<string, unknown>;
};

/** Primary Freeze Audit row — all 20 RU-1.1 columns (camelCase domain view). */
export interface PrimaryFreezeAuditRecord {
  id: string;
  freezeEventId: string;
  ownerVoteMeetingId: string;
  propertyId: string;
  attemptId: string;
  freezeBoundaryAt: string;
  auditKind: 'PRIMARY_FREEZE_AUDIT';
  schemaVersion: number;
  primaryEventIsPrimary: boolean;
  voterSnapshotCount: number;
  resolutionSnapshotCount: number;
  frozenMotionCount: number;
  materializationSummary: Record<string, unknown>;
  commitSetResult: 'ATOMIC_SET_COMPLETE';
  markerEvidence: Record<string, unknown>;
  meetingLifecycleCompatibility: MeetingLifecycleCompatibilityEvidence;
  transactionOutcome: 'ATOMIC_ENVELOPE_MEMBER';
  commitEvidence: Record<string, unknown>;
  transactionReferenceAt: string;
  createdAt: string;
}

/** Locked six-status authority taxonomy (RU-1.3 IR §8.1). */
export type CommittedFreezeAuthorityStatus =
  | 'COMMITTED'
  | 'NO_FREEZE'
  | 'FAIL_CLOSED'
  | 'CORRELATION_MISMATCH'
  | 'LEGACY_NOT_AUTHORITATIVE'
  | 'NON_PRIMARY_EVENT';

/** Domain-level reason codes for non-authoritative / fail-closed classifications. */
export type CommittedFreezeAuthorityReasonCode =
  | 'PRIMARY_AUDIT_MISSING'
  | 'PRIMARY_AUDIT_DUPLICATE'
  | 'EVENT_NOT_PRIMARY'
  | 'MEETING_EVENT_MISMATCH'
  | 'PROPERTY_MISMATCH'
  | 'BOUNDARY_MISMATCH'
  | 'VOTER_COUNT_MISMATCH'
  | 'RESOLUTION_COUNT_MISMATCH'
  | 'MOTION_COUNT_MISMATCH'
  | 'MARKER_MISSING'
  | 'ARTIFACT_F_INVALID'
  | 'AUDIT_CONTRACT_INVALID'
  | 'PARTIAL_DURABLE_STATE'
  | 'LEGACY_MEETING'
  | 'NO_AUTHORITATIVE_FREEZE'
  | 'VOTER_CORRELATION_MISMATCH'
  | 'RESOLUTION_CORRELATION_MISMATCH'
  | 'MOTION_CORRELATION_MISMATCH'
  | 'AUDIT_CORRELATION_MISMATCH'
  | 'CARDINALITY_VIOLATION';

export type CommittedFreezeAuthorityReason = {
  code: CommittedFreezeAuthorityReasonCode;
  message: string;
};

/** COMMITTED payload — IR §15.2 minimum authoritative fields only. */
export type CommittedFreezeAuthorityCommittedEvaluation = {
  status: 'COMMITTED';
  authority: true;
  ownerVoteMeetingId: string;
  freezeEventId: string;
  primaryAuditId: string;
  attemptId: string;
  freezeBoundaryAt: string;
  propertyId: string;
};

/** Non-COMMITTED classification — authority false with bounded identifiers. */
export type CommittedFreezeAuthorityNonCommittedEvaluation = {
  status: Exclude<CommittedFreezeAuthorityStatus, 'COMMITTED'>;
  authority: false;
  reason: CommittedFreezeAuthorityReason;
  ownerVoteMeetingId?: string;
  freezeEventId?: string;
  propertyId?: string;
};

export type CommittedFreezeAuthorityEvaluation =
  | CommittedFreezeAuthorityCommittedEvaluation
  | CommittedFreezeAuthorityNonCommittedEvaluation;
