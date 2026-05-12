import { supabase } from './supabase';
import { invokeInvoiceOcrFromFile, type InvoiceOcrInvokeResult } from './invoiceOcrClient';
import { CREDIT_NOTE_OR_MEMO_TEXT_RE, ocrPrefillCredibility } from './invoiceSingleUploadCredibility';

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

async function insertInvoiceOcrRawSafe(opts: {
  invoiceId: string;
  propertyId: string;
  ocr: InvoiceOcrInvokeResult;
  rawTextFallback: string;
}): Promise<void> {
  const { invoiceId, propertyId, ocr, rawTextFallback } = opts;
  const ex = ocr.extracted;
  try {
    await supabase.from('invoice_ocr_raw').insert({
      invoice_id: invoiceId,
      property_id: propertyId,
      structured_json: ocr.structured as Record<string, unknown>,
      raw_text: typeof ex.raw_text === 'string' ? ex.raw_text : rawTextFallback.slice(0, 8000),
      ocr_model: 'claude-sonnet-4-20250514',
    });
  } catch (e) {
    console.warn('[invoice direct upload] invoice_ocr_raw', e);
  }
}

export type InvoiceDirectUploadOutcome = 'pending_review' | 'draft_manual';

/**
 * Single invoice: Storage → OCR pre-fill (`invoice-ocr`) → inserts `pending_review` when OCR is credible;
 * otherwise `draft_manual` (“待补充信息”) without joining the council review queue yet.
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

  let ocr: InvoiceOcrInvokeResult | null = null;
  try {
    ocr = await invokeInvoiceOcrFromFile(file, langEn);
  } catch (e) {
    console.warn('[invoice direct upload] OCR failed — saving as draft_manual', e);
    ocr = null;
  }

  let status: InvoiceDirectUploadOutcome = 'draft_manual';
  let insertBody: Record<string, unknown>;

  if (ocr) {
    const ex = ocr.extracted;
    const textHintBlob = `${ex.raw_text ?? ''}\n`;
    const credible = ocrPrefillCredibility({
      vendorName: ex.vendor_name ?? '',
      invoiceNumber: ex.invoice_number,
      totalAmount: ex.total_amount,
      langEn,
      combinedTextHint: textHintBlob,
    });
    status = credible ? 'pending_review' : 'draft_manual';

    const creditDetected = CREDIT_NOTE_OR_MEMO_TEXT_RE.test(textHintBlob) || ex.total_amount < 0;
    const isCreditNote = creditDetected;

    if (credible) {
      const fiscalYear =
        ocr.fiscalYear ?? (parseInt(String(ex.invoice_date).slice(0, 4), 10) || new Date().getFullYear());
      const aiPayload: Record<string, unknown> = {
        ...ex,
        single_upload_ocr_prefill: true,
        invoice_type: isCreditNote ? 'credit_note' : 'invoice',
      };

      insertBody = {
        property_id: propertyId,
        file_name: file.name,
        document_url: docUrl,
        vendor_name: ex.vendor_name?.trim() || (langEn ? 'Unknown vendor' : '未知供应商'),
        invoice_number: ex.invoice_number ?? null,
        invoice_date: ex.invoice_date || today,
        due_date: ex.due_date ?? null,
        subtotal: ex.subtotal ?? 0,
        tax_amount: ex.tax_amount ?? 0,
        total_amount: ex.total_amount ?? 0,
        hst_number: ex.hst_number ?? null,
        currency: ex.currency || 'CAD',
        category: ex.category || 'general',
        notes: ex.description ?? null,
        has_anomalies: false,
        ai_extracted_data: aiPayload,
        ai_confidence_score: 0.85,
        uploaded_by: profileId,
        status: 'pending_review',
        fiscal_year: fiscalYear,
        accounting_year: accountingYear,
        accounting_month: accountingMonth,
      };
    } else {
      insertBody = {
        property_id: propertyId,
        file_name: file.name,
        document_url: docUrl,
        vendor_name: draftNeedsDetailsVendor(langEn),
        invoice_number: null,
        invoice_date: today,
        due_date: null,
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        hst_number: null,
        currency: ex.currency || 'CAD',
        category: ex.category || 'general',
        notes: ex.description ?? null,
        has_anomalies: false,
        ai_extracted_data: {
          single_upload_weak_ocr: true,
          ocr_attempt: ex,
          structured: ocr.structured,
          invoice_type: isCreditNote ? 'credit_note' : 'invoice',
        } as Record<string, unknown>,
        ai_confidence_score: null,
        uploaded_by: profileId,
        status: 'draft_manual',
        fiscal_year: parseInt(String(today).slice(0, 4), 10) || new Date().getFullYear(),
        accounting_year: accountingYear,
        accounting_month: accountingMonth,
      };
    }
  } else {
    insertBody = {
      property_id: propertyId,
      file_name: file.name,
      document_url: docUrl,
      vendor_name: draftNeedsDetailsVendor(langEn),
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
        single_upload_ocr_invoke_failed: true,
      },
      ai_confidence_score: null,
      uploaded_by: profileId,
      status: 'draft_manual',
      fiscal_year: parseInt(String(today).slice(0, 4), 10) || new Date().getFullYear(),
      accounting_year: accountingYear,
      accounting_month: accountingMonth,
    };
  }

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

  if (ocr) {
    await insertInvoiceOcrRawSafe({
      invoiceId,
      propertyId,
      ocr,
      rawTextFallback: ocr.extracted.raw_text ?? '',
    });
  }

  return { invoiceId, status };
}
