import { supabase } from '../../lib/supabase';
import type { NormalizedBankRow } from './bankCsvParser';

export type BankCsvImportResult = {
  batchId: string;
  total: number;
  imported: number;
  skipped: number;
  failed: number;
};

/** Import parsed CSV rows into bank_transactions with dedupe + batch tracking. */
export async function importBankCsvRows(opts: {
  propertyId: string;
  uploadedBy: string;
  fileName: string;
  sourceBank: string;
  rows: NormalizedBankRow[];
  parseErrorCount?: number;
}): Promise<{ result: BankCsvImportResult | null; error: string | null }> {
  const { propertyId, uploadedBy, fileName, sourceBank, rows, parseErrorCount = 0 } = opts;
  const total = rows.length + parseErrorCount;

  const { data: batch, error: batchError } = await supabase
    .from('bank_import_batches')
    .insert({
      property_id: propertyId,
      file_name: fileName,
      source_bank: sourceBank,
      uploaded_by: uploadedBy,
      total_rows: total,
      imported_rows: 0,
      failed_rows: parseErrorCount,
    })
    .select('id')
    .single();

  if (batchError || !batch?.id) {
    return { result: null, error: batchError?.message ?? 'Failed to create import batch' };
  }

  const batchId = batch.id as string;

  if (rows.length === 0) {
    await supabase
      .from('bank_import_batches')
      .update({ imported_rows: 0, failed_rows: parseErrorCount })
      .eq('id', batchId);

    return {
      result: { batchId, total, imported: 0, skipped: 0, failed: parseErrorCount },
      error: null,
    };
  }

  const payloads = rows.map((r) => ({
    property_id: propertyId,
    transaction_date: r.transaction_date,
    description: r.description,
    amount: r.amount,
    transaction_type: r.amount < 0 ? 'debit' : r.amount > 0 ? 'credit' : null,
    reference_number: r.reference_number,
    balance: r.balance,
    source_bank: r.source_bank,
    import_batch_id: batchId,
    uploaded_by: uploadedBy,
  }));

  // Insert in chunks; duplicates hit unique index — count individually for accurate skip stats.
  const CHUNK = 100;
  let imported = 0;
  let skipped = 0;
  let failed = parseErrorCount;

  for (let i = 0; i < payloads.length; i += CHUNK) {
    const chunk = payloads.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('bank_transactions')
      .upsert(chunk, {
        onConflict: 'property_id,transaction_date,amount,description',
        ignoreDuplicates: true,
      })
      .select('id');

    if (error) {
      // Fallback: row-by-row for partial success
      for (const row of chunk) {
        const { data: one, error: oneErr } = await supabase
          .from('bank_transactions')
          .upsert(row, {
            onConflict: 'property_id,transaction_date,amount,description',
            ignoreDuplicates: true,
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

  await supabase
    .from('bank_import_batches')
    .update({
      imported_rows: imported,
      failed_rows: failed,
    })
    .eq('id', batchId);

  return {
    result: { batchId, total, imported, skipped, failed },
    error: null,
  };
}
