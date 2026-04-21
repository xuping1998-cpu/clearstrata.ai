import type { SupabaseClient } from '@supabase/supabase-js';

export type PropertyEntryEventType =
  | 'opened'
  | 'auth_ok'
  | 'submitted'
  | 'approved'
  | 'auto_approved';

export type TrackPropertyEntryEventInput = {
  propertyId: string;
  inviteCode?: string | null;
  source?: string | null;
  eventType: PropertyEntryEventType;
  userId?: string | null;
  requestId?: string | null;
};

/**
 * Best-effort funnel row; failures must not block the main flow.
 */
export async function trackPropertyEntryEvent(
  client: SupabaseClient,
  input: TrackPropertyEntryEventInput,
): Promise<void> {
  const pid = input.propertyId?.trim();
  if (!pid) return;
  try {
    const { error } = await client.from('property_entry_events').insert({
      property_id: pid,
      invite_code: input.inviteCode ?? null,
      source: input.source ?? null,
      event_type: input.eventType,
      user_id: input.userId ?? null,
      request_id: input.requestId ?? null,
    });
    if (error) console.warn('[property_entry_events]', error.message);
  } catch (e) {
    console.warn('[property_entry_events]', e);
  }
}
