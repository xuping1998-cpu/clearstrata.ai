/**
 * E-02 RU-1.3 — typed authority read/evaluation errors (fail closed; snapshotDomain convention).
 */

/** Fatal read-layer error codes (IR §8.4). */
export type CommittedFreezeAuthorityErrorCode =
  | 'MEETING_NOT_FOUND'
  | 'FREEZE_EVENT_NOT_FOUND'
  | 'DATABASE_ERROR'
  | 'INVALID_ROW'
  | 'FAIL_CLOSED'
  | 'CORRELATION_MISMATCH';

export class CommittedFreezeAuthorityError extends Error {
  readonly code: CommittedFreezeAuthorityErrorCode;
  readonly causeDetail?: string;

  constructor(code: CommittedFreezeAuthorityErrorCode, message: string, causeDetail?: string) {
    super(message);
    this.name = 'CommittedFreezeAuthorityError';
    this.code = code;
    this.causeDetail = causeDetail;
  }
}

export type CommittedFreezeAuthorityResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: CommittedFreezeAuthorityError };

export function authorityOk<T>(data: T): CommittedFreezeAuthorityResult<T> {
  return { ok: true, data };
}

export function authorityErr<T>(
  code: CommittedFreezeAuthorityErrorCode,
  message: string,
  causeDetail?: string,
): CommittedFreezeAuthorityResult<T> {
  return { ok: false, error: new CommittedFreezeAuthorityError(code, message, causeDetail) };
}

export function authorityFromPostgrestError(context: string, message: string): CommittedFreezeAuthorityError {
  return new CommittedFreezeAuthorityError('DATABASE_ERROR', `${context}: ${message}`, message);
}
