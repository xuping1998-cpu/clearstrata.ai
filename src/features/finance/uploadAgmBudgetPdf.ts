import { supabase } from '../../lib/supabase';
import { buildAgmBudgetStoragePath } from './agmBudgetDocuments';

export type AgmBudgetUploadResult = {
  documentId: string;
  storagePath: string;
};

/** Upload AGM budget PDF to storage and record document as pending_parse. */
export async function uploadAgmBudgetPdf(opts: {
  propertyId: string;
  createdBy: string;
  file: File;
}): Promise<{ result: AgmBudgetUploadResult | null; error: string | null }> {
  const { propertyId, createdBy, file } = opts;
  const storagePath = buildAgmBudgetStoragePath(propertyId, file.name);

  const { error: uploadError } = await supabase.storage.from('documents').upload(storagePath, file, {
    contentType: file.type || 'application/pdf',
    upsert: false,
  });

  if (uploadError) {
    return { result: null, error: uploadError.message };
  }

  const { data: doc, error: docError } = await supabase
    .from('agm_budget_documents')
    .insert({
      property_id: propertyId,
      file_name: file.name,
      storage_path: storagePath,
      status: 'pending_parse',
      created_by: createdBy,
    })
    .select('id')
    .single();

  if (docError || !doc?.id) {
    await supabase.storage.from('documents').remove([storagePath]);
    return { result: null, error: docError?.message ?? 'Failed to save document record' };
  }

  return {
    result: { documentId: doc.id as string, storagePath },
    error: null,
  };
}
