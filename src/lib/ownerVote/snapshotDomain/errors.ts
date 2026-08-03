/** E-01 Phase 4 — typed read-layer errors (fail closed; no silent live-roll fallback). */
export type SnapshotDomainReadErrorCode =
  | 'MEETING_NOT_FOUND'
  | 'FREEZE_EVENT_NOT_FOUND'
  | 'CORRELATION_MISMATCH'
  | 'DATABASE_ERROR'
  | 'INVALID_ROW';

export class SnapshotDomainReadError extends Error {
  readonly code: SnapshotDomainReadErrorCode;
  readonly causeDetail?: string;

  constructor(code: SnapshotDomainReadErrorCode, message: string, causeDetail?: string) {
    super(message);
    this.name = 'SnapshotDomainReadError';
    this.code = code;
    this.causeDetail = causeDetail;
  }
}

export type SnapshotDomainReadResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: SnapshotDomainReadError };

export function snapshotReadOk<T>(data: T): SnapshotDomainReadResult<T> {
  return { ok: true, data };
}

export function snapshotReadErr<T>(
  code: SnapshotDomainReadErrorCode,
  message: string,
  causeDetail?: string,
): SnapshotDomainReadResult<T> {
  return { ok: false, error: new SnapshotDomainReadError(code, message, causeDetail) };
}

export function snapshotReadFromPostgrestError(
  context: string,
  message: string,
): SnapshotDomainReadError {
  return new SnapshotDomainReadError('DATABASE_ERROR', `${context}: ${message}`, message);
}
