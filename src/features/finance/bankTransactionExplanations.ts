import { supabase } from '../../lib/supabase';

export type ExplanationStatus = 'pending' | 'responded' | 'closed';

export type BankTransactionExplanation = {
  id: string;
  bank_transaction_id: string;
  property_id: string;
  requested_by: string;
  requested_at: string;
  manager_response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  status: ExplanationStatus;
};

export type PaymentSummaryBucket = {
  count: number;
  total: number;
};

export type PendingExplanationAlert = {
  count: number;
  totalAmount: number;
};

export async function fetchExplanationsForProperty(
  propertyId: string,
): Promise<Record<string, BankTransactionExplanation>> {
  const { data, error } = await supabase
    .from('bank_transaction_explanations')
    .select(
      'id, bank_transaction_id, property_id, requested_by, requested_at, manager_response, responded_by, responded_at, status',
    )
    .eq('property_id', propertyId)
    .order('requested_at', { ascending: false });

  if (error || !data?.length) return {};

  const out: Record<string, BankTransactionExplanation> = {};
  for (const row of data) {
    const txId = row.bank_transaction_id as string;
    const existing = out[txId];
    if (!existing) {
      out[txId] = row as BankTransactionExplanation;
      continue;
    }
    const rank: Record<ExplanationStatus, number> = { pending: 3, responded: 2, closed: 1 };
    const cur = rank[(row.status as ExplanationStatus) ?? 'closed'];
    const prev = rank[existing.status];
    if (cur > prev) out[txId] = row as BankTransactionExplanation;
  }
  return out;
}

export async function fetchPendingExplanationAlert(
  propertyId: string,
): Promise<PendingExplanationAlert> {
  const { data, error } = await supabase
    .from('bank_transaction_explanations')
    .select('id, bank_transaction_id')
    .eq('property_id', propertyId)
    .eq('status', 'pending');

  if (error || !data?.length) {
    return { count: 0, totalAmount: 0 };
  }

  const txIds = data.map((r) => r.bank_transaction_id as string);
  const { data: txs } = await supabase
    .from('bank_transactions')
    .select('id, amount')
    .in('id', txIds);

  let totalAmount = 0;
  for (const tx of txs ?? []) {
    totalAmount += Math.abs(Number(tx.amount));
  }

  return { count: data.length, totalAmount };
}

export function computePaymentSummaries(
  rows: { amount: number; match_status?: string | null }[],
): {
  confirmed: PaymentSummaryBucket;
  suggested: PaymentSummaryBucket;
  unmatched: PaymentSummaryBucket;
} {
  const empty = (): PaymentSummaryBucket => ({ count: 0, total: 0 });
  const confirmed = empty();
  const suggested = empty();
  const unmatched = empty();

  for (const row of rows) {
    const amt = Number(row.amount);
    if (amt >= 0) continue;
    const abs = Math.abs(amt);
    const status = row.match_status ?? 'unmatched';
    if (status === 'confirmed') {
      confirmed.count += 1;
      confirmed.total += abs;
    } else if (status === 'suggested') {
      suggested.count += 1;
      suggested.total += abs;
    } else if (status === 'unmatched') {
      unmatched.count += 1;
      unmatched.total += abs;
    }
  }

  return { confirmed, suggested, unmatched };
}

export async function createExplanationRequest(opts: {
  bankTransactionId: string;
  propertyId: string;
  requestedBy: string;
}): Promise<{ explanation: BankTransactionExplanation | null; error: string | null }> {
  const { data, error } = await supabase
    .from('bank_transaction_explanations')
    .insert({
      bank_transaction_id: opts.bankTransactionId,
      property_id: opts.propertyId,
      requested_by: opts.requestedBy,
      status: 'pending',
    })
    .select(
      'id, bank_transaction_id, property_id, requested_by, requested_at, manager_response, responded_by, responded_at, status',
    )
    .single();

  if (error) {
    return { explanation: null, error: error.message };
  }
  return { explanation: data as BankTransactionExplanation, error: null };
}

export async function respondToExplanation(opts: {
  explanationId: string;
  managerResponse: string;
  respondedBy: string;
}): Promise<{ error: string | null }> {
  const text = opts.managerResponse.trim();
  if (!text) return { error: 'Response required' };

  const { error } = await supabase
    .from('bank_transaction_explanations')
    .update({
      manager_response: text,
      responded_by: opts.respondedBy,
      responded_at: new Date().toISOString(),
      status: 'responded',
    })
    .eq('id', opts.explanationId)
    .eq('status', 'pending');

  return { error: error?.message ?? null };
}

export async function closeExplanation(explanationId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('bank_transaction_explanations')
    .update({ status: 'closed' })
    .eq('id', explanationId)
    .eq('status', 'responded');

  return { error: error?.message ?? null };
}
