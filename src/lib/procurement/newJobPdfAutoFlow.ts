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
import { saveVendorSearchResults } from './saveVendorSearchResults';
import {
  suggestAuthorizationType,
  type ProcurementAuthorizationType,
} from './authorizationType';

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
export function buildParsedQuoteJson(
  analysis: ProcurementQuoteAnalysis,
  parsedQuote: ParsedProcurementQuote | null | undefined,
  fallbackMeta?: ParsedQuoteFallbackMeta,
): Record<string, unknown> {
  if (parsedQuote) {
    return {
      analysis_source: 'invoice-ocr',
      ...parsedQuote,
      // Keep the thin analysis fields as supplementary context (category labelling, price hint).
      category: analysis.category || '',
      analysis_description: analysis.description || '',
      currentPrice: analysis.currentPrice || '',
    };
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

export function applyAnalysisToJobFields(analysis: ProcurementQuoteAnalysis) {
  const categoryLabel = analysis.category || 'procurement';
  const descEn = [
    analysis.description,
    analysis.currentPrice ? `Current quote on file: ${analysis.currentPrice}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const budgetMatch = analysis.currentPrice?.match(/[\d,]+(?:\.\d+)?/);

  const descriptionTrimmed = (analysis.description ?? '').trim();
  const priceTrimmed = (analysis.currentPrice ?? '').trim();
  const truncatedDescription =
    descriptionTrimmed.length > 40
      ? `${descriptionTrimmed.slice(0, 40)}…`
      : descriptionTrimmed;
  const priceSuffix = priceTrimmed ? ` - ${priceTrimmed}` : '';

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
    estimated_budget: budgetMatch ? budgetMatch[0].replace(/,/g, '') : '',
  };
}

export async function analyzeQuoteAttachment(
  attachmentUrl: string,
  attachmentName: string,
): Promise<ProcurementQuoteAnalysis> {
  const file = await fetchUrlAsInvoiceFile(attachmentUrl, attachmentName || 'quote.pdf');
  return analyzeProcurementQuoteFromFile(file);
}

/**
 * Fetch the attachment once, then run BOTH the thin analyze-procurement-quote
 * (required, drives job fields) and the rich invoice-ocr parse (best-effort,
 * drives parsed_quote_json / quote_context).
 *
 * If the rich OCR fails, `parsedQuote` is null and the flow continues on the
 * thin analysis — OCR failure must never block job creation.
 */
export async function interpretQuoteAttachment(
  attachmentUrl: string,
  attachmentName: string,
  langEn: boolean,
): Promise<ProcurementQuoteInterpretation> {
  const file = await fetchUrlAsInvoiceFile(attachmentUrl, attachmentName || 'quote.pdf');
  const analysis = await analyzeProcurementQuoteFromFile(file);

  let parsedQuote: ParsedProcurementQuote | null = null;
  let ocrErrorMessage: string | undefined;
  try {
    parsedQuote = await parseProcurementQuoteAttachment(file, langEn);
  } catch (err) {
    ocrErrorMessage = sanitizeOcrError(err);
    console.warn('PROCUREMENT_QUOTE_OCR_PARSE_FAILED', {
      attachmentUrl,
      error: err instanceof Error ? err.message : String(err),
    });
    parsedQuote = null;
  }

  return { analysis, parsedQuote, ocrErrorMessage };
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
  attachmentUrl: string;
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
  const fields = applyAnalysisToJobFields(params.analysis);
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
      parsed_quote_json: buildParsedQuoteJson(params.analysis, params.parsedQuote, {
        title: fields.title_en,
        description: params.analysis.description,
        fileName: params.attachmentName ?? null,
        ocrErrorMessage: params.ocrErrorMessage ?? null,
      }),
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
    await supabase.from('procurement_photos').insert({
      property_id: params.propertyId,
      job_id: data.id,
      photo_url: params.attachmentUrl,
      photo_type: 'request',
      uploaded_by: user.id,
    });
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
