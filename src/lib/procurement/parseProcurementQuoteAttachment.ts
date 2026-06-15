import {
  invokeInvoiceOcrFromFile,
  type InvoiceOcrExtractedForDb,
  type InvoiceOcrInvokeResult,
} from '../invoiceOcrClient';
import {
  type FinancialTotalSource,
  type FinancialTotalsParseResult,
} from './financialTotalsParser';
import {
  verifyDualFinancialTotals,
  hasExplicitPositiveDue,
  type DualFinancialTotalsVerification,
  type FinancialTotalsParseSource,
} from './dualFinancialTotalsVerification';
import type { InvoiceConsistencyAuditResult } from './invoiceConsistencyAudit';
import type { PdfBoundarySnapshot } from './pdfInvoiceBoundary';
import { splitPdfIntoSinglePageFiles, mergePdfPageFiles } from './pdfPageSplit';

/** How a multi-invoice scanned PDF's invoice group total was produced (Phase 4B.2). */
export type InvoiceGroupStrategy =
  | 'single_page'
  | 'merged_pages'
  | 'fallback_original_pdf'
  | 'last_page_due_fallback';

export interface ParsedProcurementQuote {
  vendor_name: string | null;
  document_number: string | null;
  document_date: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  /** Payment-block figures parsed in code from raw_text (Phase 2C/2D audit). */
  invoice_total?: number | null;
  amount_due?: number | null;
  balance_due?: number | null;
  total_due?: number | null;
  payments_credits?: number | null;
  currency: string;
  service_scope: string;
  line_items: Array<{
    description: string;
    amount: number | null;
  }>;
  raw_text: string;
  /** Verbatim OCR transcription of the source document (Phase 2A.11). */
  raw_text_original?: string;
  /** Verbatim transcription of just the totals block, from Call A (Phase 3). */
  totals_block_text?: string;
  /** Independent second-pass totals OCR, uncorrelated with raw_text (Phase 3B). */
  independent_totals_block_text?: string;
  /** How the independent totals were produced, e.g. "second_model_call" (Phase 3B). */
  independent_totals_ocr_source?: string;
  /** Which totals-block transcription fed dual verification (Phase 3B). */
  totals_block_input_source?: 'independent_totals_block_text' | 'totals_block_text' | 'none';
  confidence: number | null;
  source_file_name: string;
  source_mime_type: string;
  parsed_at: string;
  ocr_source: 'invoice-ocr';
  /** How a multi-attachment package total was derived (Phase 2A.9). */
  total_mode?: 'sum_invoices' | 'grand_total' | 'single_page';
  /** Number of OCR'd attachments that contributed to this merged quote. */
  package_parts_count?: number;
  /** Which figure `total_amount` was resolved from for this page (Phase 2A.10/2D). */
  total_source?: FinancialTotalSource;
  /** Ranked candidate totals considered while resolving `total_amount`. */
  total_candidates?: FinancialTotalsParseResult['total_candidates'];
  /** Raw source text for each financial field, parsed in code (Phase 2D). */
  financial_field_sources?: FinancialTotalsParseResult['field_sources'];
  /** Dual-OCR cross-check of totals_block_text vs raw_text_original (Phase 3A). */
  financial_totals_verification?: DualFinancialTotalsVerification;
  /** Which transcription the selected financial totals came from (Phase 3A). */
  selected_financial_text_source?: FinancialTotalsParseSource | 'none';
  /** Invoice boundary detection for this attachment's PDF (Phase 4B.1, instrumentation only). */
  pdf_boundary_snapshot?: PdfBoundarySnapshot | null;
  /** Original PDF this invoice group was split from (Phase 4B.2). */
  invoice_group_source_file?: string | null;
  /** 1-based page numbers of the original PDF that make up this invoice (Phase 4B.2). */
  invoice_group_pages?: number[];
  /** Number of pages in this invoice group (Phase 4B.2). */
  invoice_group_page_count?: number;
  /** Stable id for this group within its source PDF, e.g. "ig1" (Phase 4B.2). */
  invoice_group_id?: string;
  /** How this group's total was produced (Phase 4B.2). */
  invoice_group_strategy?: InvoiceGroupStrategy;
  /** True when group pages could not be merged and a last-page due was used (Phase 4B.2). */
  invoice_group_partial_merge?: boolean;
  /** Short human warning when the group total is from a degraded path (Phase 4B.2). */
  invoice_group_warning?: string | null;
  /** Per-invoice audit for a summed multi-invoice package (Phase 2A.11). */
  invoice_parts?: InvoicePartAudit[];
}

