/**
 * 最终统一入楼：自动进楼 → 失败则 pending；审批仅 RPC `approve_join_request_final`。
 * 不循环依赖 `propertyEntryUnified` 的 re-export（本文件单向 import 其 submit 工具）。
 */

/** 审批通过后广播，便于「用户管理」等页刷新 `property_members`。 */
export const CLEARSTRATA_PROPERTY_MEMBERS_CHANGED = 'clearstrata-property-members-changed';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserRole } from './supabase';
import {
  firstRpcJsonRow,
  submitUnifiedPropertyEntry,
  type SubmitUnifiedPropertyEntryResult,
} from './propertyEntryUnified';
import {
  hasPendingJoinRequestForCurrentUser,
  hasPendingJoinRequestForPropertyEmail,
  normalizeJoinRequestEmail,
} from './joinRequestGuards';
import {
  logPropertyEntryApproveResult,
  logPropertyEntrySubmitResult,
  logUnifiedPropertyEntryLine,
} from './propertyEntryGateLog';

// --- tryAutoJoinProperty ----------------------------------------------------

export type TryAutoJoinPropertyInput = {
  propertyId: string;
  unitNo: string;
  currentUserId: string;
  currentUserEmail: string;
  languagePref?: 'en' | 'zh';
};

export type TryAutoJoinPropertySuccess = {
  ok: true;
  propertyId: string;
  raw: unknown;
  residentsUpdateResult?: unknown;
  propertyMembersUpsertResult?: unknown;
};

export type TryAutoJoinPropertyFailure = {
  ok: false;
  reason: string;
  message?: string;
  message_zh?: string;
  raw: unknown;
};

export type TryAutoJoinPropertyResult = TryAutoJoinPropertySuccess | TryAutoJoinPropertyFailure;

function tryAutoRpcOk(data: unknown): boolean {
  const row = data as { ok?: boolean; success?: boolean } | null;
  return row != null && (row.ok === true || row.success === true);
}

function tryAutoRpcError(data: unknown): string | undefined {
  return (data as { error?: string } | null)?.error;
}

/**
 * 自动校验房号并绑定：RPC `try_auto_join_property_from_qr`（白名单 roster + 未绑他人）。
 */
export async function tryAutoJoinProperty(
  client: SupabaseClient,
  input: TryAutoJoinPropertyInput,
): Promise<TryAutoJoinPropertyResult> {
  const pid = input.propertyId?.trim() ?? '';
  const unit = input.unitNo?.trim() ?? '';
  const lang = input.languagePref === 'zh' ? 'zh' : 'en';

  logUnifiedPropertyEntryLine('try_auto_join:start', {
    property_id: pid,
    unit_input: unit,
    current_user_id: input.currentUserId,
    current_user_email: input.currentUserEmail,
  });

  if (!pid || !unit) {
    logUnifiedPropertyEntryLine('try_auto_join:failed', { property_id: pid, unit_input: unit, failure_reason: 'invalid_input' });
    return {
      ok: false,
      reason: 'invalid_input',
      message: 'Property and unit are required.',
      message_zh: '请填写物业与房号。',
      raw: null,
    };
  }

  const { data, error } = await client.rpc('try_auto_join_property_from_qr', {
    p_property_id: pid,
    p_unit_no: unit,
    p_language_pref: lang,
  });

  if (error) {
    logUnifiedPropertyEntryLine('try_auto_join:failed', {
      property_id: pid,
      unit_input: unit,
      failure_reason: 'rpc_error',
      message: error.message,
      code: error.code,
    });
    return { ok: false, reason: 'rpc_error', message: error.message, raw: data };
  }

  if (!tryAutoRpcOk(data)) {
    const err = tryAutoRpcError(data);
    const row = data as { message?: string; message_zh?: string } | null;
    logUnifiedPropertyEntryLine('try_auto_join:failed', {
      property_id: pid,
      unit_input: unit,
      failure_reason: err ?? 'bind_rejected',
      message: row?.message,
      message_zh: row?.message_zh,
      raw: data,
    });
    return {
      ok: false,
      reason: err ?? 'bind_rejected',
      message: row?.message,
      message_zh: row?.message_zh,
      raw: data,
    };
  }

  const row = data as Record<string, unknown> | null;
  logUnifiedPropertyEntryLine('try_auto_join:passed', {
    property_id: row?.property_id ?? pid,
    unit_input: unit,
    current_user_id: input.currentUserId,
    current_user_email: input.currentUserEmail,
    auto_join_passed: true,
  });

  return {
    ok: true,
    propertyId: (row?.property_id as string) ?? pid,
    raw: data,
    residentsUpdateResult: row?.resident_id ?? null,
    propertyMembersUpsertResult: row?.property_members_after ?? row?.property_members_present ?? null,
  };
}

// --- createPendingJoinRequest -----------------------------------------------

export type CreatePendingJoinRequestInput = {
  userId: string;
  propertyId: string;
  unitNo: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  languagePref: 'en' | 'zh';
  /** 与 submit 一致：默认做 pending 去重预检 */
  skipDuplicateCheck?: boolean;
};

