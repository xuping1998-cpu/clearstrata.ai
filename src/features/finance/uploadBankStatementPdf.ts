import { supabase } from '../../lib/supabase';
import { buildBankStatementStoragePath } from './bankImportBatches';

export type BankPdfUploadResult = {
  batchId: string;
  filePath: string;
};

/** Upload PDF bank statement to storage and record batch as pending_parse (no OCR this phase). */
export async function uploadBankStatementPdf(opts: {
  propertyId: string;
  uploadedBy: string;
  file: File;
}): Promise<{ result: BankPdfUploadResult | null; error: string | null }> {
  const { propertyId, uploadedBy, file } = opts;
  const filePath = buildBankStatementStoragePath(propertyId, file.name);

  const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file, {
    contentType: file.type || 'application/pdf',
    upsert: false,
  });

  if (uploadError) {
    return {
      result: null,
      error: uploadError.message,
    };
  }

  const { data: batch, error: batchError } = await supabase
    .from('bank_import_batches')
    .insert({
      property_id: propertyId,
      file_name: file.name,
      source_bank: 'PDF Statement',
      uploaded_by: uploadedBy,
      file_path: filePath,
      file_type: 'pdf',
      status: 'pending_parse',
      total_rows: 0,
      imported_rows: 0,
      failed_rows: 0,
      notes: null,
    })
    .select('id')
    .single();

  if (batchError || !batch?.id) {
    await supabase.storage.from('documents').remove([filePath]);
    return {
      result: null,
      error: batchError?.message ?? 'Failed to save import batch record',
    };
  }

  return {
    result: { batchId: batch.id as string, filePath },
    error: null,
  };
}