export interface InvoicePartAudit {
  source_file_name: string;
  document_number: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  invoice_total?: number | null;
  amount_due?: number | null;
  balance_due?: number | null;
  total_due?: number | null;
  payments_credits?: number | null;
  total_source?: FinancialTotalSource;
  total_candidates?: FinancialTotalsParseResult['total_candidates'];
  financial_field_sources?: FinancialTotalsParseResult['field_sources'];
  /** Dual-OCR cross-check of totals_block_text vs raw_text_original (Phase 3A). */
  financial_totals_verification?: DualFinancialTotalsVerification;
  /** Which transcription the selected financial totals came from (Phase 3A). */
  selected_financial_text_source?: FinancialTotalsParseSource | 'none';
  /** Internal-contradiction audit for this invoice (Phase 2C). */
  consistency_audit?: InvoiceConsistencyAuditResult;
  raw_text: string;
  raw_text_original?: string | null;
  /** Verbatim totals-block transcription for this part (Phase 3). */
  totals_block_text?: string | null;
  /** Independent second-pass totals OCR for this part (Phase 3B). */
  independent_totals_block_text?: string | null;
  /** Which totals-block transcription fed dual verification (Phase 3B). */
  totals_block_input_source?: 'independent_totals_block_text' | 'totals_block_text' | 'none';
  /** Invoice boundary detection for this part's source PDF (Phase 4B.1, instrumentation only). */
  pdf_boundary_snapshot?: PdfBoundarySnapshot | null;
  /** Original PDF this invoice group was split from (Phase 4B.2). */
  invoice_group_source_file?: string | null;
  /** 1-based page numbers of the original PDF that make up this invoice (Phase 4B.2). */
  invoice_group_pages?: number[];
  /** Number of pages in this invoice group (Phase 4B.2). */
  invoice_group_page_count?: number;
  /** Stable id for this group within its source PDF (Phase 4B.2). */
  invoice_group_id?: string;
  /** How this group's total was produced (Phase 4B.2). */
  invoice_group_strategy?: InvoiceGroupStrategy;
  /** True when group pages could not be merged and a last-page due was used (Phase 4B.2). */
  invoice_group_partial_merge?: boolean;
  /** Short human warning when the group total is from a degraded path (Phase 4B.2). */
  invoice_group_warning?: string | null;
}

export const PROCUREMENT_AUTO_DESCRIPTION_EN =
  'Vendor quote uploaded from attachment. Please review the attached PDF / image and search matching local suppliers.';

export const PROCUREMENT_AUTO_DESCRIPTION_ZH =
  '已上传供应商报价附件，请查看 PDF / 图片报价资料，并搜索匹配的本地供应商。';

function lineItemAmount(amount: number): number | null {
  if (!Number.isFinite(amount) || amount === 0) return null;
  return amount;
}

export function isProcurementAutoTemplateDescription(descriptionEn: string, descriptionZh: string): boolean {
  const en = descriptionEn.trim();
  const zh = descriptionZh.trim();
  if (en === PROCUREMENT_AUTO_DESCRIPTION_EN || zh === PROCUREMENT_AUTO_DESCRIPTION_ZH) return true;
  if (en.startsWith('Vendor quote uploaded from attachment') && en.length < 220) return true;
  if (zh.startsWith('已上传供应商报价附件') && zh.includes('请查看 PDF')) return true;
  return false;
}

