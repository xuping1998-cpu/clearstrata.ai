import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from './supabase';
import { invokeInvoiceOcrFromFile } from './invoiceOcrClient';

const MAX_PACKAGE_PAGES = 120;

/** Long PDF text layer (chars): apply keyword gate before OCR. Shorter layers → assume scan / weak text, OCR anyway. */
const LONG_TEXT_LAYER_MIN_CHARS = 72;

/** When pdf.js yields enough text, require an invoice-like cue before spending OCR budget. */
export const INVOICE_DOC_KEYWORD_RE =
  /\b(invoice|tax\s*invoice|statement|bill|credit\s*note|payable\s*summary)\b/i;

export const CREDIT_NOTE_RE = /\bcredit\s*note\b/i;

let pdfWorkerConfigured = false;

export function ensurePdfJsWorker(): void {
  if (pdfWorkerConfigured || typeof window === 'undefined') return;
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  pdfWorkerConfigured = true;
}

export async function countPdfPagesPdfLib(buffer: ArrayBuffer): Promise<number> {
  const doc = await PDFDocument.load(buffer.slice(0));
  return doc.getPageCount();
}

/** Split multi-page PDF into one PDF byte array per page (pdf-lib). */
export async function splitPdfIntoSinglePageBuffers(buffer: ArrayBuffer): Promise<Uint8Array[]> {
  const src = await PDFDocument.load(buffer.slice(0));
  const n = src.getPageCount();
  const out: Uint8Array[] = [];
  for (let i = 0; i < n; i++) {
    const dst = await PDFDocument.create();
    const [copied] = await dst.copyPages(src, [i]);
    dst.addPage(copied);
    out.push(await dst.save());
  }
  return out;
}

async function extractPageTexts(buffer: ArrayBuffer): Promise<string[]> {
  ensurePdfJsWorker();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise;
  const n = pdf.numPages;
  const texts: string[] = [];
  for (let p = 1; p <= n; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const s = tc.items
      .map((item) => {
        if (item && typeof item === 'object' && 'str' in item && typeof (item as { str?: unknown }).str === 'string') {
          return (item as { str: string }).str;
        }
        return '';
      })
      .join(' ');
    texts.push(s);
  }
  return texts;
}

function sanitizeBaseName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'payable-package';
}

async function uploadPdfPageBytes(
  bytes: Uint8Array,
  storageSuffix: string,
): Promise<{ publicUrl: string; storagePath: string }> {
  const path = `invoices/pkg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${storageSuffix}.pdf`;
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const { error } = await supabase.storage.from('documents').upload(path, blob);
  if (error) throw error;
  const { data: pub } = supabase.storage.from('documents').getPublicUrl(path);
  return { publicUrl: pub.publicUrl, storagePath: path };
}

export type PayablePackageResult = {
  totalPages: number;
  /** Rows inserted after OCR deemed this page a valid invoice. */
  recognizedInvoices: number;
  /** Pages not inserted (no keyword gate, OCR failure, or weak extraction). */
  skippedPages: number;
  createdInvoiceIds: string[];
};

export type PackageProgress = { messageEn: string; messageZh: string; fraction?: number };

export async function getPdfPageCountFromFile(file: File): Promise<number> {
  const buf = await file.arrayBuffer();
  return countPdfPagesPdfLib(buf);
}

function isPlausibleOcrRow(extracted: {
  vendor_name?: string;
  invoice_number?: string | null;
  total_amount?: number;
}): boolean {
  const v = (extracted.vendor_name ?? '').trim();
  const inv = (extracted.invoice_number ?? '').trim();
  const amt = Number(extracted.total_amount);
  return Boolean(v) || Boolean(inv) || (Number.isFinite(amt) && Math.abs(amt) >= 0.01);
}

/**
 * MVP batch: pdf-lib split + layered pdf.js gate → per-page Edge `invoice-ocr` → insert only plausible rows as `pending_review`.
 * Long text layer: keywords required. Short/empty text layer: OCR fallback (typical scans).
 * No duplicate detection, no auto AI audit (use AI Review tab manually).
 */
