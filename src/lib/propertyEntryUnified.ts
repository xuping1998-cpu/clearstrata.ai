/**
 * 统一入楼（单一路径）：全部走数据库 `submit_join_request` / `approve_join_request` / `reject_join_request`。
 * 库内已实现「普通 owner 先试自动进楼（白名单房号 + 信息完整），失败再写 pending」；
 * 前端不拆两次 RPC，避免竞态与双流程冲突。
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserRole } from './supabase';
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

function rpcRowSucceeded(data: unknown): boolean {
  const row = data as { success?: boolean; ok?: boolean } | null;
  return row != null && (row.success === true || row.ok === true);
}

function rpcRowErrorCode(data: unknown): string | undefined {
  return (data as { error?: string } | null)?.error;
}

export type SubmitUnifiedPropertyEntryInput = {
  /** 当前登录用户 id（用于去重预检与日志） */
  userId: string;
  p_property_id: string | null;
  p_requested_role: UserRole;
  p_unit_number: string | null;
  p_note: string | null;
  p_full_name: string | null;
  p_email: string | null;
  p_phone: string | null;
  p_invite_code: string | null;
  p_direct_invite_id: string | null;
  p_inferred_role: string | null;
  p_inferred_unit_number: string | null;
  p_move_in_date: string | null;
  p_language_pref: 'en' | 'zh';
  /** 默认 false：在可调条件下先做「同物业同用户 pending」预检 */
  skipDuplicateCheck?: boolean;
};

export type SubmitUnifiedPropertyEntryResult =
  | {
      kind: 'auto_approved';
      propertyId: string | null;
      raw: unknown;
    }
  | {
      kind: 'pending_submitted';
      joinRequestId: string | null;
      raw: unknown;
    }
  | {
      kind: 'rpc_error';
      error: { message: string; code?: string };
      raw: unknown;
    }
  | {
      kind: 'business_reject';
      errorKey?: string;
      message?: string;
      message_zh?: string;
      raw: unknown;
    };

function parseSubmitUnifiedResult(raw: unknown): SubmitUnifiedPropertyEntryResult {
  const row = raw as Record<string, unknown> | null;
  const entryPath = row?.entry_path != null ? String(row.entry_path) : '';
  const ok = row != null && (row.ok === true || row.success === true);
  if (!ok) {
    return {
      kind: 'business_reject',
      errorKey: row?.error != null ? String(row.error) : undefined,
      message: row?.message != null ? String(row.message) : undefined,
      message_zh: row?.message_zh != null ? String(row.message_zh) : undefined,
      raw,
    };
  }
  if (entryPath === 'auto_approved') {
    return {
      kind: 'auto_approved',
      propertyId: row?.property_id != null ? String(row.property_id) : null,
      raw,
    };
  }
  return {
    kind: 'pending_submitted',
    joinRequestId: row?.join_request_id != null ? String(row.join_request_id) : null,
    raw,
  };
}

/**
 * 统一入楼提交：单 RPC `submit_join_request`（库内先自动 owner 进楼，失败再 pending）。
 */
