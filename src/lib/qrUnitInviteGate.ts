import type { SupabaseClient } from '@supabase/supabase-js';

/** Server-side whitelist / invite-code gate for QR (`check_qr_unit_invite_gate`). */
export async function checkQrUnitInviteGate(
  client: SupabaseClient,
  params: { propertyId: string; unitNo: string; inviteCode: string | null },
) {
  return client.rpc('check_qr_unit_invite_gate', {
    p_property_id: params.propertyId,
    p_unit_no: params.unitNo.trim(),
    p_invite_code: params.inviteCode?.trim() || null,
  });
}