function mapOcrToParsedQuote(
  ocr: InvoiceOcrExtractedForDb,
  file: File,
  confidence: number | null,
): ParsedProcurementQuote {
  const summary = (ocr.description ?? '').trim();
  const raw = (ocr.raw_text ?? '').trim();
  // Phase 2D: the verbatim OCR transcription is the ONLY source of truth.
  const rawText = (ocr.raw_text_original ?? '').trim() || raw;
  // Phase 3B: prefer the INDEPENDENT second-pass totals OCR (uncorrelated with the
  // full-document read); fall back to the Call-A totals block transcription.
  const independentTotalsBlockText = (ocr.independent_totals_block_text ?? '').trim();
  const callATotalsBlockText = (ocr.totals_block_text ?? '').trim();
  const totalsBlockText = independentTotalsBlockText || callATotalsBlockText;
  const totalsBlockInputSource: 'independent_totals_block_text' | 'totals_block_text' | 'none' =
    independentTotalsBlockText
      ? 'independent_totals_block_text'
      : callATotalsBlockText
        ? 'totals_block_text'
        : 'none';
  const service_scope =
    summary ||
    rawText.slice(0, 500) ||
    '';

  // Line items are descriptive only; their amounts are NOT used for totals.
  const line_items = (ocr.line_items ?? []).map((it) => ({
    description: String(it.description ?? '').trim(),
    amount: lineItemAmount(it.amount),
  }));

  // Phase 3A: dual-OCR verification. Parse BOTH the dedicated totals-block
  // transcription and the full verbatim transcription, then pick the more
  // internally consistent / complete set. No amount is computed or corrected.
  const verification = verifyDualFinancialTotals({
    totalsBlockText,
    rawTextOriginal: rawText,
  });
  const totals = verification.selected;

  return {
    vendor_name: ocr.vendor_name?.trim() || null,
    document_number: ocr.invoice_number?.trim() || null,
    document_date: ocr.invoice_date?.trim() || null,
    subtotal: totals.subtotal,
    tax_amount: totals.sales_tax ?? totals.tax_amount,
    total_amount: totals.total_amount,
    invoice_total: totals.invoice_total,
    amount_due: totals.amount_due,
    balance_due: totals.balance_due,
    total_due: totals.total_due,
    payments_credits: totals.payments_credits,
    currency: ocr.currency?.trim() || 'CAD',
    service_scope,
    line_items,
    raw_text: rawText,
    raw_text_original: rawText,
    totals_block_text: callATotalsBlockText || undefined,
    independent_totals_block_text: independentTotalsBlockText || undefined,
    independent_totals_ocr_source: ocr.independent_totals_ocr_source?.trim() || undefined,
    totals_block_input_source: totalsBlockInputSource,
    confidence,
    source_file_name: file.name,
    source_mime_type: file.type || 'application/octet-stream',
    parsed_at: new Date().toISOString(),
    ocr_source: 'invoice-ocr',
    total_source: totals.total_source,
    total_candidates: totals.total_candidates,
    financial_field_sources: totals.field_sources,
    financial_totals_verification: verification,
    selected_financial_text_source: verification.selected_source,
  };
}

/** File → invoice-ocr → structured procurement quote (first attachment in Phase 1). */
export async function parseProcurementQuoteAttachment(
  file: File,
  langEn: boolean,
): Promise<ParsedProcurementQuote> {
  const result: InvoiceOcrInvokeResult = await invokeInvoiceOcrFromFile(file, langEn);
  return mapOcrToParsedQuote(result.extracted, file, result.confidence ?? null);
}

function isPdfAttachment(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  if (type.includes('pdf')) return true;
  return /\.pdf$/i.test(file.name || '');
}

