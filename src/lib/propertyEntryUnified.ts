/**
 * 统一入楼 — **提交与预检**层（`src/lib/unifiedPropertyEntry.ts` 为对外入口的补充）。
 *
 * - **提交**：`public.join_requests` 直接 INSERT；公开码 + `property_invite_codes` 命中后再 `enter_property_by_invite` 完成成员/住户绑定。
 * - **拒绝 pending**：`reject_join_request`（仅 `join_requests`）。
 * - **管理端通过**：`approve_join_request`（见 `unifiedPropertyEntry`）。
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserRole } from './supabase';
import { isSubmitJoinFailureKind, type UnifiedPropertyEntryResult, type SubmitUnifiedPropertyEntryResult } from './propertyEntryKinds';
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

function commonFailureFields(
  propertyId: string | null,
  inviteCode: string | null,
  unitNo: string | null,
  role: string | null,
) {
  return { propertyId, inviteCode, unitNo, role, membershipStatus: null as string | null };
}

function mapEnterJsonErrorToKind(err: string | undefined): UnifiedPropertyEntryResult['kind'] {
  if (!err) return 'rejected';
  if (err === 'invite_not_found' || err === 'invalid_arguments') return 'invalid_invite';
  if (err === 'not_authenticated') return 'auth_required';
  if (isSubmitJoinFailureKind(err)) return err;
  return 'rejected';
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

/** `?code=` on join / invite pages — merged for `join_requests.invite_code` attribution. */
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

