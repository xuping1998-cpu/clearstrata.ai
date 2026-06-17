import { supabase } from '../../lib/supabase';

export type BankTransactionUpsertRow = {
  property_id: string;
  transaction_date: string;
  description: string;
  amount: number;
  transaction_type?: string | null;
  reference_number?: string | null;
  balance?: number | null;
  source_bank?: string | null;
  import_batch_id?: string | null;
  uploaded_by?: string | null;
  statement_line_no?: number | null;
};

/** Upsert bank rows; on dedupe conflict updates statement_line_no, balance, source_bank, import_batch_id. */
export async function upsertBankTransactionRows(
  rows: BankTransactionUpsertRow[],
): Promise<{ imported: number; skipped: number; failed: number }> {
  const CHUNK = 100;
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('bank_transactions')
      .upsert(chunk, {
        onConflict: 'property_id,transaction_date,amount,description',
      })
      .select('id');

    if (error) {
      for (const row of chunk) {
        const { data: one, error: oneErr } = await supabase
          .from('bank_transactions')
          .upsert(row, {
            onConflict: 'property_id,transaction_date,amount,description',
          })
          .select('id');
        if (oneErr) {
          if (oneErr.code === '23505') skipped++;
          else failed++;
        } else if (one && one.length > 0) {
          imported++;
        } else {
          skipped++;
        }
      }
    } else {
      const n = data?.length ?? 0;
      imported += n;
      skipped += chunk.length - n;
    }
  }

  return { imported, skipped, failed };
}
