import type { SupabaseClient } from '@supabase/supabase-js';

/** BCS3736 production property (fallback when caller omits `propertyId`). */
export const BCS3736_PROPERTY_ID = '497a907d-8df2-4e62-8859-66de6449c5c2';

export type PendingApplicant = {
  email: string;
  unit_no: string;
  name_en?: string | null;
  name_zh?: string | null;
  phone?: string | null;
  language_pref?: string | null;
};

export type ApprovePendingUserContext = {
  currentPropertyId: string | null | undefined;
  currentRole: string | null | undefined;
};

export type ApprovePendingUserInput = {
  /** Target auth user / profile id */
  userId: string;
  /** Defaults to `BCS3736_PROPERTY_ID` when omitted */
  propertyId?: string | null;
  applicant: PendingApplicant;
  context?: ApprovePendingUserContext;
};

export type ApprovePendingRpcRow = {
  ok?: boolean;
  error?: string;
  resident_outcome?: string;
  property_members_updated?: boolean;
  property_id?: string;
  user_id?: string;
  unit_no?: string;
};

function resolvePropertyId(propertyId?: string | null): string {
  const raw = (propertyId ?? '').trim();
  if (raw) return raw.toLowerCase();
  return BCS3736_PROPERTY_ID;
}

function normalizeLang(v: string | null | undefined): 'en' | 'zh' {
  return v != null && String(v).trim().toLowerCase() === 'zh' ? 'zh' : 'en';
}

/**
 * Server RPC: upserts `residents` then activates pending `property_members` (RLS-safe).
 * `upsertResidentForApprovedUser` / `upsertPropertyMemberForApprovedUser` delegate here — there is a single atomic RPC.
 */
export async function approvePendingUser(
  supabase: SupabaseClient,
  input: ApprovePendingUserInput,
): Promise<{ data: ApprovePendingRpcRow | null; error: Error | null }> {
  const propertyId = resolvePropertyId(input.propertyId ?? input.context?.currentPropertyId);
  const ctx = input.context;

  console.log('[approvePendingUser] currentPropertyId', ctx?.currentPropertyId ?? null);
  console.log('[approvePendingUser] currentRole', ctx?.currentRole ?? null);
  console.log('[approvePendingUser] approve target email', input.applicant.email);
  console.log('[approvePendingUser] resolved profile id (user_id)', input.userId);

  const { data, error } = await supabase.rpc('approve_pending_property_member_with_residents', {
    p_property_id: propertyId,
    p_user_id: input.userId,
    p_unit_no: input.applicant.unit_no?.trim() || null,
    p_name_en: input.applicant.name_en ?? null,
    p_name_zh: input.applicant.name_zh ?? null,
    p_phone: input.applicant.phone ?? null,
    p_language_pref: normalizeLang(input.applicant.language_pref ?? 'en'),
    p_email: input.applicant.email?.trim() || null,
  });

  const row = (data ?? null) as ApprovePendingRpcRow | null;

  if (error) {
    console.error('[approvePendingUser] final error', error);
    console.log('[approvePendingUser] resident upsert result', null);
    console.log('[approvePendingUser] property_member upsert result', null);
    return { data: row, error: error as Error };
  }

  if (!row?.ok) {
    const err = new Error(row?.error ?? 'approve_failed');
    console.error('[approvePendingUser] final error', row);
    console.log('[approvePendingUser] resident upsert result', row?.resident_outcome ?? null);
    console.log('[approvePendingUser] property_member upsert result', row?.property_members_updated ?? null);
    return { data: row, error: err };
  }

  console.log('[approvePendingUser] resident upsert result', row.resident_outcome ?? null);
  console.log('[approvePendingUser] property_member upsert result', row.property_members_updated ?? null);
  console.log('[approvePendingUser] final success', true);

  return { data: row, error: null };
}

/** @see approvePendingUser — single RPC covers residents + property_members */
export async function upsertResidentForApprovedUser(
  supabase: SupabaseClient,
  input: ApprovePendingUserInput,
): Promise<{ data: ApprovePendingRpcRow | null; error: Error | null }> {
  return approvePendingUser(supabase, input);
}

/** @see approvePendingUser — single RPC covers residents + property_members */
export async function upsertPropertyMemberForApprovedUser(
  supabase: SupabaseClient,
  input: ApprovePendingUserInput,
): Promise<{ data: ApprovePendingRpcRow | null; error: Error | null }> {
  return approvePendingUser(supabase, input);
}
