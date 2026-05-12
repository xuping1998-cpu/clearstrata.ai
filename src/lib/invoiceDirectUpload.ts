import { supabase } from './supabase';

const ALLOWED_EXT = /\.(pdf|jpe?g|png)$/i;

export function isAllowedInvoiceUploadFile(file: File): boolean {
  if (ALLOWED_EXT.test(file.name)) return true;
  const t = (file.type || '').toLowerCase();
  return (
    t === 'application/pdf' ||
    t === 'image/jpeg' ||
    t === 'image/jpg' ||
    t === 'image/png'
  );
}

/**
 * Upload invoice file to storage and insert a `pending_review` row without OCR / AI extraction.
 * Users edit fields manually or run AI assist from the AI Review tab.
 */
export async function uploadInvoiceDocumentDirect(opts: {
  file: File;
  profileId: string;
  propertyId: string;
  accountingYear: number;
  accountingMonth: number;
  langEn: boolean;
}): Promise<{ invoiceId: string }> {
  const { file, profileId, propertyId, accountingYear, accountingMonth, langEn } = opts;

  if (!isAllowedInvoiceUploadFile(file)) {
    throw new Error(
      langEn ? 'Please upload a PDF, JPG, or PNG file.' : '请上传 PDF、JPG 或 PNG 格式的文件。',
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const fiscalYear = parseInt(String(today).slice(0, 4), 10) || new Date().getFullYear();

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `invoices/${fileName}`;

  const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
  if (uploadError) throw uploadError;

  const { data: pub } = supabase.storage.from('documents').getPublicUrl(filePath);

  const { data: insertedInvoice, error: dbError } = await supabase
    .from('invoices')
    .insert({
      property_id: propertyId,
      file_name: file.name,
      document_url: pub.publicUrl,
      vendor_name: langEn ? 'Pending manual entry' : '待手工填写',
      invoice_number: null,
      invoice_date: today,
      due_date: null,
      subtotal: 0,
      tax_amount: 0,
      total_amount: 0,
      hst_number: null,
      currency: 'CAD',
      category: 'general',
      notes: null,
      has_anomalies: false,
      ai_extracted_data: null,
      ai_confidence_score: null,
      uploaded_by: profileId,
      status: 'pending_review',
      fiscal_year: fiscalYear,
      accounting_year: accountingYear,
      accounting_month: accountingMonth,
    })
    .select('id')
    .single();

  if (dbError) throw dbError;

  const invoiceId = (insertedInvoice as { id: string } | null)?.id;
  if (!invoiceId) {
    throw new Error(langEn ? 'Missing invoice id after insert' : '发票保存后缺少 invoice_id');
  }

  return { invoiceId };
}
