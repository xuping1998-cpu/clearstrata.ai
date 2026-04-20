/**
 * 统一入楼 — **提交与预检**层（`src/lib/unifiedPropertyEntry.ts` 为对外入口的补充）。
 *
 * - **提交 / 自动失败转 pending**：单 RPC `submit_join_request`（库内先尝试自动 owner 进楼，失败写 `join_requests`）。
 * - **拒绝 pending**：`reject_join_request`（仅 `join_requests`）。
 * - **管理端通过**：不在此文件；请使用 `unifiedPropertyEntry.approveJoinRequest` → `approve_join_request`。
 *
 * 旧的 `approve_join_request`（非 `_final`）已从 `authenticated` 撤销 EXECUTE（见迁移 `20260728120000_*`）。
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserRole } from './supabase';
import {
  hasPendingJoinRequestForCurrentUser,
  hasPendingJoinRequestForPropertyEmail,
  normalizeJoinRequestEmail,
} from './joinRequestGuards';
import { logPropertyEntrySubmitResult, logUnifiedPropertyEntryLine } from './propertyEntryGateLog';

/** PostgREST 有时把 `RETURNS jsonb` 的 RPC 包成单元素数组，必须先解包再读字段（旧版审批 RPC 等）。 */
export function firstRpcJsonRow(data: unknown): Record<string, unknown> | null {
  if (data == null) return null;
  if (Array.isArray(data)) {
    const el = data[0];
    if (el != null && typeof el === 'object' && !Array.isArray(el)) return el as Record<string, unknown>;
    return null;
  }
  if (typeof data === 'object') return data as Record<string, unknown>;
  return null;
}

function rpcRowSucceeded(data: unknown): boolean {
  const row = firstRpcJsonRow(data);
  return row != null && (row.success === true || row.ok === true);
}

function rpcRowErrorCode(data: unknown): string | undefined {
  const row = firstRpcJsonRow(data);
  return row?.error != null ? String(row.error) : undefined;
}

/** `?code=` on join / invite pages — merged into RPC `p_invite_code` for `join_requests.invite_code` attribution. */
function inviteCodeFromBrowserUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('code');
  const t = raw?.trim() ?? '';
  return t ? t : null;
}

function mergeInviteCodeForRpc(explicit: string | null | undefined): string | null {
  const a = explicit?.trim() ?? '';
  if (a) return a;
  return inviteCodeFromBrowserUrl();
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
  const row = firstRpcJsonRow(raw);
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

  const pInviteForRpc = mergeInviteCodeForRpc(input.p_invite_code);

  const { data, error } = await client.rpc('submit_join_request', {
    p_property_id: input.p_property_id,
    p_requested_role: input.p_requested_role,
    p_unit_number: input.p_unit_number,
    p_note: input.p_note,
    p_full_name: input.p_full_name,
    p_email: input.p_email,
    p_phone: input.p_phone,
    p_invite_code: pInviteForRpc,
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

/** 审批 / 拒绝 / 扫码自动进楼实现见 `unifiedPropertyEntry.ts`（避免与 submit 循环依赖）。 */
export type {
  ApproveJoinRequestInput,
  ApproveJoinRequestFinalInput,
  RejectJoinRequestInput,
  EnterPropertyByInviteInput,
} from './unifiedPropertyEntry';
export {
  approveJoinRequestFinalSucceeded,
  approveJoinRequestFinal,
  approveJoinRequest,
  rejectJoinRequest,
  enterPropertyByInvite,
} from './unifiedPropertyEntry';

export { rpcRowSucceeded as joinRpcSucceeded, rpcRowErrorCode as joinRpcErrorCode };