/** Normalize an invoice/document number for grouping (case- and punctuation-insensitive). */
function normalizeDocNo(v: string | null | undefined): string {
  return (v ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

type PagePart = { pageNumber: number; part: ParsedProcurementQuote; file: File };

/**
 * Phase 4B.2 — group CONSECUTIVE pages by document number. A page with no
 * document number continues the current group (invoice spanning pages); a new,
 * different document number starts a new group. A leading null-doc group adopts
 * the first real number it sees. Exported for fixture tests.
 */
export function groupPagePartsByDocumentNumber(pageParts: PagePart[]): PagePart[][] {
  const groups: PagePart[][] = [];
  let current: PagePart[] | null = null;
  let currentDoc: string | null = null;

  for (const pp of pageParts) {
    const doc = normalizeDocNo(pp.part.document_number) || null;
    if (!current) {
      current = [pp];
      currentDoc = doc;
      continue;
    }
    if (doc == null) {
      // Unlabeled page → continuation of the current invoice.
      current.push(pp);
      continue;
    }
    if (currentDoc == null) {
      // Current group was unlabeled; adopt this number for it.
      currentDoc = doc;
      current.push(pp);
      continue;
    }
    if (doc === currentDoc) {
      current.push(pp);
      continue;
    }
    // Different invoice number → close current, open a new group.
    groups.push(current);
    current = [pp];
    currentDoc = doc;
  }
  if (current) groups.push(current);
  return groups;
}

type GroupInfo = {
  source: string;
  pages: number[];
  id: string;
  strategy: InvoiceGroupStrategy;
};

function annotateInvoiceGroup(part: ParsedProcurementQuote, info: GroupInfo): void {
  part.invoice_group_source_file = info.source;
  part.invoice_group_pages = info.pages;
  part.invoice_group_page_count = info.pages.length;
  part.invoice_group_id = info.id;
  part.invoice_group_strategy = info.strategy;
  const first = info.pages[0];
  const last = info.pages[info.pages.length - 1];
  part.source_file_name =
    info.pages.length > 1 ? `${info.source}#pages=${first}-${last}` : `${info.source}#page=${first}`;
}

/**
 * Last-page-due fallback (used only when a multi-page group's PDF cannot be
 * re-merged). The amount comes from the LAST page that carries an explicit
 * positive Due (totals usually print on the final page); raw_text / line_items
 * are concatenated across the group so context is preserved.
 */
function buildLastPageDueFallback(group: PagePart[]): ParsedProcurementQuote {
  let amountSource: ParsedProcurementQuote | null = null;
  for (let i = group.length - 1; i >= 0; i -= 1) {
    const p = group[i]!.part;
    const sel = p.financial_totals_verification?.selected;
    if (sel && hasExplicitPositiveDue(sel)) {
      amountSource = p;
      break;
    }
  }
  if (!amountSource) {
    for (let i = group.length - 1; i >= 0; i -= 1) {
      const p = group[i]!.part;
      if (typeof p.total_amount === 'number' && p.total_amount > 0) {
        amountSource = p;
        break;
      }
    }
  }
  const base = amountSource ?? group[group.length - 1]!.part;
  return {
    ...base,
    raw_text: group
      .map((g) => g.part.raw_text)
      .filter((t) => t && t.trim())
      .join('\n\n'),
    raw_text_original:
      group
        .map((g) => g.part.raw_text_original)
        .filter((t): t is string => Boolean(t && t.trim()))
        .join('\n\n') || base.raw_text_original,
    line_items: group.flatMap((g) => g.part.line_items).filter((it) => it && it.description),
  };
}

export type AttachmentPartsOptions = {
  /** Called when a single page's OCR fails (so callers can surface a coverage gap). */
  onPageError?: (pageNumber: number, error: unknown) => void;
};

/**
 * Phase 4B.2 — read a (possibly multi-invoice, scanned) PDF into one or more
 * invoice parts. A non-PDF, single-page, or unsplittable file yields exactly one
 * part (identical to `parseProcurementQuoteAttachment`). A multi-page PDF is
 * split, each page is OCR'd, consecutive pages with the same invoice number are
 * grouped, and each group becomes one part — so a cross-page invoice is NOT
 * double-counted, and a 3-invoice PDF yields 3 parts.
 *
 * Risk control: if all pages fail, or no page yields a document number, or only
 * one unique number is found, it falls back to a single whole-PDF OCR.
 */
export async function parseProcurementQuoteAttachmentToParts(
  file: File,
  langEn: boolean,
  options: AttachmentPartsOptions = {},
): Promise<ParsedProcurementQuote[]> {
  if (!isPdfAttachment(file)) {
    return [await parseProcurementQuoteAttachment(file, langEn)];
  }

  let pageFiles: Awaited<ReturnType<typeof splitPdfIntoSinglePageFiles>> = [];
  try {
    pageFiles = await splitPdfIntoSinglePageFiles(file);
  } catch {
    pageFiles = [];
  }

  // Single page or split unavailable → original whole-PDF OCR (unchanged behaviour).
  if (pageFiles.length <= 1) {
    return [await parseProcurementQuoteAttachment(file, langEn)];
  }

  // OCR each page independently.
  const pageParts: PagePart[] = [];
  for (const pf of pageFiles) {
    try {
      const part = await parseProcurementQuoteAttachment(pf.file, langEn);
      pageParts.push({ pageNumber: pf.page_number, part, file: pf.file });
    } catch (err) {
      options.onPageError?.(pf.page_number, err);
      console.warn('PROCUREMENT_PDF_PAGE_OCR_FAILED', {
        sourceFile: file.name,
        page: pf.page_number,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // All pages failed → fall back to a single whole-PDF OCR.
  if (pageParts.length === 0) {
    const whole = await parseProcurementQuoteAttachment(file, langEn);
    whole.invoice_group_source_file = file.name;
    whole.invoice_group_strategy = 'fallback_original_pdf';
    whole.invoice_group_warning = 'All page OCR attempts failed; used single whole-PDF OCR';
    return [whole];
  }

  // No page produced a document number → cannot reliably split → whole-PDF OCR.
  const anyDoc = pageParts.some((p) => normalizeDocNo(p.part.document_number));
  if (!anyDoc) {
    const whole = await parseProcurementQuoteAttachment(file, langEn);
    whole.invoice_group_source_file = file.name;
    whole.invoice_group_strategy = 'fallback_original_pdf';
    whole.invoice_group_warning =
      'Multi-page PDF but no invoice numbers detected; used single whole-PDF OCR';
    return [whole];
  }

  const groups = groupPagePartsByDocumentNumber(pageParts);
  const out: ParsedProcurementQuote[] = [];

  for (let gi = 0; gi < groups.length; gi += 1) {
    const group = groups[gi]!;
    const groupId = `ig${gi + 1}`;
    const pages = group.map((g) => g.pageNumber);

    if (group.length === 1) {
      const part = group[0]!.part;
      annotateInvoiceGroup(part, { source: file.name, pages, id: groupId, strategy: 'single_page' });
      out.push(part);
      continue;
    }

    // Multi-page invoice → prefer re-OCR of the merged group PDF (totals usually
    // live on the last page, so per-page reads may miss them).
    const mergedFile = await mergePdfPageFiles(
      group.map((g) => g.file),
      `${normalizeDocNo(group[0]!.part.document_number) || `group${gi + 1}`}.pdf`,
    );
    if (mergedFile) {
      try {
        const mergedPart = await parseProcurementQuoteAttachment(mergedFile, langEn);
        annotateInvoiceGroup(mergedPart, {
          source: file.name,
          pages,
          id: groupId,
          strategy: 'merged_pages',
        });
        out.push(mergedPart);
        continue;
      } catch (err) {
        console.warn('PROCUREMENT_PDF_GROUP_MERGE_OCR_FAILED', {
          sourceFile: file.name,
          pages,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Fallback: last page with an explicit Due drives the amount.
    const fallbackPart = buildLastPageDueFallback(group);
    annotateInvoiceGroup(fallbackPart, {
      source: file.name,
      pages,
      id: groupId,
      strategy: 'last_page_due_fallback',
    });
    fallbackPart.invoice_group_partial_merge = true;
    fallbackPart.invoice_group_warning = 'Group PDF merge unavailable; using last page due amount';
    out.push(fallbackPart);
  }

  return out;
}

function formatMoney(amount: number | null, currency: string): string {
  if (amount == null || !Number.isFinite(amount)) return '—';
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatLineItemsEn(parsed: ParsedProcurementQuote): string {
  const rows = parsed.line_items.filter((it) => it.description);
  if (rows.length === 0) return '—';
  return rows
    .map((it) => {
      const amt =
        it.amount != null
          ? ` (${formatMoney(it.amount, parsed.currency)})`
          : '';
      return `- ${it.description}${amt}`;
    })
    .join('\n');
}

function formatLineItemsZh(parsed: ParsedProcurementQuote): string {
  const rows = parsed.line_items.filter((it) => it.description);
  if (rows.length === 0) return '—';
  return rows
    .map((it) => {
      const amt =
        it.amount != null
          ? `（${formatMoney(it.amount, parsed.currency)}）`
          : '';
      return `- ${it.description}${amt}`;
    })
    .join('\n');
}

export function buildProcurementDescriptionFromParsedQuote(parsed: ParsedProcurementQuote): {
  description_en: string;
  description_zh: string;
} {
  const vendor = parsed.vendor_name || '—';
  const amount = formatMoney(parsed.total_amount, parsed.currency);
  const scope = parsed.service_scope || '—';
  const docNo = parsed.document_number || '—';
  const docDate = parsed.document_date || '—';

  const description_en = [
    'Vendor quote parsed from attachment:',
    `Vendor: ${vendor}`,
    `Amount: ${amount}`,
    `Document #: ${docNo}`,
    `Date: ${docDate}`,
    `Scope: ${scope}`,
    'Line items:',
    formatLineItemsEn(parsed),
  ].join('\n');

  const description_zh = [
    '已从报价附件读取供应商报价：',
    `供应商：${vendor}`,
    `金额：${amount}`,
    `单据编号：${docNo}`,
    `日期：${docDate}`,
    `服务范围：${scope}`,
    '明细：',
    formatLineItemsZh(parsed),
  ].join('\n');

  return { description_en, description_zh };
}

export function mergeProcurementDescriptionsWithOcr(opts: {
  baseDescriptionEn: string;
  baseDescriptionZh: string;
  ocrSummaryEn: string;
  ocrSummaryZh: string;
  userEnteredDescription: boolean;
}): { description_en: string; description_zh: string } {
  const { baseDescriptionEn, baseDescriptionZh, ocrSummaryEn, ocrSummaryZh, userEnteredDescription } =
    opts;

  if (!userEnteredDescription || isProcurementAutoTemplateDescription(baseDescriptionEn, baseDescriptionZh)) {
    return { description_en: ocrSummaryEn, description_zh: ocrSummaryZh };
  }

  const en = baseDescriptionEn.trim();
  const zh = baseDescriptionZh.trim();
  return {
    description_en: `${en}\n\nOCR extracted quote summary:\n${ocrSummaryEn}`,
    description_zh: `${zh}\n\nOCR 识别的报价摘要：\n${ocrSummaryZh}`,
  };
}
