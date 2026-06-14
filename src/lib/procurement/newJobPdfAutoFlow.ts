import { supabase } from '../supabase';
import { fetchUrlAsInvoiceFile } from '../invoiceOcrClient';
import {
  analyzeProcurementQuoteFromFile,
  type ProcurementQuoteAnalysis,
} from './analyzeProcurementQuotePdf';
import {
  parseProcurementQuoteAttachment,
  type ParsedProcurementQuote,
} from './parseProcurementQuoteAttachment';
import { callSearchQuotes, type SearchQuotesVendor } from './callSearchQuotes';
import { buildSearchQuoteContext } from './buildQuoteContext';
import { recoverGrandTotal } from './grandTotalRecovery';
import { auditInvoicePartConsistency } from './invoiceConsistencyAudit';
import { saveVendorSearchResults } from './saveVendorSearchResults';
import {
  suggestAuthorizationType,
  type ProcurementAuthorizationType,
} from './authorizationType';
import { detectPdfInvoiceBoundaries } from './pdfInvoiceBoundary';

export type { ProcurementQuoteAnalysis };
export type { ParsedProcurementQuote };

/**
 * Bundled quote understanding for a single attachment.
 * - `analysis`: thin analyze-procurement-quote result (category/description/currentPrice) — always present, used as fallback.
 * - `parsedQuote`: rich invoice-ocr structured quote (vendor / amount / scope / line_items) — null when OCR fails.
 */
export type ProcurementQuoteInterpretation = {
  analysis: ProcurementQuoteAnalysis;
  parsedQuote: ParsedProcurementQuote | null;
  /** Short, sanitized reason the rich invoice-ocr parse failed (no stack / tokens). */
  ocrErrorMessage?: string;
};

/** Extra context used to enrich parsed_quote_json when rich OCR is unavailable. */
export type ParsedQuoteFallbackMeta = {
  title?: string | null;
  description?: string | null;
  fileName?: string | null;
  ocrErrorMessage?: string | null;
};

/** Company-name suffix/keyword tokens used to spot a vendor in free text (uppercase names). */
const VENDOR_SUFFIX_KEYWORDS = [
  'INC',
  'LTD',
  'LIMITED',
  'CORP',
  'CORPORATION',
  'MECHANICAL',
  'PLUMBING',
  'HEATING',
  'ELECTRIC',
  'ELECTRICAL',
  'CONSTRUCTION',
  'CONTRACTING',
  'SERVICES',
  'ENTERPRISES',
];

const VENDOR_COMPANY_RE = new RegExp(
  `[A-Z][A-Z0-9&.,'’\\- ]*\\b(?:${VENDOR_SUFFIX_KEYWORDS.join('|')})\\b\\.?`,
);

const QUOTE_LABEL_RE =
  /^(?:supplier\s+quote|vendor\s+quote|quote|供应商报价|报价单|报价)\s*[-–—:：]\s*/i;

function tidyVendor(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/[\s,;:–\-]+$/g, '').trim();
}

/** Strip file extension, trailing price, and a leading "Quote -" style label. */
function cleanVendorCandidate(raw: string): string {
  let s = raw.trim();
  s = s.replace(/\.(pdf|png|jpe?g|webp|heic|docx?)$/i, '');
  s = s.replace(/\s*[-–—|]\s*\$?\s*[\d,]+(?:\.\d+)?.*$/, '').trim();
  s = s.replace(QUOTE_LABEL_RE, '').trim();
  return s;
}

function extractVendorFromText(text: string, hadLabel: boolean): string | null {
  const t = text.trim();
  if (!t) return null;
  const match = t.match(VENDOR_COMPANY_RE);
  if (match) return tidyVendor(match[0]);
  // Explicit "Quote - X" remainder that is uppercase-dominant and short → treat as vendor.
  if (hadLabel && /[A-Z]{2,}/.test(t) && t.length <= 80) return tidyVendor(t);
  return null;
}