export async function submitUnifiedPropertyEntry(
  client: SupabaseClient,
  input: SubmitUnifiedPropertyEntryInput,
): Promise<SubmitUnifiedPropertyEntryResult> {
  const pid = input.p_property_id?.trim() ?? null;
  const unit = input.p_unit_number?.trim() || null;

  logUnifiedPropertyEntryLine('submit:start', {
    property_id: pid,
    unit_input: unit,
    user_id: input.userId,
    requested_role: input.p_requested_role,
  });

  if (!input.skipDuplicateCheck && pid && input.userId) {
    const emailNorm = normalizeJoinRequestEmail(input.p_email);
    if (emailNorm) {
      const dupEmail = await hasPendingJoinRequestForPropertyEmail(client, pid, emailNorm);
      if (dupEmail) {
        logUnifiedPropertyEntryLine('submit:blocked_duplicate_pending_email', {
          property_id: pid,
          email: emailNorm,
        });
        return {
          kind: 'business_reject',
          errorKey: 'already_pending',
          message: 'PENDING_EXISTS',
          message_zh: '你已提交过该物业的申请，请等待审核。',
          raw: null,
        };
      }
    }
    const dupUser = await hasPendingJoinRequestForCurrentUser(client, pid, input.userId);
    if (dupUser) {
      logUnifiedPropertyEntryLine('submit:blocked_duplicate_pending_user', {
        property_id: pid,
        user_id: input.userId,
      });
      return {
        kind: 'business_reject',
        errorKey: 'already_pending',
        message: 'PENDING_EXISTS',
        message_zh: '你已提交过该物业的申请，请等待审核。',
        raw: null,
      };
    }
  }

  const { data, error } = await client.rpc('submit_join_request', {
    p_property_id: input.p_property_id,
    p_requested_role: input.p_requested_role,
    p_unit_number: input.p_unit_number,
    p_note: input.p_note,
    p_full_name: input.p_full_name,
    p_email: input.p_email,
    p_phone: input.p_phone,
    p_invite_code: input.p_invite_code,
    p_direct_invite_id: input.p_direct_invite_id,
    p_inferred_role: input.p_inferred_role,
    p_inferred_unit_number: input.p_inferred_unit_number,
    p_move_in_date: input.p_move_in_date,
    p_language_pref: input.p_language_pref,
  });

  logPropertyEntrySubmitResult({
    userId: input.userId,
    email: input.p_email,
    propertyId: pid,
    unitNo: unit,
    data,
    error,
  });

  if (error) {
    logUnifiedPropertyEntryLine('submit:rpc_error', {
      property_id: pid,
      unit_input: unit,
      message: error.message,
      code: error.code,
    });
    return { kind: 'rpc_error', error: { message: error.message, code: error.code }, raw: data };
  }

  const parsed = parseSubmitUnifiedResult(data);
  if (parsed.kind === 'auto_approved') {
    logUnifiedPropertyEntryLine('submit:auto_join_passed', {
      property_id: parsed.propertyId,
      unit_input: unit,
      pending_created: false,
    });
  } else if (parsed.kind === 'pending_submitted') {
    logUnifiedPropertyEntryLine('submit:pending_created', {
      property_id: pid,
      unit_input: unit,
      join_request_id: parsed.joinRequestId,
      pending_created: true,
    });
  } else if (parsed.kind === 'business_reject') {
    logUnifiedPropertyEntryLine('submit:auto_join_failed_or_rejected', {
      property_id: pid,
      unit_input: unit,
      errorKey: parsed.errorKey,
      message: parsed.message,
    });
  }

  return parsed;
}

/** 扫码进楼专用 `tryAutoJoinProperty` / `createPendingJoinRequest` 见 `qrPropertyEntry.ts`。 */

export type ApproveJoinRequestInput = {
  joinRequestId: string;
  reviewerId: string;
  unitNumberOverride: string | null;
};

/** 管理端「最终审批」：单 RPC，库内完成 residents / property_members / join_requests。 */
export type ApproveJoinRequestFinalInput = {
  requestId: string;
  propertyId: string;
  defaultUnitNo: string | null;
};

