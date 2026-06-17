import { supabase } from '../../lib/supabase';

export type ParsedBankStatementTransaction = {
  transaction_date: string | null;
  description: string;
  amount: number | null;
  balance: number | null;
  reference_number: string | null;
};

export type ParsedBankStatement = {
  statement_date: string | null;
  account_name: string | null;
  account_number_masked: string | null;
  opening_balance: number | null;
  closing_balance: number | null;
  currency: string | null;
  source_bank: string | null;
  confidence: number | null;
  transactions: ParsedBankStatementTransaction[];
};

export type BankStatementParseResult = {
  imported: number;
  skipped: number;
  total: number;
};

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(blob);
  });
}

async function markBatchFailed(batchId: string, notes: string): Promise<void> {
  await supabase
    .from('bank_import_batches')
    .update({ status: 'parse_failed', notes: notes.slice(0, 500) })
    .eq('id', batchId);
}

async function invokeBankStatementParse(
  fileBase64: string,
  fileName: string,
): Promise<{ statement: ParsedBankStatement | null; error: string | null }> {
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bank-statement-parse`;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileBase64,
      mimeType: 'application/pdf',
      filename: fileName || 'statement.pdf',
    }),
  });

  const json = await response.json();

  if (!response.ok || json?.success === false) {
    return {
      statement: null,
      error: String(json?.error ?? `Parse failed (${response.status})`),
    };
  }

  const statement = json.statement as ParsedBankStatement | undefined;
  if (!statement?.transactions?.length) {
    return { statement: null, error: 'No transactions extracted' };
  }

  return { statement, error: null };
}

function isValidDateString(d: string | null): d is string {
  return Boolean(d && /^\d{4}-\d{2}-\d{2}$/.test(d));
}

/** Download archived PDF, AI-parse, insert bank_transactions, update batch. */
export async function parseBankStatementPdfBatch(opts: {
  batchId: string;
  propertyId: string;
  uploadedBy: string;
  filePath: string;
  fileName: string;
  languageEn?: boolean;
}): Promise<{ result: BankStatementParseResult | null; error: string | null }> {
  const { batchId, propertyId, uploadedBy, filePath, fileName, languageEn = true } = opts;
  const en = languageEn;

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from('documents')
    .download(filePath);

  if (downloadError || !fileBlob) {
    const msg = en ? 'Unable to read bank statement.' : '无法读取银行月结单。';
    await markBatchFailed(batchId, downloadError?.message ?? msg);
    return { result: null, error: msg };
  }

  let fileBase64: string;
  try {
    fileBase64 = await blobToBase64(fileBlob);
  } catch {
    const msg = en ? 'Unable to read bank statement.' : '无法读取银行月结单。';
    await markBatchFailed(batchId, msg);
    return { result: null, error: msg };
  }

  const { statement, error: aiError } = await invokeBankStatementParse(fileBase64, fileName);
  if (!statement || aiError) {
    const msg = en ? 'Bank statement parsing failed.' : '银行月结单解析失败。';
    await markBatchFailed(batchId, aiError ?? msg);
    return { result: null, error: msg };
  }

  const sourceBank = statement.source_bank?.trim() || 'PDF Statement';
  const validRows = statement.transactions.filter(
    (t) =>
      isValidDateString(t.transaction_date) &&
      t.description.trim().length > 0 &&
      t.amount != null &&
      Number.isFinite(t.amount),
  );

  if (validRows.length === 0) {
    const msg = en ? 'Bank statement parsing failed.' : '银行月结单解析失败。';
    await markBatchFailed(batchId, 'No valid transaction rows after validation');
    return { result: null, error: msg };
  }

  const payloads = validRows.map((t) => ({
    property_id: propertyId,
    transaction_date: t.transaction_date!,
    description: t.description.trim(),
    amount: t.amount!,
    transaction_type: t.amount! < 0 ? 'debit' : t.amount! > 0 ? 'credit' : null,
    reference_number: t.reference_number,
    balance: t.balance,
    source_bank: sourceBank,
    import_batch_id: batchId,
    uploaded_by: uploadedBy,
  }));

  const CHUNK = 100;
  let imported = 0;
  let skipped = 0;
  let failed = 0;

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

  if (imported === 0 && failed > 0) {
    const msg = en ? 'Failed to save bank transactions.' : '银行流水保存失败。';
    await markBatchFailed(batchId, `DB insert failed (${failed} rows)`);
    return { result: null, error: msg };
  }

  const { error: batchUpdateError } = await supabase
    .from('bank_import_batches')
    .update({
      status: 'imported',
      source_bank: sourceBank,
      total_rows: validRows.length,
      imported_rows: imported,
      failed_rows: skipped + failed + (statement.transactions.length - validRows.length),
      notes: 'AI parsed successfully',
    })
    .eq('id', batchId);

  if (batchUpdateError) {
    const msg = en ? 'Failed to save bank transactions.' : '银行流水保存失败。';
    await markBatchFailed(batchId, batchUpdateError.message);
    return { result: null, error: msg };
  }

  return {
    result: {
      imported,
      skipped,
      total: validRows.length,
    },
    error: null,
  };
}
