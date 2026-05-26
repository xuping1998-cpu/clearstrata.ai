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

export type InvoiceDirectUploadOutcome = 'draft_manual';

export function isInvoiceFileOnlyArchive(inv: {
  ai_extracted_data?: Record<string, unknown> | null;
}): boolean {
  const d = inv.ai_extracted_data;
  if (!d || typeof d !== 'object') return false;
  return d.file_only_upload === true || d.upload_mode === 'invoice_archive';
}

export function invoiceListDisplayFileName(inv: {
  file_name?: string | null;
  vendor_name?: string;
  ai_extracted_data?: Record<string, unknown> | null;
}): string {
  const name = (inv.file_name || inv.vendor_name || '').trim();
  return name || '—';
}

export function invoiceListDisplayAmount(inv: {
  total_amount?: number | null;
  ai_extracted_data?: Record<string, unknown> | null;
}): string | null {
  if (isInvoiceFileOnlyArchive(inv)) return null;
  const n = Number(inv.total_amount);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(2);
}

export function invoiceListDisplayInvoiceNumber(inv: {
  invoice_number?: string | null;
  ai_extracted_data?: Record<string, unknown> | null;
}): string | null {
  if (isInvoiceFileOnlyArchive(inv)) return null;
  const n = (inv.invoice_number ?? '').trim();
  return n || null;
}

/**
 * Archive one invoice file (PDF or image): Storage → single `invoices` row.
 * No OCR, no AI, no page splitting.
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
  const originalFileName = file.name.trim();

  const fileExt = file.name.split('.').pop();
  const storageFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `invoices/${storageFileName}`;

  const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
  if (uploadError) throw uploadError;

  const { data: pub } = supabase.storage.from('documents').getPublicUrl(filePath);
  const docUrl = pub.publicUrl;

  const insertBody = {
    property_id: propertyId,
    file_name: sanitizeDbText(originalFileName),
    document_url: sanitizeDbText(docUrl),
    vendor_name: sanitizeDbText(originalFileName),
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
      file_only_upload: true,
      upload_mode: 'invoice_archive',
      original_file_name: originalFileName,
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
