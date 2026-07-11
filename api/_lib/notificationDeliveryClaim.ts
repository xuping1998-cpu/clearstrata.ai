/**
 * BF-001: minimal atomic delivery claim for one-time notification emails.
 * Currently backed by public.sgm_pause_email_deliveries + claim_sgm_pause_email_delivery RPC.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type DeliveryClaimInput = {
  meetingId: string;
  propertyId: string;
  userId: string;
  email: string;
  attemptNo?: number;
  maxAttempts?: number;
};

export type DeliveryClaimSkipReason = 'already_claimed' | 'already_sent' | 'max_attempts';

export type DeliveryClaimResult =
  | {
      claimed: true;
      deliveryId: string;
      attemptNo: number;
    }
  | {
      claimed: false;
      reason: DeliveryClaimSkipReason;
    };

type ClaimRpcRow = {
  claimed?: boolean;
  deliveryId?: string;
  attemptNo?: number;
  reason?: string;
};

export function logSgmPauseDeliveryClaimed(fields: {
  meetingId: string;
  propertyId: string;
  userId: string;
  attemptNo: number;
  deliveryId: string;
}): void {
  console.log(
    'SGM_PAUSE_DELIVERY_CLAIMED',
    JSON.stringify({
      meetingId: fields.meetingId,
      propertyId: fields.propertyId,
      userId: fields.userId,
      attemptNo: fields.attemptNo,
      deliveryId: fields.deliveryId,
    }),
  );
}

export function logSgmPauseDeliverySkipped(fields: {
  meetingId: string;
  userId: string;
  reason: DeliveryClaimSkipReason;
}): void {
  console.log(
    'SGM_PAUSE_DELIVERY_SKIPPED',
    JSON.stringify({
      meetingId: fields.meetingId,
      userId: fields.userId,
      reason: fields.reason,
    }),
  );
}

export function logSgmPauseDeliverySent(fields: {
  meetingId: string;
  userId: string;
  deliveryId: string;
}): void {
  console.log(
    'SGM_PAUSE_DELIVERY_SENT',
    JSON.stringify({
      meetingId: fields.meetingId,
      userId: fields.userId,
      deliveryId: fields.deliveryId,
    }),
  );
}

export function logSgmPauseDeliveryFailed(fields: {
  meetingId: string;
  userId: string;
  deliveryId: string;
  error: string;
}): void {
  console.log(
    'SGM_PAUSE_DELIVERY_FAILED',
    JSON.stringify({
      meetingId: fields.meetingId,
      userId: fields.userId,
      deliveryId: fields.deliveryId,
      error: fields.error,
    }),
  );
}

function parseSkipReason(raw: string | undefined): DeliveryClaimSkipReason {
  if (raw === 'already_sent' || raw === 'max_attempts') return raw;
  return 'already_claimed';
}

export async function claimSgmPauseDelivery(
  admin: SupabaseClient,
  input: DeliveryClaimInput,
): Promise<DeliveryClaimResult> {
  const maxAttempts = input.maxAttempts ?? 3;
  const { data, error } = await admin.rpc('claim_sgm_pause_email_delivery', {
    p_meeting_id: input.meetingId,
    p_property_id: input.propertyId,
    p_user_id: input.userId,
    p_email: input.email,
    p_max_attempts: maxAttempts,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = (Array.isArray(data) ? data[0] : data) as ClaimRpcRow | null;
  if (!row || row.claimed !== true) {
    return {
      claimed: false,
      reason: parseSkipReason(row?.reason),
    };
  }

  const deliveryId = String(row.deliveryId ?? '').trim();
  const attemptNo = Number(row.attemptNo ?? 0);
  if (!deliveryId || !Number.isFinite(attemptNo) || attemptNo < 1) {
    throw new Error('claim_sgm_pause_email_delivery returned invalid payload');
  }

  return { claimed: true, deliveryId, attemptNo };
}

export async function markSgmPauseDeliverySent(
  admin: SupabaseClient,
  deliveryId: string,
): Promise<void> {
  const { error } = await admin
    .from('sgm_pause_email_deliveries')
    .update({ status: 'sent', error_message: null })
    .eq('id', deliveryId)
    .eq('status', 'sending');

  if (error) {
    throw new Error(error.message);
  }
}

export async function markSgmPauseDeliveryFailed(
  admin: SupabaseClient,
  deliveryId: string,
  errorMessage: string,
): Promise<void> {
  const { error } = await admin
    .from('sgm_pause_email_deliveries')
    .update({ status: 'failed', error_message: errorMessage })
    .eq('id', deliveryId)
    .eq('status', 'sending');

  if (error) {
    throw new Error(error.message);
  }
}
