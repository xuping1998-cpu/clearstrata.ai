import { supabase } from '../supabase';
import { fetchUrlAsInvoiceFile } from '../invoiceOcrClient';
import {
  analyzeProcurementQuoteFromFile,
  type ProcurementQuoteAnalysis,
} from './analyzeProcurementQuotePdf';
import { callSearchQuotes, type SearchQuotesVendor } from './callSearchQuotes';
import { saveVendorSearchResults } from './saveVendorSearchResults';
import {
  suggestAuthorizationType,
  type ProcurementAuthorizationType,
} from './authorizationType';

export type { ProcurementQuoteAnalysis };

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

export type CreateProcurementJobParams = {
  propertyId: string;
  profileId: string;
  attachmentUrl: string;
  analysis: ProcurementQuoteAnalysis;
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
      parsed_quote_json: {
        analysis_source: 'analyze-procurement-quote',
        ...params.analysis,
      },
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

  const result = await callSearchQuotes({
    property_id: params.propertyId,
    job_id: params.jobId,
    title: fields.title_zh || fields.title_en,
    description: searchDescription,
    attachment_urls: [params.attachmentUrl],
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
