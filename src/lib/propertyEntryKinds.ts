/**
 * Standard `kind` values returned by RPC `submit_join_request` (JSON object).
 * Keep in sync with DB migration defining `_submit_join_unified_response` / `submit_join_request`.
 */

export const SUBMIT_JOIN_SUCCESS_KINDS = ['auto_approved', 'pending_submitted', 'already_member'] as const;
export type SubmitJoinSuccessKind = (typeof SUBMIT_JOIN_SUCCESS_KINDS)[number];

export const SUBMIT_JOIN_FAILURE_KINDS = [
  'invalid_invite',
  'invite_expired',
  'invite_disabled',
  'invite_usage_exceeded',
  'property_not_found',
  'unit_missing',
  'unit_not_whitelisted',
  'unit_conflict',
  'auth_required',
  'duplicate_pending',
  'rejected',
  'rpc_error',
] as const;
export type SubmitJoinFailureKind = (typeof SUBMIT_JOIN_FAILURE_KINDS)[number];

export type SubmitJoinKind = SubmitJoinSuccessKind | SubmitJoinFailureKind;

/** Raw JSON row from PostgREST / `submit_join_request` (snake_case fields). */
export type SubmitJoinRequestRpcRow = {
  ok: boolean;
  kind: string;
  message: string | null;
  property_id: string | null;
  request_id: string | null;
  invite_code: string | null;
  unit_no: string | null;
  role: string | null;
  membership_status: string | null;
};

export type UnifiedPropertyEntryResult =
  | {
      kind: 'auto_approved';
      propertyId: string;
      inviteCode: string | null;
      unitNo: string | null;
      role: string | null;
      membershipStatus: string | null;
      message: string | null;
      raw: unknown;
    }
  | {
      kind: 'pending_submitted';
      propertyId: string;
      requestId: string | null;
      inviteCode: string | null;
      unitNo: string | null;
      role: string | null;
      message: string | null;
      raw: unknown;
    }
  | {
      kind: 'already_member';
      propertyId: string;
      inviteCode: string | null;
      unitNo: string | null;
      role: string | null;
      membershipStatus: string | null;
      message: string | null;
      raw: unknown;
    }
  | {
      kind: SubmitJoinFailureKind;
      propertyId: string | null;
      inviteCode: string | null;
      unitNo: string | null;
      role: string | null;
      membershipStatus: string | null;
      message: string | null;
      raw: unknown;
      /** Present when `kind === 'rpc_error'` and the failure was a Supabase transport error. */
      transportError?: { message: string; code?: string };
    };

export type SubmitUnifiedPropertyEntryResult = UnifiedPropertyEntryResult;

export function isSubmitJoinFailureKind(k: string): k is SubmitJoinFailureKind {
  return (SUBMIT_JOIN_FAILURE_KINDS as readonly string[]).includes(k);
}

export function isSubmitJoinSuccessKind(k: string): k is SubmitJoinSuccessKind {
  return (SUBMIT_JOIN_SUCCESS_KINDS as readonly string[]).includes(k);
}
