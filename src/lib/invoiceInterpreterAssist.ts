/**
 * OCR + DB write path previously shown on the standalone Interpreter tab.
 * Kept for reuse; primary council flow is Monthly Auto Audit in Invoice Details.
 */

import { supabase } from './supabase';
import { invokeInvoiceOcrFromFile, fetchUrlAsInvoiceFile } from './invoiceOcrClient';
import { scheduleInvoiceAiAuditAfterInsert } from './invoiceAudit';

export type InterpreterAssistInvoiceRow = {
  id: string;
  file_name: string | null;
  document_url: string;
  vendor_name: string;
  invoice_date: string;
  total_amount: number;
  status: string;
};

/**
 * Full-file OCR suggestion write + anomaly row + OCR raw + enqueue AI audit.
 */
export async function assistInvoiceViaInterpreterOcr(opts: {
  inv: InterpreterAssistInvoiceRow;
  profileId: string;
  propertyId: string;
  langEn: boolean;
}): Promise<void> {
  const { inv, profileId: _profileId, propertyId, langEn } = opts;
  void _profileId;
  const file = await fetchUrlAsInvoiceFile(inv.document_url, inv.file_name || 'invoice');
  const { extracted, structured, fiscalYear } = await invokeInvoiceOcrFromFile(file, langEn);

  const { error: upErr } = await supabase
    .from('invoices')
    .update({
      vendor_name: extracted.vendor_name,
      invoice_number: extracted.invoice_number,
      invoice_date: extracted.invoice_date,
      due_date: extracted.due_date,
      subtotal: extracted.subtotal ?? 0,
      tax_amount: extracted.tax_amount ?? 0,
      total_amount: extracted.total_amount ?? 0,
      hst_number: extracted.hst_number,
      currency: extracted.currency || 'CAD',
      category: extracted.category || 'general',
      notes: extracted.description,
      has_anomalies: Boolean(extracted.has_anomalies),
      ai_extracted_data: extracted as unknown as Record<string, unknown>,
      ai_confidence_score: 0.85,
      status: 'pending_review',
      fiscal_year: fiscalYear,
    })
    .eq('property_id', propertyId)
    .eq('id', inv.id);

  if (upErr) throw upErr;

  if (extracted.has_anomalies) {
    const anomalyNotes =
      (typeof extracted.anomaly_notes === 'string' && extracted.anomaly_notes.trim()) ||
      (typeof extracted.description === 'string' && extracted.description.trim()) ||
      (langEn ? 'AI detected anomalies' : 'AI检测到异常');
    try {
      await supabase.from('financial_anomalies').insert({
        property_id: propertyId,
        invoice_id: inv.id,
        notes: anomalyNotes,
      });
    } catch (e) {
      console.error('financial_anomalies', e);
    }
  }

  try {
    await supabase.from('invoice_ocr_raw').insert({
      invoice_id: inv.id,
      property_id: propertyId,
      structured_json: structured as Record<string, unknown>,
      raw_text: typeof extracted.raw_text === 'string' ? extracted.raw_text : null,
      ocr_model: 'claude-sonnet-4-20250514',
    });
  } catch (e) {
    console.error('invoice_ocr_raw', e);
  }

  scheduleInvoiceAiAuditAfterInsert(inv.id, propertyId);
}
