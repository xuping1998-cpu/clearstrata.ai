import { supabase } from './supabase';
import { sanitizeDbText } from './invoiceJsonSanitize';

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

function draftNeedsDetailsVendor(langEn: boolean): string {
  return langEn ? 'Needs details' : '待补充信息';
}

export type InvoiceDirectUploadOutcome = 'pending_review' | 'draft_manual';

/**
 * Single invoice: Storage → insert `draft_manual` row (file archived).
 * OCR pre-fill is a separate optional action (see AI Extract in invoice detail).
 * Does **not** run AI audit workflow (budget / duplicate scan / anomalies).
 */
export async function uploadInvoiceDocumentDirect(opts: {
  file: File;
  profileId: string;
  propertyId: string;
  accountingYear: number;
  accountingMonth: number;
  langEn: boolean;
}): Promise<{ invoiceId: string; status: InvoiceDirectUploadOutcome }> {
  const { file, profileId, propertyId, accountingYear, accountingMonth, langEn } = opts;

  if (!isAllowedInvoiceUploadFile(file)) {
    throw new Error(
      langEn ? 'Please upload a PDF, JPG, or PNG file.' : '请上传 PDF、JPG 或 PNG 格式的文件。',
    );
  }

  const today = new Date().toISOString().split('T')[0];

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `invoices/${fileName}`;

  const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
  if (uploadError) throw uploadError;

  const { data: pub } = supabase.storage.from('documents').getPublicUrl(filePath);
  const docUrl = pub.publicUrl;

  const insertBody = {
    property_id: propertyId,
    file_name: sanitizeDbText(file.name),
    document_url: sanitizeDbText(docUrl),
    vendor_name: sanitizeDbText(draftNeedsDetailsVendor(langEn)),
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
    ai_extracted_data: {
      single_upload_file_only: true,
    },
    ai_confidence_score: null,
    uploaded_by: profileId,
    status: 'draft_manual',
    fiscal_year: parseInt(String(today).slice(0, 4), 10) || new Date().getFullYear(),
    accounting_year: accountingYear,
    accounting_month: accountingMonth,
  };

  const { data: insertedInvoice, error: dbError } = await supabase
    .from('invoices')
    .insert(insertBody)
    .select('id')
    .single();

  if (dbError) throw dbError;

  const invoiceId = (insertedInvoice as { id: string } | null)?.id;
  if (!invoiceId) {
    throw new Error(langEn ? 'Missing invoice id after insert' : '发票保存后缺少 invoice_id');
  }

  return { invoiceId, status: 'draft_manual' };
}
