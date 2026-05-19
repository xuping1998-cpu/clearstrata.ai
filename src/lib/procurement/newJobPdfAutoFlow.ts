import { supabase } from '../supabase';
import { fetchUrlAsInvoiceFile } from '../invoiceOcrClient';
import {
  analyzeProcurementQuoteFromFile,
  type ProcurementQuoteAnalysis,
} from './analyzeProcurementQuotePdf';
import { callSearchQuotes, type SearchQuotesVendor } from './callSearchQuotes';

export type { ProcurementQuoteAnalysis };

export function applyAnalysisToJobFields(analysis: ProcurementQuoteAnalysis) {
  const categoryLabel = analysis.category || 'procurement';
  const descEn = [
    analysis.description,
    analysis.currentPrice ? `Current quote on file: ${analysis.currentPrice}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const budgetMatch = analysis.currentPrice?.match(/[\d,]+(?:\.\d+)?/);
  return {
    category: analysis.category,
    title_en: `${categoryLabel} — vendor quote review`,
    title_zh: `${categoryLabel} 报价审核`,
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

export async function createJobAndSearchAfterAnalysis(params: {
  propertyId: string;
  profileId: string;
  attachmentUrl: string;
  analysis: ProcurementQuoteAnalysis;
  linkedTaskId: string;
  priority: string;
  unitNumber: string;
}): Promise<{
  jobId: string;
  vendors: SearchQuotesVendor[];
  searchCount: number;
}> {
  const fields = applyAnalysisToJobFields(params.analysis);
  const budgetNum = fields.estimated_budget ? parseFloat(fields.estimated_budget) : 0;

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

  const searchDescription =
    params.analysis.description +
    (params.analysis.currentPrice ? ` Reference: ${params.analysis.currentPrice}.` : '');

  const result = await callSearchQuotes({
    property_id: params.propertyId,
    job_id: data.id,
    title: fields.title_zh || fields.title_en,
    description: searchDescription,
    attachment_urls: [params.attachmentUrl],
  });

  if (!result.success) {
    throw new Error(result.error || 'Vendor search failed');
  }

  const vendors = result.vendors ?? [];
  return {
    jobId: data.id,
    vendors,
    searchCount: result.ai_search_count ?? vendors.length,
  };
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
}> {
  const analysis = await analyzeQuoteAttachment(params.attachmentUrl, params.attachmentName);
  const { jobId, vendors, searchCount } = await createJobAndSearchAfterAnalysis({
    ...params,
    analysis,
  });
  return { jobId, analysis, vendors, searchCount };
}
