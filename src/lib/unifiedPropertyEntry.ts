/**
 * # 物业入楼相关 RPC 封装（审批、旧自动入楼链等）
 *
 * | 场景 | 前端 API | 数据库 |
 * |------|-----------|--------|
 * | Demo / 旧扫码链 | `tryAutoJoinProperty` | 有码：`enter_property_by_invite`；无码：`try_auto_join_property_from_qr` |
 * | 公开邀请 + 资料 | **`QrPropertyEntryPage` / `JoinInvitePage`** | **`enter_property_by_public_invite_v2`** |
 * | 管理端「通过」 | `approveJoinRequest` | `approve_join_request` |
 * | 管理端「拒绝」 | `rejectJoinRequest` | `reject_join_request` |
 *
 * **residents / property_members 写入**：仅发生在上述 RPC 内；前端禁止直接 `insert` 这两张表。
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { firstRpcJsonRow } from './rpcJsonRow';
import { logPropertyEntryApproveResult, logUnifiedPropertyEntryLine } from './propertyEntryGateLog';

// --- enterPropertyByInvite (public invite code + roster bind) ---------------

export type EnterPropertyByInviteInput = {
  propertyId: string;
  inviteCode: string;
  /** 若邀请码未绑定具体房号，则必填；与 `property_invite_codes.unit_no` 不一致时会由 RPC 拒绝 */
  unitNo?: string | null;
  languagePref?: 'en' | 'zh';
};

/**
 * 扫码 / 公开邀请码入楼：RPC `enter_property_by_invite`（校验 `property_invite_codes`，写 `residents` + `property_members`，`used_count+1`）。
 */
export async function enterPropertyByInvite(client: SupabaseClient, input: EnterPropertyByInviteInput) {
  const pid = input.propertyId?.trim() ?? '';
  const code = input.inviteCode?.trim() ?? '';
  const lang = input.languagePref === 'zh' ? 'zh' : 'en';
  const unit = input.unitNo?.trim() || null;
  logUnifiedPropertyEntryLine('enter_property_by_invite:start', {
    property_id: pid,
    invite_code: code,
    unit_input: unit,
  });
  const { data, error } = await client.rpc('enter_property_by_invite', {
    p_property_id: pid,
    p_invite_code: code,
    p_unit_no: unit,
    p_language_pref: lang,
  });
  if (error) {
    logUnifiedPropertyEntryLine('enter_property_by_invite:rpc_error', { message: error.message, code: error.code });
  }
  return { data, error };
}

// --- tryAutoJoinProperty ----------------------------------------------------

export type TryAutoJoinPropertyInput = {
  propertyId: string;
  unitNo: string;
  currentUserId: string;
  currentUserEmail: string;
  languagePref?: 'en' | 'zh';
  /** Public `property_invite_codes` string when QR link includes a code (unit whitelist). */
  inviteCode?: string | null;
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

  const invite = (input.inviteCode ?? '').trim() || null;

  const { data, error } = invite
    ? await client.rpc('enter_property_by_invite', {
        p_property_id: pid,
        p_invite_code: invite,
        p_unit_no: unit || null,
        p_language_pref: lang,
      })
    : await client.rpc('try_auto_join_property_from_qr', {
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
  /** 部分 RPC / 历史返回使用 success 表示成功 */
  success?: boolean;
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
 * 管理端审批：RPC `approve_join_request`（业委会 gate + 委托 `approve_join_request_final`）。
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
