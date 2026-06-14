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
  type DualFinancialTotalsVerification,
  type FinancialTotalsParseSource,
} from './dualFinancialTotalsVerification';
import type { InvoiceConsistencyAuditResult } from './invoiceConsistencyAudit';

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
  /** Verbatim transcription of just the totals block (Phase 3). */
  totals_block_text?: string;
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
  // Phase 3: the model also transcribes the totals block on its own; prefer it.
  const totalsBlockText = (ocr.totals_block_text ?? '').trim();
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
    totals_block_text: totalsBlockText || undefined,
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