/**
 * Best-effort vendor name from non-OCR sources (file name, title, description).
 * Returns null when nothing plausible is found — never fabricates a vendor.
 */
export function extractVendorFromFallbackSources(opts: {
  title?: string | null;
  description?: string | null;
  fileName?: string | null;
  analysis?: ProcurementQuoteAnalysis | null;
}): string | null {
  const sources: string[] = [];
  if (opts.fileName) sources.push(opts.fileName);
  if (opts.title) sources.push(opts.title);
  if (opts.description) sources.push(opts.description);
  if (opts.analysis?.description) sources.push(opts.analysis.description);

  for (const src of sources) {
    if (!src) continue;
    const hadLabel = QUOTE_LABEL_RE.test(src.trim());
    const cleaned = cleanVendorCandidate(src);
    const vendor = extractVendorFromText(cleaned, hadLabel);
    if (vendor) return vendor;
  }
  return null;
}

/** Infer a coarse pricing basis from free text. Never defaults to monthly. */
export function inferFallbackPricingBasis(text: string): string | null {
  const t = (text || '').toLowerCase();
  if (!t) return null;
  if (/\b(monthly|per month|recurring|contract)\b/.test(t)) return 'monthly';
  // Yearly mentions are not one-time; leave basis unknown rather than mislabel.
  if (/\b(yearly|annual|annually|per year|per annum)\b/.test(t)) return null;
  if (
    /\b(installation|install|replacement|replace|supply and install|project|quoted amount|current quote)\b/.test(
      t,
    )
  ) {
    return 'one-time';
  }
  return null;
}

/**
 * Build procurement_jobs.parsed_quote_json.
 * Prefers the rich invoice-ocr parse; falls back to the thin analyze-procurement-quote
 * result enriched with vendor / pricing-basis / scope / line-item hints. Never throws.
 */
function parseAmountNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = parseFloat(value.replace(/[^\d.-]/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function buildParsedQuoteJson(
  analysis: ProcurementQuoteAnalysis,
  parsedQuote: ParsedProcurementQuote | null | undefined,
  fallbackMeta?: ParsedQuoteFallbackMeta,
  authorizedAmount?: number | null,
): Record<string, unknown> {
  if (parsedQuote) {
    const out: Record<string, unknown> = {
      analysis_source: 'invoice-ocr',
      ...parsedQuote,
      // Keep the thin analysis fields as supplementary context (category labelling, price hint).
      category: analysis.category || '',
      analysis_description: analysis.description || '',
      currentPrice: analysis.currentPrice || '',
    };

    // Record how the package total was derived (Phase 2A.9).
    out.total_mode = parsedQuote.total_mode ?? 'single_page';
    out.package_parts_count = parsedQuote.package_parts_count ?? 1;

    // For a summed multi-invoice package the total is authoritative — do not let
    // Grand Total Recovery re-pick a single page's figure from raw_text.
    if (parsedQuote.total_mode === 'sum_invoices') {
      out.grand_total_recovered = false;
      out.grand_total_recovered_from = null;
      out.grand_total_candidates = [];
      return out;
    }

    // Grand Total Recovery v2: the thin analyzer's currentPrice (or an explicit
    // authorized amount) is the REFERENCE for re-checking the OCR total. The
    // authorized amount is never written back — only real document figures.
    const authRef = authorizedAmount ?? parseAmountNumber(analysis.currentPrice);
    const recovery = recoverGrandTotal({ authorizedAmount: authRef, parsedQuoteJson: out });
    out.grand_total_recovered = recovery.recovered;
    out.grand_total_recovered_from =
      recovery.recoveredFrom === 'none' ? null : recovery.recoveredFrom;
    out.grand_total_candidates = recovery.candidates;
    if (recovery.recovered && recovery.recoveredAmount != null) {
      out.total_amount = recovery.recoveredAmount;
    }

    return out;
  }

  // Thin path: rich OCR did not produce structured data — enrich from available text.
  const out: Record<string, unknown> = {
    analysis_source: 'analyze-procurement-quote',
    ocr_failed: true,
    ...analysis,
  };

  const ocrErrorMessage = fallbackMeta?.ocrErrorMessage?.trim();
  if (ocrErrorMessage) out.ocr_error_message = ocrErrorMessage;

  const vendor = extractVendorFromFallbackSources({
    title: fallbackMeta?.title,
    description: fallbackMeta?.description,
    fileName: fallbackMeta?.fileName,
    analysis,
  });
  if (vendor) out.vendor_name = vendor;

  const pricingBasis = inferFallbackPricingBasis(
    [fallbackMeta?.title, analysis.description, fallbackMeta?.description]
      .filter(Boolean)
      .join(' '),
  );
  if (pricingBasis) out.pricing_basis = pricingBasis;

  const serviceScope = (analysis.description || fallbackMeta?.description || '').trim();
  if (serviceScope) {
    out.service_scope = serviceScope;
    // Only synthesize a line item when the scope is specific enough to be useful.
    if (serviceScope.length >= 12) {
      out.line_items = [{ description: serviceScope, amount: null }];
    }
  }

  return out;
}

const VENDOR_SEARCH_WAIT_MS = 15_000;
const INFLIGHT_SEARCH_KEY_PREFIX = 'vendor_search_inflight_';

export function markVendorSearchInflight(jobId: string): void {
  try {
    sessionStorage.setItem(`${INFLIGHT_SEARCH_KEY_PREFIX}${jobId}`, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function clearVendorSearchInflight(jobId: string): void {
  try {
    sessionStorage.removeItem(`${INFLIGHT_SEARCH_KEY_PREFIX}${jobId}`);
  } catch {
    /* ignore */
  }
}

export function isVendorSearchInflight(jobId: string): boolean {
  try {
    return Boolean(sessionStorage.getItem(`${INFLIGHT_SEARCH_KEY_PREFIX}${jobId}`));
  } catch {
    return false;
  }
}

/**
 * Build job form fields from the thin analysis.
 *
 * When the package OCR produced an authoritative total (`packageTotal`), it is
 * preferred over the primary page's `currentPrice` for both the title price
 * suffix and the estimated budget — so a multi-invoice package shows its summed
 * total instead of just the first invoice (Phase 2A.9).
 */
export function applyAnalysisToJobFields(
  analysis: ProcurementQuoteAnalysis,
  packageTotal?: { amount: number; currency?: string | null } | null,
) {
  const categoryLabel = analysis.category || 'procurement';
  const descEn = [
    analysis.description,
    analysis.currentPrice ? `Current quote on file: ${analysis.currentPrice}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const usePackageTotal =
    !!packageTotal && Number.isFinite(packageTotal.amount) && packageTotal.amount > 0;
  const budgetMatch = analysis.currentPrice?.match(/[\d,]+(?:\.\d+)?/);

  const descriptionTrimmed = (analysis.description ?? '').trim();
  const priceLabel = usePackageTotal
    ? `${packageTotal!.currency || 'CAD'} $${packageTotal!.amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : (analysis.currentPrice ?? '').trim();
  const truncatedDescription =
    descriptionTrimmed.length > 40
      ? `${descriptionTrimmed.slice(0, 40)}…`
      : descriptionTrimmed;
  const priceSuffix = priceLabel ? ` - ${priceLabel}` : '';

  const title_en = truncatedDescription
    ? `${truncatedDescription}${priceSuffix}`
    : `${categoryLabel} — vendor quote review`;
  const title_zh = truncatedDescription
    ? `${truncatedDescription}${priceSuffix}`
    : `${categoryLabel} 报价审核`;

  return {
    category: analysis.category,
    title_en,
    title_zh,
    description_en: descEn,
    description_zh: analysis.description,
    estimated_budget: usePackageTotal
      ? String(packageTotal!.amount)
      : budgetMatch
        ? budgetMatch[0].replace(/,/g, '')
        : '',
  };
}

export async function analyzeQuoteAttachment(
  attachmentUrl: string,
  attachmentName: string,
): Promise<ProcurementQuoteAnalysis> {
  const file = await fetchUrlAsInvoiceFile(attachmentUrl, attachmentName || 'quote.pdf');
  return analyzeProcurementQuoteFromFile(file);
}

export type QuotePackageAttachment = { url: string; name: string };

/** First non-empty string across parsed parts, for a given selector. */
function firstNonEmptyStr(
  parts: ParsedProcurementQuote[],
  sel: (p: ParsedProcurementQuote) => string | null | undefined,
): string | null {
  for (const p of parts) {
    const v = (sel(p) ?? '').toString().trim();
    if (v) return v;
  }
  return null;
}

/**
 * Detect a package made of multiple independent invoices / payment pages, where
 * the real total is the SUM of pages (not one page or the largest page).
 *
 * Phase 2D.1 — multi-file uploads are treated as an invoice package by default.
 * We no longer require EVERY part to carry a total or distinct document numbers;
 * a single OCR page missing a doc number / keyword must not collapse the whole
 * package back to grand_total mode.
 *
 * Returns true when:
 *   1. more than one part, AND
 *   2. at least two parts have a positive total_amount, AND
 *   3. any one of:
 *      - at least two distinct document numbers
 *      - at least two parts whose text contains invoice / balance due /
 *        amount due / total due wording
 *      - the parts came from more than one source file
 */
function isMultipleInvoicePackage(parts: ParsedProcurementQuote[]): boolean {
  if (parts.length <= 1) return false;

  const partsWithTotal = parts.filter(
    (p) => typeof p.total_amount === 'number' && Number.isFinite(p.total_amount) && p.total_amount > 0,
  ).length;
  if (partsWithTotal < 2) return false;

  const distinctDocNumbers = new Set(
    parts.map((p) => (p.document_number ?? '').trim().toLowerCase()).filter(Boolean),
  ).size;

  const invoiceWordingCount = parts.filter((p) =>
    /\b(invoice|balance\s+due|amount\s+due|total\s+due|payments?)\b/i.test(
      `${p.raw_text_original ?? ''}\n${p.raw_text ?? ''}`,
    ),
  ).length;

  const distinctSourceFiles = new Set(
    parts.map((p) => (p.source_file_name ?? '').trim().toLowerCase()).filter(Boolean),
  ).size;

  return distinctDocNumbers >= 2 || invoiceWordingCount >= 2 || distinctSourceFiles >= 2;
}

/**
 * Merge per-page invoice-ocr parses into one quote understanding for the package.
 *
 * - Multiple independent invoices (Phase 2A.9): total = SUM of all pages.
 * - Otherwise (single multi-page quote): keep the largest page total; raw_text is
 *   concatenated so Grand Total Recovery can still find a labelled grand total.
 * - line_items / raw_text are always concatenated across pages.
 */
function mergeParsedQuotes(parts: ParsedProcurementQuote[]): ParsedProcurementQuote {
  if (parts.length === 1) {
    return { ...parts[0]!, total_mode: 'single_page', package_parts_count: 1 };
  }

  const common = {
    vendor_name: firstNonEmptyStr(parts, (p) => p.vendor_name),
    document_number: firstNonEmptyStr(parts, (p) => p.document_number),
    document_date: firstNonEmptyStr(parts, (p) => p.document_date),
    currency: firstNonEmptyStr(parts, (p) => p.currency) || 'CAD',
    service_scope: firstNonEmptyStr(parts, (p) => p.service_scope) || '',
    line_items: parts.flatMap((p) => p.line_items).filter((it) => it && it.description),
    raw_text: parts.map((p) => p.raw_text).filter((t) => t && t.trim()).join('\n\n'),
    raw_text_original: parts
      .map((p) => p.raw_text_original)
      .filter((t): t is string => Boolean(t && t.trim()))
      .join('\n\n'),
    source_file_name: parts[0]!.source_file_name,
    source_mime_type: parts[0]!.source_mime_type,
    parsed_at: new Date().toISOString(),
    ocr_source: 'invoice-ocr' as const,
    package_parts_count: parts.length,
  };

  if (isMultipleInvoicePackage(parts)) {
    const sumOf = (sel: (p: ParsedProcurementQuote) => number | null): number =>
      parts.reduce((acc, p) => acc + (sel(p) ?? 0), 0);
    const subtotalSum = sumOf((p) => p.subtotal);
    const taxSum = sumOf((p) => p.tax_amount);

    // Per-invoice audit so reviewers can trace how the package total was summed,
    // plus a consistency check (Phase 2C) that flags OCR contradictions without
    // changing the authoritative payable total.
    const invoice_parts = parts.map((p) => ({
      source_file_name: p.source_file_name,
      document_number: p.document_number,
      subtotal: p.subtotal,
      tax_amount: p.tax_amount,
      total_amount: p.total_amount,
      invoice_total: p.invoice_total ?? null,
      amount_due: p.amount_due ?? null,
      balance_due: p.balance_due ?? null,
      total_due: p.total_due ?? null,
      payments_credits: p.payments_credits ?? null,
      total_source: p.total_source,
      total_candidates: p.total_candidates,
      financial_field_sources: p.financial_field_sources,
      financial_totals_verification: p.financial_totals_verification,
      selected_financial_text_source: p.selected_financial_text_source,
      consistency_audit: auditInvoicePartConsistency({
        subtotal: p.subtotal,
        tax_amount: p.tax_amount,
        invoice_total: p.invoice_total,
        total_amount: p.total_amount,
        amount_due: p.amount_due,
        balance_due: p.balance_due,
        total_due: p.total_due,
        payments_credits: p.payments_credits,
        total_source: p.total_source,
      }),
      raw_text: p.raw_text,
      raw_text_original: p.raw_text_original ?? null,
      totals_block_text: p.totals_block_text ?? null,
      independent_totals_block_text: p.independent_totals_block_text ?? null,
      totals_block_input_source: p.totals_block_input_source,
      pdf_boundary_snapshot: p.pdf_boundary_snapshot ?? null,
    }));

    return {
      ...common,
      subtotal: subtotalSum > 0 ? subtotalSum : null,
      tax_amount: taxSum > 0 ? taxSum : null,
      total_amount: sumOf((p) => p.total_amount),
      confidence: parts[0]!.confidence,
      total_mode: 'sum_invoices',
      invoice_parts,
    };
  }

  // Single multi-page quote: the grand total lives on one page (largest total).
  const authoritative = [...parts].sort(
    (a, b) => (b.total_amount ?? 0) - (a.total_amount ?? 0),
  )[0]!;
  return {
    ...common,
    subtotal: authoritative.subtotal,
    tax_amount: authoritative.tax_amount,
    total_amount: authoritative.total_amount,
    confidence: authoritative.confidence,
    total_mode: 'grand_total',
  };
}

/**
 * Interpret a full quote package (one supplier, possibly multiple attachments).
 *
 * Runs the thin analyze-procurement-quote on the primary attachment (drives job
 * fields), and the rich invoice-ocr parse on EVERY attachment, then merges them
 * so multi-page packages (e.g. grand total on the last page) are understood.
 * OCR failure on any/all pages never blocks job creation.
 */
export async function interpretQuotePackage(
  attachments: QuotePackageAttachment[],
  langEn: boolean,
): Promise<ProcurementQuoteInterpretation> {
  const list = attachments.filter((a) => a?.url);
  if (list.length === 0) {
    throw new Error('No quote attachments to interpret');
  }

  const primary = list[0]!;
  const primaryFile = await fetchUrlAsInvoiceFile(primary.url, primary.name || 'quote.pdf');
  const analysis = await analyzeProcurementQuoteFromFile(primaryFile);

  const parsedParts: ParsedProcurementQuote[] = [];
  let ocrErrorMessage: string | undefined;
  for (const att of list) {
    try {
      const file =
        att.url === primary.url
          ? primaryFile
          : await fetchUrlAsInvoiceFile(att.url, att.name || 'quote.pdf');
      const parsed = await parseProcurementQuoteAttachment(file, langEn);
      // Phase 4B.1 — record an invoice-boundary snapshot per attachment.
      // Instrumentation only: never throws, never alters totals or part count.
      try {
        const snapshot = await detectPdfInvoiceBoundaries(file);
        if (snapshot) parsed.pdf_boundary_snapshot = snapshot;
      } catch (boundaryErr) {
        console.warn('PROCUREMENT_PDF_BOUNDARY_DETECT_FAILED', {
          attachmentUrl: att.url,
          error: boundaryErr instanceof Error ? boundaryErr.message : String(boundaryErr),
        });
      }
      parsedParts.push(parsed);
    } catch (err) {
      if (!ocrErrorMessage) ocrErrorMessage = sanitizeOcrError(err);
      console.warn('PROCUREMENT_QUOTE_OCR_PARSE_FAILED', {
        attachmentUrl: att.url,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const parsedQuote = parsedParts.length > 0 ? mergeParsedQuotes(parsedParts) : null;
  return { analysis, parsedQuote, ocrErrorMessage };
}

/**
 * Single-attachment convenience wrapper around interpretQuotePackage.
 *
 * If the rich OCR fails, `parsedQuote` is null and the flow continues on the
 * thin analysis — OCR failure must never block job creation.
 */
export async function interpretQuoteAttachment(
  attachmentUrl: string,
  attachmentName: string,
  langEn: boolean,
): Promise<ProcurementQuoteInterpretation> {
  return interpretQuotePackage([{ url: attachmentUrl, name: attachmentName }], langEn);
}

/** Short, DB-safe OCR failure reason: name + message, tokens redacted, no stack trace. */
function sanitizeOcrError(err: unknown): string {
  const name = err instanceof Error ? err.name || 'Error' : 'Error';
  const rawMsg = err instanceof Error ? err.message : String(err);
  const msg = (rawMsg || '')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/eyJ[A-Za-z0-9._-]{10,}/g, '[redacted]')
    .replace(/\s+/g, ' ')
    .trim();
  return `${name}: ${msg}`.slice(0, 300);
}

export type CreateProcurementJobParams = {
  propertyId: string;
  profileId: string;
  /** Primary attachment (first page); used for fallback vendor extraction. */
  attachmentUrl: string;
  /** Full quote package — all attachment URLs are saved to procurement_photos. */
  attachmentUrls?: string[];
  analysis: ProcurementQuoteAnalysis;
  /** Rich invoice-ocr parse; when present it is stored in parsed_quote_json. */
  parsedQuote?: ParsedProcurementQuote | null;
  /** Original uploaded file name; primary source for fallback vendor extraction. */
  attachmentName?: string | null;
  /** Sanitized OCR failure reason from interpretQuoteAttachment. */
  ocrErrorMessage?: string | null;
  linkedTaskId: string;
  priority: string;
  unitNumber: string;
  authorizationType?: ProcurementAuthorizationType | null;
  crfBalance?: number | null;
};

export async function createProcurementJobFromAnalysis(
  params: CreateProcurementJobParams,
): Promise<{ jobId: string }> {
  // When package OCR succeeded, prefer its (possibly summed) total over the
  // primary page's currentPrice for title / estimated_budget (Phase 2A.9).
  const packageTotalNum = parseAmountNumber(params.parsedQuote?.total_amount);
  const packageTotal =
    packageTotalNum != null && packageTotalNum > 0
      ? { amount: packageTotalNum, currency: params.parsedQuote?.currency ?? null }
      : null;
  const fields = applyAnalysisToJobFields(params.analysis, packageTotal);
  const budgetNum = fields.estimated_budget ? parseFloat(fields.estimated_budget) : 0;
  const authorizationType =
    params.authorizationType ??
    suggestAuthorizationType({
      estimatedBudget: budgetNum,
      priority: params.priority,
      crfBalance: params.crfBalance,
    });

  const { data, error: insertError } = await supabase
    .from('procurement_jobs')
    .insert({
      property_id: params.propertyId,
      posted_by: params.profileId,
      title_en: fields.title_en,
      title_zh: fields.title_zh,
      description_en: fields.description_en,
      description_zh: fields.description_zh,
      estimated_budget: Number.isFinite(budgetNum) ? budgetNum : 0,
      status: 'collecting_quotes',
      job_type: 'procurement',
      priority: params.priority,
      category: fields.category || '',
      unit_number: params.unitNumber,
      task_id: params.linkedTaskId.trim() || null,
      authorization_type: authorizationType,
      parsed_quote_json: buildParsedQuoteJson(
        params.analysis,
        params.parsedQuote,
        {
          title: fields.title_en,
          description: params.analysis.description,
          fileName: params.attachmentName ?? null,
          ocrErrorMessage: params.ocrErrorMessage ?? null,
        },
        Number.isFinite(budgetNum) && budgetNum > 0 ? budgetNum : null,
      ),
    })
    .select()
    .single();

  if (insertError || !data) {
    throw new Error(insertError?.message || 'Failed to create job');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    // Save the WHOLE quote package (one job, many attachments), de-duplicated.
    const urls = (params.attachmentUrls && params.attachmentUrls.length > 0
      ? params.attachmentUrls
      : [params.attachmentUrl]
    ).filter((u): u is string => Boolean(u && u.trim()));
    const uniqueUrls = Array.from(new Set(urls));
    if (uniqueUrls.length > 0) {
      const { error: photoInsertError } = await supabase.from('procurement_photos').insert(
        uniqueUrls.map((photo_url) => ({
          job_id: data.id,
          photo_url,
          photo_type: 'request',
          uploaded_by: user.id,
        })),
      );
      if (photoInsertError) {
        console.warn('PROCUREMENT_PHOTOS_INSERT_FAILED', photoInsertError);
      }
    }
  }

  return { jobId: data.id };
}

export function buildSearchDescription(analysis: ProcurementQuoteAnalysis): string {
  return (
    analysis.description +
    (analysis.currentPrice ? ` Reference: ${analysis.currentPrice}.` : '')
  );
}

export type SearchAndSaveVendorsParams = {
  propertyId: string;
  jobId: string;
  analysis: ProcurementQuoteAnalysis;
  attachmentUrl: string;
  /** Rich OCR parse, if available. Used to build a compressed search context. */
  parsedQuote?: ParsedProcurementQuote | null;
};

export async function searchAndSaveVendorsForJob(
  params: SearchAndSaveVendorsParams,
): Promise<{ vendors: SearchQuotesVendor[]; searchCount: number }> {
  markVendorSearchInflight(params.jobId);
  try {
    return await searchAndSaveVendorsForJobInner(params);
  } finally {
    clearVendorSearchInflight(params.jobId);
  }
}

async function searchAndSaveVendorsForJobInner(
  params: SearchAndSaveVendorsParams,
): Promise<{ vendors: SearchQuotesVendor[]; searchCount: number }> {
  const fields = applyAnalysisToJobFields(params.analysis);
  const searchDescription = buildSearchDescription(params.analysis);

  // Prefer compressed structured context; only fall back to the raw PDF attachment
  // when there is no parsed quote. Sending both would risk Claude token overflow.
  const quoteContext = params.parsedQuote
    ? buildSearchQuoteContext(buildParsedQuoteJson(params.analysis, params.parsedQuote))
    : '';

  const result = await callSearchQuotes({
    property_id: params.propertyId,
    job_id: params.jobId,
    title: fields.title_zh || fields.title_en,
    description: searchDescription,
    category: fields.category || params.analysis.category || undefined,
    current_price: params.analysis.currentPrice || undefined,
    attachment_urls: quoteContext ? undefined : [params.attachmentUrl],
    quote_context: quoteContext || undefined,
  });

  if (!result.success) {
    throw new Error(result.error || 'Vendor search failed');
  }

  const vendors = result.vendors ?? [];
  if (vendors.length > 0) {
    const { error: saveError } = await saveVendorSearchResults({
      propertyId: params.propertyId,
      jobId: params.jobId,
      vendors,
    });
    if (saveError) {
      throw new Error(saveError.message || 'Failed to save vendor search results');
    }
  }

  return {
    vendors,
    searchCount: result.ai_search_count ?? vendors.length,
  };
}

/** Wait up to `timeoutMs` for vendor search+save; continues in background if timed out. */
export async function waitForVendorSearchWithTimeout(
  searchPromise: Promise<{ vendors: SearchQuotesVendor[]; searchCount: number }>,
  timeoutMs = VENDOR_SEARCH_WAIT_MS,
): Promise<{
  completed: boolean;
  vendors: SearchQuotesVendor[];
  searchCount: number;
}> {
  let backgroundError: Error | null = null;
  const tracked = searchPromise.catch((err: unknown) => {
    backgroundError = err instanceof Error ? err : new Error(String(err));
    return { vendors: [] as SearchQuotesVendor[], searchCount: 0 };
  });

  const timeout = new Promise<{ completed: false }>((resolve) => {
    setTimeout(() => resolve({ completed: false }), timeoutMs);
  });

  const raced = await Promise.race([
    tracked.then((r) => ({ completed: true as const, ...r })),
    timeout,
  ]);

  if (raced.completed) {
    if (backgroundError) throw backgroundError;
    return {
      completed: true,
      vendors: raced.vendors,
      searchCount: raced.searchCount,
    };
  }

  void tracked.then((r) => {
    if (backgroundError) {
      console.error('PDF_AUTO_FLOW_BACKGROUND_SEARCH_ERROR', backgroundError);
    } else {
      console.log('PDF_AUTO_FLOW_BACKGROUND_SEARCH_DONE', {
        vendorCount: r.vendors.length,
        searchCount: r.searchCount,
      });
    }
  });

  return { completed: false, vendors: [], searchCount: 0 };
}

/** @deprecated Use createProcurementJobFromAnalysis + searchAndSaveVendorsForJob */
export async function createJobAndSearchAfterAnalysis(
  params: CreateProcurementJobParams,
): Promise<{
  jobId: string;
  vendors: SearchQuotesVendor[];
  searchCount: number;
}> {
  const { jobId } = await createProcurementJobFromAnalysis(params);
  const { vendors, searchCount } = await searchAndSaveVendorsForJob({
    propertyId: params.propertyId,
    jobId,
    analysis: params.analysis,
    attachmentUrl: params.attachmentUrl,
  });
  return { jobId, vendors, searchCount };
}

export async function runNewJobPdfAutoFlow(params: {
  propertyId: string;
  profileId: string;
  attachmentUrl: string;
  attachmentName: string;
  linkedTaskId: string;
  priority: string;
  unitNumber: string;
}): Promise<{
  jobId: string;
  analysis: ProcurementQuoteAnalysis;
  vendors: SearchQuotesVendor[];
  searchCount: number;
  searchCompleted: boolean;
}> {
  const analysis = await analyzeQuoteAttachment(params.attachmentUrl, params.attachmentName);
  const { jobId } = await createProcurementJobFromAnalysis({
    propertyId: params.propertyId,
    profileId: params.profileId,
    attachmentUrl: params.attachmentUrl,
    analysis,
    linkedTaskId: params.linkedTaskId,
    priority: params.priority,
    unitNumber: params.unitNumber,
  });

  const searchPromise = searchAndSaveVendorsForJob({
    propertyId: params.propertyId,
    jobId,
    analysis,
    attachmentUrl: params.attachmentUrl,
  });

  const { completed, vendors, searchCount } = await waitForVendorSearchWithTimeout(searchPromise);

  return {
    jobId,
    analysis,
    vendors,
    searchCount,
    searchCompleted: completed,
  };
}
