import { supabase } from '../../lib/supabase';

export type BankMatchStatus = 'unmatched' | 'suggested' | 'confirmed' | 'rejected';

export type MatchedInvoiceLite = {
  id: string;
  vendor_name: string;
  total_amount: number;
  invoice_date: string;
  invoice_number: string | null;
};

export type BankTransactionWithMatch = {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  balance: number | null;
  source_bank: string | null;
  created_at?: string | null;
  match_status: string | null;
  match_confidence: number | null;
  match_reason: string | null;
  matched_invoice_id: string | null;
  matched_invoice?: MatchedInvoiceLite | null;
};

export type InvoiceBankPaymentLink = {
  bankTransactionId: string;
  transactionDate: string;
  description: string;
  amount: number;
  matchStatus: BankMatchStatus;
  matchConfidence: number | null;
};

export async function generateBankInvoiceSuggestions(
  propertyId: string,
): Promise<{ count: number; error: string | null }> {
  const { data, error } = await supabase.rpc('generate_bank_invoice_suggestions', {
    p_property_id: propertyId,
  });
  if (error) return { count: 0, error: error.message };
  return { count: typeof data === 'number' ? data : Number(data ?? 0), error: null };
}

export async function confirmBankInvoiceMatch(
  bankTransactionId: string,
  invoiceId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('confirm_bank_invoice_match', {
    p_bank_transaction_id: bankTransactionId,
    p_invoice_id: invoiceId,
  });
  return { error: error?.message ?? null };
}

export async function rejectBankInvoiceMatch(
  bankTransactionId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('reject_bank_invoice_match', {
    p_bank_transaction_id: bankTransactionId,
  });
  return { error: error?.message ?? null };
}

export async function fetchBankTransactionsWithMatches(
  propertyId: string,
  dateStart: string,
  dateEnd: string,
): Promise<BankTransactionWithMatch[]> {
  const { data, error } = await supabase
    .from('bank_transactions')
    .select(
      'id, transaction_date, description, amount, balance, source_bank, created_at, match_status, match_confidence, match_reason, matched_invoice_id',
    )
    .eq('property_id', propertyId)
    .gte('transaction_date', dateStart)
    .lte('transaction_date', dateEnd)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error || !data?.length) return [];

  const rows = data as BankTransactionWithMatch[];
  const invoiceIds = [
    ...new Set(rows.map((r) => r.matched_invoice_id).filter((id): id is string => Boolean(id))),
  ];

  if (invoiceIds.length === 0) return rows;

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, vendor_name, total_amount, invoice_date, invoice_number')
    .in('id', invoiceIds);

  const invMap = new Map((invoices ?? []).map((i) => [i.id as string, i as MatchedInvoiceLite]));

  return rows.map((r) => ({
    ...r,
    matched_invoice: r.matched_invoice_id ? invMap.get(r.matched_invoice_id) ?? null : null,
  }));
}

export async function fetchInvoiceBankPaymentLinks(
  propertyId: string,
): Promise<Record<string, InvoiceBankPaymentLink>> {
  const { data, error } = await supabase
    .from('bank_transactions')
    .select(
      'id, transaction_date, description, amount, match_status, match_confidence, matched_invoice_id',
    )
    .eq('property_id', propertyId)
    .not('matched_invoice_id', 'is', null)
    .in('match_status', ['suggested', 'confirmed']);

  if (error || !data?.length) return {};

  const out: Record<string, InvoiceBankPaymentLink> = {};
  const priority: Record<string, number> = { confirmed: 2, suggested: 1 };

  for (const row of data) {
    const invId = row.matched_invoice_id as string;
    const status = (row.match_status ?? 'unmatched') as BankMatchStatus;
    const link: InvoiceBankPaymentLink = {
      bankTransactionId: row.id as string,
      transactionDate: row.transaction_date as string,
      description: row.description as string,
      amount: Number(row.amount),
      matchStatus: status,
      matchConfidence: row.match_confidence != null ? Number(row.match_confidence) : null,
    };
    const existing = out[invId];
    if (!existing || (priority[status] ?? 0) > (priority[existing.matchStatus] ?? 0)) {
      out[invId] = link;
    }
  }

  return out;
}

export function formatBankMatchMoney(n: number): string {
  return `$${Math.abs(n).toFixed(2)}`;
}

export function formatBankMatchDate(iso: string, en: boolean): string {
  return new Date(iso + (iso.includes('T') ? '' : 'T12:00:00')).toLocaleDateString(
    en ? 'en-CA' : 'zh-CN',
  );
}
