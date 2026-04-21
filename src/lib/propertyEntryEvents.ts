import type { SupabaseClient } from '@supabase/supabase-js';

export type TrackPropertyEntryEventInput = {
  propertyId?: string | null;
  inviteCode?: string | null;
  source?: string | null;
  eventType: string;
  resultKind?: string | null;
  unitNo?: string | null;
  role?: string | null;
  requestId?: string | null;
  membershipStatus?: string | null;
  meta?: Record<string, unknown>;
};

/**
 * 邀请码 / 入楼漏斗事件（`property_entry_events`）。失败不抛错、不阻塞主流程。
 */
export async function trackPropertyEntryEvent(
  client: SupabaseClient,
  input: TrackPropertyEntryEventInput,
): Promise<void> {
  try {
    const pid = input.propertyId?.trim() || null;
    const { error } = await client.rpc('track_property_entry_event', {
      p_property_id: pid,
      p_invite_code: input.inviteCode?.trim() || null,
      p_source: input.source?.trim() || null,
      p_event_type: input.eventType,
      p_result_kind: input.resultKind ?? null,
      p_unit_no: input.unitNo ?? null,
      p_role: input.role ?? null,
      p_request_id: input.requestId ?? null,
      p_membership_status: input.membershipStatus ?? null,
      p_meta: (input.meta ?? {}) as Record<string, unknown>,
    });
    if (error) {
      console.warn('[property-entry-events]', error.message);
    }
  } catch (e) {
    console.warn('[property-entry-events]', e);
  }
}
