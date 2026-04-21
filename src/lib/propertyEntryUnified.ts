/**
 * 统一入楼 — **提交与预检**层（`src/lib/unifiedPropertyEntry.ts` 为对外入口的补充）。
 *
 * - **提交 / 自动失败转 pending**：单 RPC `submit_join_request`（库内先尝试自动 owner 进楼，失败写 `join_requests`）。
 * - **拒绝 pending**：`reject_join_request`（仅 `join_requests`）。
 * - **管理端通过**：不在此文件；请使用 `unifiedPropertyEntry.approveJoinRequest` → `approve_join_request`。
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserRole } from './supabase';
import {
  isSubmitJoinFailureKind,
  type SubmitJoinRequestRpcRow,
  type UnifiedPropertyEntryResult,
  type SubmitUnifiedPropertyEntryResult,
} from './propertyEntryKinds';
import { logPropertyEntrySubmitResult, logUnifiedPropertyEntryLine } from './propertyEntryGateLog';
import { trackPropertyEntryEvent } from './propertyEntryEvents';

/** PostgREST 有时把 `RETURNS jsonb` 的 RPC 包成单元素数组，必须先解包再读字段。 */
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

function str(v: unknown): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}

function nullBase(
  raw: unknown,
  message: string | null,
  transportError?: { message: string; code?: string },
): UnifiedPropertyEntryResult {
  return {
    kind: 'rpc_error',
    propertyId: null,
    inviteCode: null,
    unitNo: null,
    role: null,
    membershipStatus: null,
    message,
    raw,
    transportError,
  };
}

function parseSubmitJoinRow(raw: unknown, transportError?: { message: string; code?: string }): UnifiedPropertyEntryResult {
  const row = firstRpcJsonRow(raw);
  if (row == null) {
    return nullBase(raw, transportError?.message ?? 'Empty RPC response', transportError);
  }

  const r = row as unknown as SubmitJoinRequestRpcRow;
  const kind = str(r.kind) ?? '';
  const message = r.message != null ? String(r.message) : null;
  const propertyId = str(r.property_id);
  const requestId = str(r.request_id);
  const inviteCode = str(r.invite_code);
  const unitNo = str(r.unit_no);
  const role = str(r.role);
  const membershipStatus = str(r.membership_status);

  if (transportError) {
    return nullBase(raw, transportError.message, transportError);
  }

  if (!kind) {
    return nullBase(raw, message ?? 'Missing kind');
  }

  if (r.ok === true) {
    if (kind === 'auto_approved') {
      if (!propertyId) return nullBase(raw, message ?? 'auto_approved missing property_id');
      return {
        kind: 'auto_approved',
        propertyId,
        inviteCode,
        unitNo,
        role,
        membershipStatus,
        message,
        raw,
      };
    }
    if (kind === 'pending_submitted') {
      if (!propertyId) return nullBase(raw, message ?? 'pending_submitted missing property_id');
      return {
        kind: 'pending_submitted',
        propertyId,
        requestId,
        inviteCode,
        unitNo,
        role,
        message,
        raw,
      };
    }
    if (kind === 'already_member') {
      if (!propertyId) return nullBase(raw, message ?? 'already_member missing property_id');
      return {
        kind: 'already_member',
        propertyId,
        inviteCode,
        unitNo,
        role,
        membershipStatus,
        message,
        raw,
      };
    }
    return nullBase(raw, message ?? `Unexpected success kind: ${kind}`);
  }

  if (r.ok === false && isSubmitJoinFailureKind(kind)) {
    return {
      kind,
      propertyId,
      inviteCode,
      unitNo,
      role,
      membershipStatus,
      message,
      raw,
    } as UnifiedPropertyEntryResult;
  }

  return nullBase(raw, message ?? kind);
}

export type SubmitUnifiedPropertyEntryInput = {
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
  /** 归因：qr / web / join_form 等，写入漏斗 `source`。 */
  entrySource?: string | null;
};

export type { SubmitUnifiedPropertyEntryResult, UnifiedPropertyEntryResult } from './propertyEntryKinds';

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

function trackSubmitFunnelAfterParse(
  client: SupabaseClient,
  input: SubmitUnifiedPropertyEntryInput,
  parsed: UnifiedPropertyEntryResult,
  inviteForRpc: string | null,
): void {
  if (parsed.kind === 'rpc_error') return;
  const pid = parsed.propertyId ?? input.p_property_id?.trim() ?? null;
  if (!pid) return;

  const submittedKinds: UnifiedPropertyEntryResult['kind'][] = [
    'pending_submitted',
    'duplicate_pending',
    'auto_approved',
    'already_member',
  ];
  if (submittedKinds.includes(parsed.kind)) {
    const requestId = parsed.kind === 'pending_submitted' ? parsed.requestId ?? null : null;
    void trackPropertyEntryEvent(client, {
      propertyId: pid,
      inviteCode: inviteForRpc,
      source: input.entrySource ?? null,
      eventType: 'submitted',
      userId: input.userId,
      requestId,
    });
  }
  if (parsed.kind === 'auto_approved') {
    void trackPropertyEntryEvent(client, {
      propertyId: pid,
      inviteCode: inviteForRpc,
      source: input.entrySource ?? null,
      eventType: 'auto_approved',
      userId: input.userId,
      requestId: null,
    });
  }
}

/**
 * 统一入楼提交：仅 `submit_join_request`；结果按后端 `kind` 标准化。
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

  const pInviteForRpc = mergeInviteCodeForRpc(input.p_invite_code);

  const payload = {
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
  };

  console.log('[property-entry] rpc payload', payload);

  const { data, error } = await client.rpc('submit_join_request', payload);

  console.log('[property-entry] rpc raw result', data);

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
    return parseSubmitJoinRow(data, { message: error.message, code: error.code });
  }

  const parsed = parseSubmitJoinRow(data);
  trackSubmitFunnelAfterParse(client, input, parsed, pInviteForRpc);
  if (parsed.kind === 'auto_approved') {
    logUnifiedPropertyEntryLine('submit:auto_join_passed', {
      property_id: parsed.propertyId,
      unit_input: unit,
    });
  } else if (parsed.kind === 'pending_submitted') {
    logUnifiedPropertyEntryLine('submit:pending_created', {
      property_id: parsed.propertyId,
      unit_input: unit,
      join_request_id: parsed.requestId,
    });
  } else if (parsed.kind === 'already_member') {
    logUnifiedPropertyEntryLine('submit:already_member', {
      property_id: parsed.propertyId,
      unit_input: unit,
    });
  } else if (parsed.kind !== 'rpc_error') {
    logUnifiedPropertyEntryLine('submit:failure_kind', {
      property_id: pid,
      unit_input: unit,
      kind: parsed.kind,
      message: parsed.message,
    });
  }

  return parsed;
}

function rpcRowSucceeded(data: unknown): boolean {
  const row = firstRpcJsonRow(data);
  return row?.ok === true;
}

function rpcRowErrorCode(data: unknown): string | undefined {
  const row = firstRpcJsonRow(data);
  if (row?.ok === false && row.kind != null) return String(row.kind);
  return row?.error != null ? String(row.error) : undefined;
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