export type CreatePendingJoinRequestResult =
  | { kind: 'created'; joinRequestId: string | null; raw: unknown }
  | { kind: 'already_pending'; raw: unknown | null }
  | { kind: 'auto_approved'; propertyId: string | null; raw: unknown }
  | { kind: 'rpc_error'; error: { message: string; code?: string }; raw: unknown }
  | { kind: 'business_reject'; errorKey?: string; message?: string; message_zh?: string; raw: unknown };

function mapSubmitToPendingResult(r: SubmitUnifiedPropertyEntryResult): CreatePendingJoinRequestResult {
  if (r.kind === 'pending_submitted') return { kind: 'created', joinRequestId: r.joinRequestId, raw: r.raw };
  if (r.kind === 'auto_approved') return { kind: 'auto_approved', propertyId: r.propertyId, raw: r.raw };
  if (r.kind === 'rpc_error') return { kind: 'rpc_error', error: r.error, raw: r.raw };
  return {
    kind: 'business_reject',
    errorKey: r.errorKey,
    message: r.message,
    message_zh: r.message_zh,
    raw: r.raw,
  };
}

/**
 * 写入 `join_requests` pending：内部单 RPC `submit_join_request`（库内先尝试自动进楼）。
 * 前端预检同物业同邮箱 pending，避免重复插入；数据库有 `uniq_pending_request` 兜底。
 */
export async function createPendingJoinRequest(
  client: SupabaseClient,
  input: CreatePendingJoinRequestInput,
): Promise<CreatePendingJoinRequestResult> {
  const pid = input.propertyId?.trim() ?? '';
  const unit = input.unitNo?.trim() || null;
  const emailNorm = normalizeJoinRequestEmail(input.email);

  logUnifiedPropertyEntryLine('create_pending_join:start', {
    property_id: pid,
    unit_input: unit,
    user_id: input.userId,
    email: emailNorm,
  });

  if (!input.skipDuplicateCheck && pid && emailNorm) {
    const dupEmail = await hasPendingJoinRequestForPropertyEmail(client, pid, emailNorm);
    if (dupEmail) {
      logUnifiedPropertyEntryLine('create_pending_join:blocked_duplicate_email', { property_id: pid, email: emailNorm });
      return { kind: 'already_pending', raw: null };
    }
  }
  if (!input.skipDuplicateCheck && pid && input.userId) {
    const dupUser = await hasPendingJoinRequestForCurrentUser(client, pid, input.userId);
    if (dupUser) {
      logUnifiedPropertyEntryLine('create_pending_join:blocked_duplicate_user', { property_id: pid, user_id: input.userId });
      return { kind: 'already_pending', raw: null };
    }
  }

  const sub = await submitUnifiedPropertyEntry(client, {
    userId: input.userId,
    p_property_id: pid,
    p_requested_role: 'owner' as UserRole,
    p_unit_number: unit,
    p_note: 'unified_property_entry',
    p_full_name: input.fullName?.trim() || null,
    p_email: input.email?.trim().toLowerCase() || null,
    p_phone: input.phone?.trim() || null,
    p_invite_code: null,
    p_direct_invite_id: null,
    p_inferred_role: null,
    p_inferred_unit_number: null,
    p_move_in_date: null,
    p_language_pref: input.languagePref,
    skipDuplicateCheck: true,
  });

  logPropertyEntrySubmitResult({
    userId: input.userId,
    email: input.email,
    propertyId: pid,
    unitNo: unit,
    data: 'raw' in sub ? sub.raw : null,
    error: sub.kind === 'rpc_error' ? sub.error : null,
  });

  const mapped = mapSubmitToPendingResult(sub);
  if (mapped.kind === 'created') {
    logUnifiedPropertyEntryLine('create_pending_join:created', {
      property_id: pid,
      join_request_id: mapped.joinRequestId,
    });
  }
  return mapped;
}

// --- approve / reject -------------------------------------------------------

export type ApproveJoinRequestInput = {
  joinRequestId: string;
  propertyId: string;
  /** 审批时覆盖房号；空则用申请上的 `unit_number` */
  unitNumberOverride: string | null;
};

export type ApproveJoinRequestFinalInput = {
  requestId: string;
  propertyId: string;
  unitNo: string | null;
};

export type ApproveJoinRpcRow = {
  ok?: boolean;
  error?: string | null;
  email?: string | null;
  user_id?: string | null;
  property_id?: string | null;
  unit_no?: string | null;
  residents_outcome?: string | null;
  property_members_upserted?: boolean;
  join_request_status_updated?: boolean;
  message?: string;
  message_zh?: string;
};

