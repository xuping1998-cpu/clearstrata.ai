import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from './supabase';
import { invokeInvoiceOcrFromFile } from './invoiceOcrClient';
import { deepSanitizeJsonStrings, sanitizeDbText } from './invoiceJsonSanitize';

const MAX_PACKAGE_PAGES = 120;

/** Long PDF text layer (chars): apply keyword gate before OCR. Shorter layers → assume scan / weak text, OCR anyway. */
const LONG_TEXT_LAYER_MIN_CHARS = 72;

/** When pdf.js yields enough text, require an invoice-like cue before spending OCR budget. */
export const INVOICE_DOC_KEYWORD_RE =
  /\b(invoice|tax\s*invoice|statement|bill|credit\s*note|credit\s*memo|payable\s*summary)\b/i;

/** Credit adjustments: match page text or OCR raw_text for labeling + relaxed insert gate. */
export const CREDIT_NOTE_OR_MEMO_RE = /\b(credit\s*note|credit\s*memo)\b/i;

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
  /** Rows inserted after OCR deemed this page a valid invoice. */
  recognizedInvoices: number;
  /** Pages not inserted (no keyword gate, OCR failure, weak extraction, dedup, insert failure). */
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

function normalizeVendorDedupKey(vendor: string): string {
  return vendor.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeInvoiceNumberDedupKey(inv: string): string {
  return inv.trim().toLowerCase().replace(/[\s-]+/g, '');
}

/** Stable cents key for batch duplicate detection. */
function totalAmountDedupKey(totalAmount: number): string {
  if (!Number.isFinite(totalAmount)) return 'nan';
  const cents = Math.round(totalAmount * 100);
  return String(cents);
}

function creditNoteOrMemoDetected(collapsedPageText: string, ocrRawText?: string): boolean {
  const blob = `${collapsedPageText}\n${typeof ocrRawText === 'string' ? ocrRawText : ''}`;
  return CREDIT_NOTE_OR_MEMO_RE.test(blob);
}

/**
 * Replaces the former loose `isPlausibleOcrRow` (vendor OR inv OR tiny total).
 * Tight insert gate: cannot rely on total alone.
 * (vendor ∧ |total|>0) ∨ (invoice_number ∧ |total|>0) ∨ (credit memo/note detected ∧ total<0)
 */
function passesTightInvoiceInsertGate(opts: {
  vendorTrim: string;
  invoiceNumberTrim: string;
  totalAmount: number;
  creditNoteOrMemo: boolean;
}): boolean {
  const { vendorTrim, invoiceNumberTrim, totalAmount: raw, creditNoteOrMemo } = opts;
  const amt = Number(raw);
  const finite = Number.isFinite(amt);
  const nonZero = finite && Math.abs(amt) > 0;
  const negative = finite && amt < 0;

  return (
    (Boolean(vendorTrim) && nonZero) ||
    (Boolean(invoiceNumberTrim) && nonZero) ||
    (creditNoteOrMemo && negative)
  );
}

/** Likely summary / continuation: invoice-ish keywords in text layer but OCR found no vendor or invoice # (unless credit memo + negative total). */
function shouldSkipLikelyContinuationPage(opts: {
  invoiceKeywordHitInPageText: boolean;
  vendorTrim: string;
  invoiceNumberTrim: string;
  creditNoteOrMemo: boolean;
  totalAmount: number;
}): boolean {
  const { invoiceKeywordHitInPageText, vendorTrim, invoiceNumberTrim, creditNoteOrMemo, totalAmount } =
    opts;
  const amt = Number(totalAmount);
  if (!invoiceKeywordHitInPageText) return false;
  if (vendorTrim || invoiceNumberTrim) return false;
  if (creditNoteOrMemo && amt < 0) return false;
  return true;
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
  const createdInvoiceIds: string[] = [];
  const skipped: SkippedPageEntry[] = [];

  /** Same vendor + invoice # already imported in this package run (multi-page bills). */
  const seenVendorInvoicePair = new Set<string>();
  /** vendor + invoice # + amount — skip exact duplicates in one batch */
  const seenVendorInvoiceAmountTriple = new Set<string>();

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
        skipped.push(
          buildSkipEntry({
            pageIndex,
            reason: 'non_invoice_keyword',
            excerpt: collapsed,
          }),
        );
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
      skipped.push(
        buildSkipEntry({
          pageIndex,
          reason: 'ocr_failed',
          excerpt: collapsed,
        }),
      );
      continue;
    }

    const ex = ocr.extracted;

    const vendorTrim = (ex.vendor_name ?? '').trim();
    const invoiceNumberTrim = (ex.invoice_number ?? '').trim();
    const totalAmt = Number(ex.total_amount);
    const creditNoteOrMemo = creditNoteOrMemoDetected(collapsed, ex.raw_text);
    const invoiceKeywordHitInPageText = INVOICE_DOC_KEYWORD_RE.test(collapsed);

    const ocrExcerpt =
      (typeof ex.raw_text === 'string' && ex.raw_text.trim().length > 0
        ? ex.raw_text.trim()
        : collapsed) || '';

    if (
      shouldSkipLikelyContinuationPage({
        invoiceKeywordHitInPageText,
        vendorTrim,
        invoiceNumberTrim,
        creditNoteOrMemo,
        totalAmount: totalAmt,
      })
    ) {
      skipped.push(
        buildSkipEntry({
          pageIndex,
          reason: 'likely_continuation',
          excerpt: ocrExcerpt,
        }),
      );
      continue;
    }

    if (
      !passesTightInvoiceInsertGate({
        vendorTrim,
        invoiceNumberTrim,
        totalAmount: totalAmt,
        creditNoteOrMemo,
      })
    ) {
      skipped.push(
        buildSkipEntry({
          pageIndex,
          reason: 'weak_extraction',
          excerpt: ocrExcerpt,
        }),
      );
      continue;
    }

    const vk = normalizeVendorDedupKey(vendorTrim);
    const ik = normalizeInvoiceNumberDedupKey(invoiceNumberTrim);
    if (vk && ik) {
      const pairKey = `${vk}\x00${ik}`;
      if (seenVendorInvoicePair.has(pairKey)) {
        skipped.push(
          buildSkipEntry({
            pageIndex,
            reason: 'duplicate_in_batch',
            excerpt: ocrExcerpt,
          }),
        );
        continue;
      }
    }

    const tripleKey = `${vk}\x00${ik}\x00${totalAmountDedupKey(totalAmt)}`;
    if (seenVendorInvoiceAmountTriple.has(tripleKey)) {
      skipped.push(
        buildSkipEntry({
          pageIndex,
          reason: 'duplicate_in_batch',
          excerpt: ocrExcerpt,
        }),
      );
      continue;
    }

    const isCreditNote = creditNoteOrMemo || totalAmt < 0;

    const vendor = vendorTrim;
    const invoiceNumber = invoiceNumberTrim.length > 0 ? invoiceNumberTrim : null;
    const invoiceDate = ex.invoice_date || today;
    const dueDate = ex.due_date ?? null;
    const subtotal = ex.subtotal ?? 0;
    const taxAmount = ex.tax_amount ?? 0;
    const totalAmount = totalAmt;
    const category = ex.category || 'general';
    const notes = ex.description ?? null;
    const fiscalYear =
      ocr.fiscalYear ?? (parseInt(String(invoiceDate).slice(0, 4), 10) || new Date().getFullYear());

    const { publicUrl, storagePath } = await uploadPdfPageBytes(bytes, `p${pageIndex}`);

    const aiPayload: Record<string, unknown> = deepSanitizeJsonStrings({
      ...ex,
      batch_package: true,
      package_source_file: file.name,
      package_page: pageIndex,
      package_storage_path: storagePath,
      invoice_type: isCreditNote ? 'credit_note' : 'invoice',
      raw_page_text_excerpt: collapsed.slice(0, 1200),
    }) as Record<string, unknown>;

    const { data: inserted, error: insErr } = await supabase
      .from('invoices')
      .insert({
        property_id: propertyId,
        file_name: sanitizeDbText(fileLabel),
        document_url: sanitizeDbText(publicUrl),
        vendor_name: sanitizeDbText(vendor || (langEn ? 'Unknown vendor' : '未知供应商')),
        invoice_number: invoiceNumber != null ? sanitizeDbText(invoiceNumber) : null,
        invoice_date: invoiceDate,
        due_date: dueDate,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        hst_number: ex.hst_number != null ? sanitizeDbText(String(ex.hst_number)) : null,
        currency: sanitizeDbText(ex.currency || 'CAD'),
        category: sanitizeDbText(category),
        notes: typeof notes === 'string' ? sanitizeDbText(notes) : notes,
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
      skipped.push(
        buildSkipEntry({
          pageIndex,
          reason: 'insert_failed',
          excerpt: sanitizeDbText(`${insErr.message} | ${ocrExcerpt}`).slice(0, 200),
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
          excerpt: ocrExcerpt,
        }),
      );
      continue;
    }
    createdInvoiceIds.push(id);
    recognizedInvoices++;

    if (vk && ik) {
      seenVendorInvoicePair.add(`${vk}\x00${ik}`);
    }
    seenVendorInvoiceAmountTriple.add(tripleKey);

    try {
      await supabase.from('invoice_ocr_raw').insert({
        invoice_id: id,
        property_id: propertyId,
        structured_json: deepSanitizeJsonStrings(ocr.structured) as Record<string, unknown>,
        raw_text: sanitizeDbText(
          typeof ex.raw_text === 'string' ? ex.raw_text : collapsed.slice(0, 8000),
        ),
        ocr_model: 'claude-sonnet-4-20250514',
      });
    } catch (e) {
      console.warn('[invoice package] invoice_ocr_raw', e);
    }
  }

  return {
    totalPages,
    recognizedInvoices,
    skippedPages: skipped.length,
    createdInvoiceIds,
    skipped,
  };
}
