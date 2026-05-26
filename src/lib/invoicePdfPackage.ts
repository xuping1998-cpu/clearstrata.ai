import { PDFDocument } from 'pdf-lib';
import { supabase } from './supabase';
import { sanitizeDbText } from './invoiceJsonSanitize';

const MAX_PACKAGE_PAGES = 120;

/** When pdf.js yields enough text, require an invoice-like cue before spending OCR budget. */
export const INVOICE_DOC_KEYWORD_RE =
  /\b(invoice|tax\s*invoice|statement|bill|credit\s*note|credit\s*memo|payable\s*summary)\b/i;

/** Credit adjustments: match page text or OCR raw_text for labeling + relaxed insert gate. */
export const CREDIT_NOTE_OR_MEMO_RE = /\b(credit\s*note|credit\s*memo)\b/i;

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

function sanitizeBaseName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'payable-package';
}

function draftNeedsDetailsVendor(langEn: boolean): string {
  return langEn ? 'Needs details' : '待补充信息';
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

/** Reason codes for pages that were processed but not turned into invoice rows. */
export type SkippedPageReasonCode =
  | 'non_invoice_keyword'
  | 'likely_continuation'
  | 'weak_extraction'
  | 'duplicate_in_batch'
  | 'ocr_failed'
  | 'insert_failed';

export type SkippedPageEntry = {
  pageIndex: number;
  reason: SkippedPageReasonCode;
  reasonZh: string;
  reasonEn: string;
  /** Short page-text / OCR excerpt (≤ 80 chars) shown to the user for context. */
  excerpt?: string;
};

export type PayablePackageResult = {
  totalPages: number;
  /** Rows inserted (one draft_manual per archived page). */
  recognizedInvoices: number;
  /** Pages not inserted (insert failure only in file-only upload path). */
  skippedPages: number;
  createdInvoiceIds: string[];
  /** Per-page details for the upload result UI. */
  skipped: SkippedPageEntry[];
};

const SKIP_REASON_TEXT: Record<SkippedPageReasonCode, { zh: string; en: string }> = {
  non_invoice_keyword: { zh: '非发票页 / OCR 内容不足', en: 'Not invoice-like / weak OCR' },
  likely_continuation: { zh: '疑似上一张发票的延续页', en: 'Likely continuation of prior invoice' },
  weak_extraction: { zh: '金额或供应商缺失', en: 'Missing vendor / invoice # / amount' },
  duplicate_in_batch: { zh: '重复发票（本次包内）', en: 'Duplicate invoice in this batch' },
  ocr_failed: { zh: '其他解析失败（OCR 失败）', en: 'OCR failure' },
  insert_failed: { zh: '入库失败', en: 'Database insert failed' },
};

function buildSkipEntry(opts: {
  pageIndex: number;
  reason: SkippedPageReasonCode;
  excerpt?: string;
}): SkippedPageEntry {
  const m = SKIP_REASON_TEXT[opts.reason];
  const excerpt = opts.excerpt ? sanitizeDbText(opts.excerpt).slice(0, 80) : undefined;
  return {
    pageIndex: opts.pageIndex,
    reason: opts.reason,
    reasonZh: m.zh,
    reasonEn: m.en,
    excerpt,
  };
}

export type PackageProgress = { messageEn: string; messageZh: string; fraction?: number };

export async function getPdfPageCountFromFile(file: File): Promise<number> {
  const buf = await file.arrayBuffer();
  return countPdfPagesPdfLib(buf);
}

/**
 * Multi-page PDF: split → per-page storage upload → insert `draft_manual` (file-only archive).
 * OCR / field pre-fill is deferred to optional AI Extract on each invoice row.
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

  const pageBuffers = await splitPdfIntoSinglePageBuffers(buf);

  let recognizedInvoices = 0;
  const createdInvoiceIds: string[] = [];
  const skipped: SkippedPageEntry[] = [];

  const base = sanitizeBaseName(file.name.replace(/\.pdf$/i, ''));
  const today = new Date().toISOString().split('T')[0];
  const fiscalYear = parseInt(String(today).slice(0, 4), 10) || new Date().getFullYear();

  for (let i = 0; i < pageBuffers.length; i++) {
    const pageIndex = i + 1;
    const bytes = pageBuffers[i];

    onProgress?.({
      messageEn: `Uploading page ${pageIndex} / ${totalPages}`,
      messageZh: `上传第 ${pageIndex} / ${totalPages} 页`,
      fraction: pageIndex / totalPages,
    });

    const fileLabel = `${base}-p${pageIndex}.pdf`;

    let publicUrl: string;
    let storagePath: string;
    try {
      const uploaded = await uploadPdfPageBytes(bytes, `p${pageIndex}`);
      publicUrl = uploaded.publicUrl;
      storagePath = uploaded.storagePath;
    } catch (e) {
      console.error('[invoice package] storage upload failed', pageIndex, e);
      skipped.push(
        buildSkipEntry({
          pageIndex,
          reason: 'insert_failed',
          excerpt: langEn ? 'Storage upload failed' : '文件上传失败',
        }),
      );
      continue;
    }

    const { data: inserted, error: insErr } = await supabase
      .from('invoices')
      .insert({
        property_id: propertyId,
        file_name: sanitizeDbText(fileLabel),
        document_url: sanitizeDbText(publicUrl),
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
          batch_package: true,
          package_source_file: file.name,
          package_page: pageIndex,
          package_storage_path: storagePath,
          package_upload_file_only: true,
        },
        ai_confidence_score: null,
        uploaded_by: profileId,
        status: 'draft_manual',
        fiscal_year: fiscalYear,
        accounting_year: accountingYear,
        accounting_month: accountingMonth,
      })
      .select('id')
      .single();

    if (insErr) {
      console.error('[invoice package] insert failed', insErr);
      skipped.push(
        buildSkipEntry({
          pageIndex,
          reason: 'insert_failed',
          excerpt: sanitizeDbText(insErr.message).slice(0, 200),
        }),
      );
      continue;
    }

    const id = (inserted as { id: string } | null)?.id;
    if (!id) {
      skipped.push(
        buildSkipEntry({
          pageIndex,
          reason: 'insert_failed',
        }),
      );
      continue;
    }
    createdInvoiceIds.push(id);
    recognizedInvoices++;
  }

  return {
    totalPages,
    recognizedInvoices,
    skippedPages: skipped.length,
    createdInvoiceIds,
    skipped,
  };
}
