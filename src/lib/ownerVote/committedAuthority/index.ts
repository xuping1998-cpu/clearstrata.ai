/**
 * E-02 RU-1.3 — COMMITTED authority domain layer (read → verify → classify).
 * No writes. No RU-1.2 result input. Fresh durable reads only.
 */

export type {
  CommittedFreezeAuthorityCommittedEvaluation,
  CommittedFreezeAuthorityEvaluation,
  CommittedFreezeAuthorityNonCommittedEvaluation,
  CommittedFreezeAuthorityReason,
  CommittedFreezeAuthorityReasonCode,
  CommittedFreezeAuthorityStatus,
  MeetingLifecycleCompatibilityEvidence,
  PrimaryFreezeAuditRecord,
} from './types';

export type {
  CommittedFreezeAuthorityError,
  CommittedFreezeAuthorityErrorCode,
  CommittedFreezeAuthorityResult,
} from './errors';
export {
  authorityErr,
  authorityFromPostgrestError,
  authorityOk,
  CommittedFreezeAuthorityError,
} from './errors';

export type {
  CreatePrimaryFreezeAuditRepositoryOptions,
  PrimaryFreezeAuditDbRow,
  PrimaryFreezeAuditRepository,
} from './primaryFreezeAuditRepository';
export {
  createPrimaryFreezeAuditRepository,
  loadPrimaryFreezeAuditByFreezeEventId,
  primaryFreezeAuditRepository,
  PRIMARY_FREEZE_AUDIT_SELECT,
} from './primaryFreezeAuditRepository';

export type { CommittedAuthorityEvaluator, CommittedAuthorityEvaluatorDeps } from './evaluator';
export {
  createCommittedAuthorityEvaluator,
  evaluateCommittedFreezeByFreezeEventId,
  evaluateCommittedFreezeByOwnerVoteMeetingId,
} from './evaluator';