async function resolvePropertyIdForSubmit(
  client: SupabaseClient,
  inputPropertyId: string | null,
  inviteCode: string | null,
): Promise<string | null> {
  const p0 = inputPropertyId?.trim() ?? '';
  if (p0) return p0;
  const c = inviteCode?.trim() ?? '';
  if (!c) return null;
  const { data, error } = await client.rpc('get_invite_preview', { invite_code: c });
  if (error || data == null) return null;
  const row = firstRpcJsonRow(data) ?? (data as Record<string, unknown>);
  const id = str(row.property_id);
  return id;
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
 * 统一入楼提交：`join_requests` 插入 +（公开码命中时）`enter_property_by_invite`。
 */
export async function submitUnifiedPropertyEntry(
  client: SupabaseClient,
  input: SubmitUnifiedPropertyEntryInput,
): Promise<SubmitUnifiedPropertyEntryResult> {
  const pInvite = mergeInviteCodeForRpc(input.p_invite_code);
  const inviteTrim = pInvite?.trim() ?? '';
  const unit = input.p_unit_number?.trim() || null;

  let pid = (await resolvePropertyIdForSubmit(client, input.p_property_id, pInvite)) ?? null;

  logUnifiedPropertyEntryLine('submit:start', {
    property_id: pid,
    unit_input: unit,
    user_id: input.userId,
    requested_role: input.p_requested_role,
  });

  if (!str(input.userId)) {
    return {
      kind: 'auth_required',
      message: 'Authentication required',
      ...commonFailureFields(pid, inviteTrim || null, unit, input.p_requested_role),
      raw: null,
    };
  }

  if (!pid) {
    return {
      kind: 'property_not_found',
      message: 'Property not found for this request',
      ...commonFailureFields(null, inviteTrim || null, unit, input.p_requested_role),
      raw: null,
    };
  }

  let isPublicCodeForProperty = false;
  if (inviteTrim) {
    const { data: pubRaw } = await client.rpc('resolve_public_invite_code', { p_code: inviteTrim });
    const pub = firstRpcJsonRow(pubRaw) ?? (pubRaw as Record<string, unknown> | null);
    const pPub = str(pub?.property_id);
    isPublicCodeForProperty = pub?.ok === true && pPub != null && pPub.toLowerCase() === pid.toLowerCase();
  }

  const shouldAutoApprove = Boolean(inviteTrim) && !input.p_direct_invite_id && isPublicCodeForProperty;
  const requestedRole = input.p_requested_role;

  const { data: pmEx } = await client
    .from('property_members')
    .select('property_id')
    .eq('property_id', pid)
    .eq('user_id', input.userId)
    .eq('status', 'active')
    .maybeSingle();
  if (pmEx) {
    const res: UnifiedPropertyEntryResult = {
      kind: 'already_member',
      propertyId: pid,
      inviteCode: inviteTrim || null,
      unitNo: unit,
      role: requestedRole,
      membershipStatus: 'active',
      message: null,
      raw: null,
    };
    logUnifiedPropertyEntryLine('submit:already_member', { property_id: pid, unit_input: unit });
    trackSubmitFunnelAfterParse(client, input, res, pInvite);
    return res;
  }

  const statusVal = shouldAutoApprove ? 'approved' : 'pending';

  const row: Record<string, unknown> = {
    property_id: pid,
    user_id: input.userId,
    full_name: input.p_full_name?.trim() || null,
    email: input.p_email?.trim().toLowerCase() || null,
    phone: input.p_phone?.trim() || null,
    unit_number: unit,
    requested_role: requestedRole,
    status: statusVal,
    note: input.p_note?.trim() || null,
    direct_invite_id: input.p_direct_invite_id?.trim() || null,
    inferred_role: input.p_inferred_role?.trim() || null,
    inferred_unit_number: input.p_inferred_unit_number?.trim() || null,
  };
  if (inviteTrim) row.invite_code = inviteTrim;

  console.log('[property-entry-unified:submit:insert_payload]', row);

  const { data, error } = await client.from('join_requests').insert([row]).select().single();

  if (error) {
    console.error('[property-entry-unified:submit:insert_error]', error);
    const dup =
      error.code === '23505' ||
      (error.message ?? '').toLowerCase().includes('duplicate') ||
      (error.message ?? '').includes('uniq_pending');
    if (dup) {
      return {
        kind: 'duplicate_pending',
        message: 'Duplicate pending',
        propertyId: pid,
        inviteCode: inviteTrim || null,
        unitNo: unit,
        role: requestedRole,
        membershipStatus: null,
        raw: null,
      } as UnifiedPropertyEntryResult;
    }
    return {
      kind: 'rpc_error',
      message: error.message,
      propertyId: pid,
      inviteCode: inviteTrim || null,
      unitNo: unit,
      role: requestedRole,
      membershipStatus: null,
      raw: {
        ok: false,
        kind: 'insert_error',
        source: 'join_requests_insert',
        supabase: error,
      },
      transportError: { message: error.message, code: error.code },
    };
  }

  console.log('[property-entry-unified:submit:insert_result]', data);

  const d = data as {
    id?: string;
    property_id?: string;
    invite_code?: string | null;
    unit_number?: string | null;
    requested_role?: string | null;
  };

  const localResult = {
    ok: true,
    kind: (shouldAutoApprove ? 'approved' : 'pending_created') as 'approved' | 'pending_created',
    propertyId: d.property_id ?? pid,
    requestId: d.id ?? null,
    inviteCode: (d.invite_code ?? inviteTrim) || null,
    unitNo: d.unit_number ?? unit,
    role: d.requested_role ?? requestedRole,
    membershipStatus: (shouldAutoApprove ? 'active' : 'pending') as 'active' | 'pending',
  };
  console.log('[property-entry-unified:submit:local_result]', localResult);

  logPropertyEntrySubmitResult({
    userId: input.userId,
    email: input.p_email,
    propertyId: pid,
    unitNo: unit,
    data: { ...localResult, row: d },
    error: null,
  });

  if (shouldAutoApprove && inviteTrim) {
    const lang = input.p_language_pref === 'zh' ? 'zh' : 'en';
    const { data: entData, error: entErr } = await client.rpc('enter_property_by_invite', {
      p_property_id: pid,
      p_invite_code: inviteTrim,
      p_unit_no: unit,
      p_language_pref: lang,
    });

    if (entErr) {
      logUnifiedPropertyEntryLine('submit:enter_by_invite_error', { message: entErr.message, code: entErr.code });
      return {
        kind: 'rpc_error',
        message: entErr.message,
        propertyId: pid,
        inviteCode: inviteTrim,
        unitNo: unit,
        role: requestedRole,
        membershipStatus: null,
        raw: { insert: data, enter: null, enterError: entErr },
        transportError: { message: entErr.message, code: entErr.code },
      };
    }

    const ent = firstRpcJsonRow(entData) as { ok?: boolean; error?: string; message?: string } | null;
    if (ent == null || ent.ok !== true) {
      const ek = mapEnterJsonErrorToKind(ent?.error);
      logUnifiedPropertyEntryLine('submit:enter_by_invite_business_error', { error: ent?.error, ent });
      return {
        kind: ek,
        message: ent?.message ?? ent?.error ?? 'enter_property_by_invite failed',
        propertyId: pid,
        inviteCode: inviteTrim,
        unitNo: unit,
        role: requestedRole,
        membershipStatus: null,
        raw: { insert: data, enter: entData },
      } as UnifiedPropertyEntryResult;
    }
    logUnifiedPropertyEntryLine('submit:auto_join_passed', { property_id: pid, unit_input: unit });
  } else {
    logUnifiedPropertyEntryLine('submit:pending_created', {
      property_id: pid,
      unit_input: unit,
      join_request_id: d.id ?? null,
    });
  }

  const out: UnifiedPropertyEntryResult = shouldAutoApprove
    ? {
        kind: 'auto_approved',
        propertyId: pid,
        inviteCode: inviteTrim || null,
        unitNo: (d.unit_number as string | null) ?? unit,
        role: (d.requested_role as string | null) ?? requestedRole,
        membershipStatus: 'active',
        message: null,
        raw: { insert: data, local: localResult },
      }
    : {
        kind: 'pending_submitted',
        propertyId: pid,
        requestId: d.id ?? null,
        inviteCode: inviteTrim || null,
        unitNo: (d.unit_number as string | null) ?? unit,
        role: (d.requested_role as string | null) ?? requestedRole,
        message: null,
        raw: { insert: data, local: localResult },
      };

  trackSubmitFunnelAfterParse(client, input, out, pInvite);
  return out;
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
