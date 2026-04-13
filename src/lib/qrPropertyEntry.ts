/**
 * 扫码进楼：先 RPC `try_auto_join_property_from_qr`（白名单房号自动绑定），
 * 失败则走统一 `submit_join_request`（与现有 join_requests 审核流一致）。
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserRole } from './supabase';
import {
  submitUnifiedPropertyEntry,
  type SubmitUnifiedPropertyEntryResult,
} from './propertyEntryUnified';
import { logUnifiedPropertyEntryLine } from './propertyEntryGateLog';

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

function rpcOk(data: unknown): boolean {
  const row = data as { ok?: boolean; success?: boolean } | null;
  return row != null && (row.ok === true || row.success === true);
}

function rpcError(data: unknown): string | undefined {
  return (data as { error?: string } | null)?.error;
}

/**
 * 扫码自动进楼：依赖库内 `try_auto_join_property_from_qr` → `bind_resident_by_unit`（房号在白名单、未绑他人）。
 */
export async function tryAutoJoinProperty(
  client: SupabaseClient,
  input: TryAutoJoinPropertyInput,
): Promise<TryAutoJoinPropertyResult> {
  const pid = input.propertyId?.trim() ?? '';
  const unit = input.unitNo?.trim() ?? '';
  const lang = input.languagePref === 'zh' ? 'zh' : 'en';

  logUnifiedPropertyEntryLine('qr_try_auto_join:start', {
    property_id: pid,
    unit_input: unit,
    current_user_id: input.currentUserId,
    current_user_email: input.currentUserEmail,
  });

  if (!pid || !unit) {
    logUnifiedPropertyEntryLine('qr_try_auto_join:failed', {
      property_id: pid,
      unit_input: unit,
      failure_reason: 'invalid_input',
    });
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
    logUnifiedPropertyEntryLine('qr_try_auto_join:failed', {
      property_id: pid,
      unit_input: unit,
      failure_reason: 'rpc_error',
      message: error.message,
      code: error.code,
    });
    return {
      ok: false,
      reason: 'rpc_error',
      message: error.message,
      raw: data,
    };
  }

  if (!rpcOk(data)) {
    const err = rpcError(data);
    const row = data as { message?: string; message_zh?: string } | null;
    logUnifiedPropertyEntryLine('qr_try_auto_join:failed', {
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
  logUnifiedPropertyEntryLine('qr_try_auto_join:passed', {
    property_id: row?.property_id ?? pid,
    unit_input: unit,
    current_user_id: input.currentUserId,
    current_user_email: input.currentUserEmail,
    auto_join_passed: true,
    residents_update_result: row?.resident_id ?? row?.unit_no ?? null,
    property_members_upsert_result: row?.property_members_after ?? row?.property_members_present ?? null,
  });

  return {
    ok: true,
    propertyId: (row?.property_id as string) ?? pid,
    raw: data,
    residentsUpdateResult: row?.resident_id ?? null,
    propertyMembersUpsertResult: row?.property_members_after ?? row?.property_members_present ?? null,
  };
}

export type CreatePendingJoinRequestInput = {
  userId: string;
  propertyId: string;
  unitNo: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  languagePref: 'en' | 'zh';
};

/**
 * 自动进楼失败后写入现有 `join_requests` pending（内部为 `submit_join_request`，与审核流统一）。
 */
export async function createPendingJoinRequest(
  client: SupabaseClient,
  input: CreatePendingJoinRequestInput,
): Promise<SubmitUnifiedPropertyEntryResult> {
  const pid = input.propertyId?.trim() ?? '';
  const unit = input.unitNo?.trim() || null;
  const email = input.email?.trim().toLowerCase() || null;

  logUnifiedPropertyEntryLine('qr_create_pending:start', {
    property_id: pid,
    unit_input: unit,
    current_user_id: input.userId,
    current_user_email: email,
  });

  const result = await submitUnifiedPropertyEntry(client, {
    userId: input.userId,
    p_property_id: pid,
    p_requested_role: 'owner' as UserRole,
    p_unit_number: unit,
    p_note: 'source=qr_entry',
    p_full_name: input.fullName?.trim() || null,
    p_email: email,
    p_phone: input.phone?.trim() || null,
    p_invite_code: null,
    p_direct_invite_id: null,
    p_inferred_role: null,
    p_inferred_unit_number: null,
    p_move_in_date: null,
    p_language_pref: input.languagePref,
  });

  if (result.kind === 'pending_submitted') {
    logUnifiedPropertyEntryLine('qr_create_pending:created', {
      property_id: pid,
      unit_input: unit,
      pending_created: true,
      join_request_id: result.joinRequestId,
    });
  } else if (result.kind === 'auto_approved') {
    logUnifiedPropertyEntryLine('qr_create_pending:unexpected_auto', { property_id: pid, raw: result.raw });
  } else {
    logUnifiedPropertyEntryLine('qr_create_pending:result', {
      property_id: pid,
      unit_input: unit,
      outcome: result.kind,
      raw: 'raw' in result ? result.raw : null,
    });
  }

  return result;
}