export async function approveJoinRequestFinal(
  client: SupabaseClient,
  input: ApproveJoinRequestFinalInput,
): Promise<{ ok: boolean; data: unknown; error: { message: string; code?: string } | null }> {
  logUnifiedPropertyEntryLine('approve_final:start', {
    p_request_id: input.requestId,
    p_property_id: input.propertyId,
    p_default_unit_no: input.defaultUnitNo,
  });

  const { data, error } = await client.rpc('approve_join_request_final', {
    p_request_id: input.requestId,
    p_property_id: input.propertyId,
    p_default_unit_no: input.defaultUnitNo,
  });

  if (error) {
    logUnifiedPropertyEntryLine('approve_final:rpc_error', {
      message: error.message,
      code: error.code,
      raw: data,
    });
    return { ok: false, data, error: { message: error.message, code: error.code } };
  }

  const ok = rpcRowSucceeded(data);
  const row = (data ?? null) as Record<string, unknown> | null;
  logPropertyEntryApproveResult({
    reviewerId: null,
    data,
    unitNoFallback: input.defaultUnitNo,
  });
  logUnifiedPropertyEntryLine('approve_final:result', {
    ok,
    error_code: rpcRowErrorCode(data),
    approve_email: row?.target_email ?? null,
    resolved_profile_id: row?.target_user_id ?? null,
    residents_outcome: row?.residents_outcome ?? null,
    property_members_upsert: row?.property_members_upserted ?? row?.property_members_inserted ?? null,
    join_request_status_updated: row?.join_request_status_updated ?? null,
    unit_no: row?.unit_no ?? null,
  });

  return { ok, data, error: null };
}

/** @deprecated 使用 `approveJoinRequestFinal`；仍调用旧 RPC `approve_join_request`。 */
export async function approveJoinRequest(
  client: SupabaseClient,
  input: ApproveJoinRequestInput,
): Promise<{ ok: boolean; data: unknown; error: { message: string; code?: string } | null }> {
  logUnifiedPropertyEntryLine('approve:start', {
    join_request_id: input.joinRequestId,
    reviewer_id: input.reviewerId,
    unit_override: input.unitNumberOverride,
  });

  const { data, error } = await client.rpc('approve_join_request', {
    p_join_request_id: input.joinRequestId,
    p_reviewer_id: input.reviewerId,
    p_unit_number: input.unitNumberOverride,
  });

  if (error) {
    logUnifiedPropertyEntryLine('approve:rpc_error', { message: error.message, code: error.code });
    return { ok: false, data, error: { message: error.message, code: error.code } };
  }

  const ok = rpcRowSucceeded(data);
  const row = (data ?? null) as Record<string, unknown> | null;
  logPropertyEntryApproveResult({
    reviewerId: input.reviewerId,
    data,
    unitNoFallback: input.unitNumberOverride,
  });
  logUnifiedPropertyEntryLine('approve:result', {
    ok,
    error_code: rpcRowErrorCode(data),
    approve_email: row?.target_email ?? null,
    resolved_profile_id: row?.target_user_id ?? null,
    residents_outcome: row?.residents_outcome ?? null,
    property_members_upsert: row?.property_members_upserted ?? row?.property_members_inserted ?? null,
    join_request_status_updated: row?.join_request_status_updated ?? null,
    unit_no: row?.unit_no ?? null,
  });

  return { ok, data, error: null };
}

export type RejectJoinRequestInput = {
  joinRequestId: string;
  reviewerId: string;
  rejectionReason: string | null;
};

export async function rejectJoinRequest(
  client: SupabaseClient,
  input: RejectJoinRequestInput,
): Promise<{ ok: boolean; data: unknown; error: { message: string; code?: string } | null }> {
  logUnifiedPropertyEntryLine('reject:start', {
    join_request_id: input.joinRequestId,
    reviewer_id: input.reviewerId,
  });

  const { data, error } = await client.rpc('reject_join_request', {
    p_join_request_id: input.joinRequestId,
    p_reviewer_id: input.reviewerId,
    p_rejection_reason: input.rejectionReason,
  });

  if (error) {
    logUnifiedPropertyEntryLine('reject:rpc_error', { message: error.message, code: error.code });
    return { ok: false, data, error: { message: error.message, code: error.code } };
  }

  const ok = rpcRowSucceeded(data);
  logUnifiedPropertyEntryLine('reject:result', { ok, raw: data });
  return { ok, data, error: null };
}

export { rpcRowSucceeded as joinRpcSucceeded, rpcRowErrorCode as joinRpcErrorCode };