export async function processPayablePdfPackage(opts: {
  file: File;
  propertyId: string;
  profileId: string;
  accountingYear: number;
  accountingMonth: number;
  langEn: boolean;
  onProgress?: (p: PackageProgress) => void;
}): Promise<PayablePackageResult> {
  const { file, propertyId, profileId, accountingYear, accountingMonth, langEn, onProgress } = opts;
  const buf = await file.arrayBuffer();
  const totalPages = await countPdfPagesPdfLib(buf);
  if (totalPages <= 1) {
    throw new Error(langEn ? 'Expected a multi-page PDF package.' : '请上传多页 PDF 发票包。');
  }
  if (totalPages > MAX_PACKAGE_PAGES) {
    throw new Error(
      langEn ? `PDF exceeds ${MAX_PACKAGE_PAGES} pages.` : `PDF 页数超过 ${MAX_PACKAGE_PAGES} 页上限。`,
    );
  }

  onProgress?.({
    messageEn: `Splitting ${totalPages} pages…`,
    messageZh: `正在拆分 ${totalPages} 页…`,
    fraction: 0,
  });

  const [pageTexts, pageBuffers] = await Promise.all([
    extractPageTexts(buf),
    splitPdfIntoSinglePageBuffers(buf),
  ]);

  if (pageTexts.length !== pageBuffers.length) {
    throw new Error(langEn ? 'Page split mismatch.' : '拆页结果不一致，请重试。');
  }

  let recognizedInvoices = 0;
  let skippedPages = 0;
  const createdInvoiceIds: string[] = [];

  const base = sanitizeBaseName(file.name.replace(/\.pdf$/i, ''));
  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < pageTexts.length; i++) {
    const pageIndex = i + 1;
    const rawText = pageTexts[i] ?? '';
    const collapsed = rawText.replace(/\s+/g, ' ').trim();
    const textLayerLen = collapsed.length;

    onProgress?.({
      messageEn: `Page ${pageIndex} / ${totalPages}`,
      messageZh: `处理第 ${pageIndex} / ${totalPages} 页`,
      fraction: pageIndex / totalPages,
    });

    if (textLayerLen >= LONG_TEXT_LAYER_MIN_CHARS) {
      if (!INVOICE_DOC_KEYWORD_RE.test(collapsed)) {
        skippedPages++;
        continue;
      }
    }

    const bytes = pageBuffers[i];
    const fileLabel = `${base}-p${pageIndex}.pdf`;
    const pageFile = new File([new Blob([bytes], { type: 'application/pdf' })], fileLabel, {
      type: 'application/pdf',
    });

    let ocr: Awaited<ReturnType<typeof invokeInvoiceOcrFromFile>> | null = null;
    try {
      await new Promise((r) => setTimeout(r, 120));
      ocr = await invokeInvoiceOcrFromFile(pageFile, langEn);
    } catch (e) {
      console.warn('[invoice package] OCR page', pageIndex, e);
      skippedPages++;
      continue;
    }

    const ex = ocr.extracted;
    if (!isPlausibleOcrRow(ex)) {
      skippedPages++;
      continue;
    }

    const creditFromText = CREDIT_NOTE_RE.test(collapsed);
    const creditFromAmount = Number(ex.total_amount) < -0.009;
    const isCreditNote = creditFromText || creditFromAmount;

    const vendor = ex.vendor_name?.trim() || '';
    const invoiceNumber = ex.invoice_number ?? null;
    const invoiceDate = ex.invoice_date || today;
    const dueDate = ex.due_date ?? null;
    const subtotal = ex.subtotal ?? 0;
    const taxAmount = ex.tax_amount ?? 0;
    const totalAmount = ex.total_amount ?? 0;
    const category = ex.category || 'general';
    const notes = ex.description ?? null;
    const fiscalYear =
      ocr.fiscalYear ?? (parseInt(String(invoiceDate).slice(0, 4), 10) || new Date().getFullYear());

    const { publicUrl, storagePath } = await uploadPdfPageBytes(bytes, `p${pageIndex}`);

    const aiPayload: Record<string, unknown> = {
      ...ex,
      batch_package: true,
      package_source_file: file.name,
      package_page: pageIndex,
      package_storage_path: storagePath,
      invoice_type: isCreditNote ? 'credit_note' : 'invoice',
      raw_page_text_excerpt: collapsed.slice(0, 1200),
    };

    const { data: inserted, error: insErr } = await supabase
      .from('invoices')
      .insert({
        property_id: propertyId,
        file_name: fileLabel,
        document_url: publicUrl,
        vendor_name: vendor || (langEn ? 'Unknown vendor' : '未知供应商'),
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: dueDate,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        hst_number: ex.hst_number ?? null,
        currency: ex.currency || 'CAD',
        category,
        notes,
        has_anomalies: false,
        ai_extracted_data: aiPayload,
        ai_confidence_score: 0.85,
        uploaded_by: profileId,
        status: 'pending_review',
        fiscal_year: fiscalYear,
        accounting_year: accountingYear,
        accounting_month: accountingMonth,
      })
      .select('id')
      .single();

    if (insErr) {
      console.error('[invoice package] insert failed', insErr);
      throw new Error(insErr.message);
    }

    const id = (inserted as { id: string } | null)?.id;
    if (!id) throw new Error(langEn ? 'Insert returned no id' : '保存失败（无 ID）');
    createdInvoiceIds.push(id);
    recognizedInvoices++;

    try {
      await supabase.from('invoice_ocr_raw').insert({
        invoice_id: id,
        property_id: propertyId,
        structured_json: ocr.structured as Record<string, unknown>,
        raw_text: typeof ex.raw_text === 'string' ? ex.raw_text : collapsed.slice(0, 8000),
        ocr_model: 'claude-sonnet-4-20250514',
      });
    } catch (e) {
      console.warn('[invoice package] invoice_ocr_raw', e);
    }
  }

  return {
    totalPages,
    recognizedInvoices,
    skippedPages,
    createdInvoiceIds,
  };
}