/** RPC 返回 jsonb：`ok === true` 且无 PostgREST `error` 即成功。 */
export function approveJoinRequestFinalSucceeded(
  data: unknown,
  rpcError: { message?: string } | null | undefined,
): boolean {
  if (rpcError?.message) return false;
  const row = firstRpcJsonRow(data) as ApproveJoinRpcRow | null;
  if (row?.ok === true) return true;
  if (row?.success === true) return true;
  const jrDone = row?.join_request_status_updated === true;
  const pmDone = row?.property_members_upserted === true;
  if (jrDone && pmDone && row?.error == null) return true;
  return false;
}

/**
 * 管理端审批唯一入口：仅 `approve_join_request_final`（不写 residents / property_members / join_requests）。
 */
export async function approveJoinRequest(
  client: SupabaseClient,
  input: ApproveJoinRequestInput,
): Promise<{ ok: boolean; data: unknown; error: { message: string; code?: string } | null }> {
  const effectiveUnit = input.unitNumberOverride?.trim() || null;

  logUnifiedPropertyEntryLine('approve_join_request:start', {
    p_request_id: input.joinRequestId,
    p_property_id: input.propertyId,
    p_unit_no: effectiveUnit,
  });

  const { data, error } = await client.rpc('approve_join_request_final', {
    p_request_id: input.joinRequestId,
    p_property_id: input.propertyId,
    p_unit_no: effectiveUnit,
  });

  const row = firstRpcJsonRow(data) as ApproveJoinRpcRow | null;

  if (error) {
    console.error('[approveJoinRequest]', {
      requestId: input.joinRequestId,
      propertyId: input.propertyId,
      effectiveUnit,
      targetEmail: row?.email ?? null,
      resolvedProfileId: row?.user_id ?? null,
      rpcData: data,
      rpcError: error,
    });
    logUnifiedPropertyEntryLine('approve_join_request:rpc_error', {
      message: error.message,
      code: error.code,
      raw: data,
    });
    return { ok: false, data, error: { message: error.message, code: error.code } };
  }

  const businessOk = row?.ok === true;
  if (!businessOk) {
    const errCode = row?.error != null ? String(row.error) : 'unknown';
    const msg = row?.message_zh || row?.message || errCode;
    console.error('[approveJoinRequest]', {
      requestId: input.joinRequestId,
      propertyId: input.propertyId,
      effectiveUnit,
      targetEmail: row?.email ?? null,
      resolvedProfileId: row?.user_id ?? null,
      rpcData: data,
      rpcError: null,
      businessError: errCode,
    });
    logUnifiedPropertyEntryLine('approve_join_request:business_error', { error: errCode, raw: data });
    return {
      ok: false,
      data,
      error: { message: msg || errCode, code: errCode },
    };
  }

  console.info('[approveJoinRequest]', {
    requestId: input.joinRequestId,
    propertyId: input.propertyId,
    effectiveUnit,
    targetEmail: row?.email ?? null,
    resolvedProfileId: row?.user_id ?? null,
    rpcData: data,
    rpcError: null,
  });

  logPropertyEntryApproveResult({
    reviewerId: null,
    data,
    unitNoFallback: effectiveUnit,
  });
  logUnifiedPropertyEntryLine('approve_join_request:ok', {
    residents_outcome: row?.residents_outcome,
    property_members_upserted: row?.property_members_upserted,
    join_request_status_updated: row?.join_request_status_updated,
    unit_no: row?.unit_no,
  });

  return { ok: true, data, error: null };
}

/** 与历史 `approveJoinRequestFinal` 入参兼容。 */
export async function approveJoinRequestFinal(
  client: SupabaseClient,
  input: ApproveJoinRequestFinalInput,
): Promise<{ ok: boolean; data: unknown; error: { message: string; code?: string } | null }> {
  return approveJoinRequest(client, {
    joinRequestId: input.requestId,
    propertyId: input.propertyId,
    unitNumberOverride: input.unitNo,
  });
}

export type RejectJoinRequestInput = {
  joinRequestId: string;
  reviewerId: string;
  rejectionReason: string | null;
};

function rejectRpcRowSucceeded(data: unknown): boolean {
  const r = firstRpcJsonRow(data);
  return r != null && (r.success === true || r.ok === true);
}

/** 拒绝：RPC `reject_join_request`（仅更新 join_requests）。 */
export async function rejectJoinRequest(
  client: SupabaseClient,
  input: RejectJoinRequestInput,
): Promise<{ ok: boolean; data: unknown; error: { message: string; code?: string } | null }> {
  logUnifiedPropertyEntryLine('reject_join_request:start', {
    join_request_id: input.joinRequestId,
    reviewer_id: input.reviewerId,
  });

  const { data, error } = await client.rpc('reject_join_request', {
    p_join_request_id: input.joinRequestId,
    p_reviewer_id: input.reviewerId,
    p_rejection_reason: input.rejectionReason,
  });

  if (error) {
    logUnifiedPropertyEntryLine('reject_join_request:rpc_error', { message: error.message, code: error.code });
    return { ok: false, data, error: { message: error.message, code: error.code } };
  }

  const ok = rejectRpcRowSucceeded(data);
  logUnifiedPropertyEntryLine('reject_join_request:result', { ok, raw: data });
  return { ok, data, error: null };
}
