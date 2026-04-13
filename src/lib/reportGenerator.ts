import { supabase } from './supabase';

function warnIfInvoiceAiAuditResultsMissing(context: string, error: { message?: string; code?: string } | null) {
  const msg = (error?.message ?? '').toLowerCase();
  const missing =
    error?.code === 'PGRST205' ||
    msg.includes('invoice_ai_audit_results') ||
    msg.includes('could not find the table');
  if (missing) {
    console.warn(`[${context}] invoice_ai_audit_results not available; skipping.`, error?.message ?? '');
    return;
  }
  if (error?.message) console.warn(`[${context}]`, error.message);
}

export type GenerateCouncilReportResult = {
  report_id: string;
  title?: string;
  error?: string;
};

/**
 * Invokes Edge Function `generate-audit-report`: builds the 业委会质疑报告 prompt server-side,
 * calls OpenAI, inserts `audit_reports`, returns `report_id`.
 */
export async function generateAuditReportForInvoice(invoiceId: string): Promise<GenerateCouncilReportResult> {
  const { data, error } = await supabase.functions.invoke('generate-audit-report', {
    body: { invoice_id: invoiceId },
  });
  if (error) {
    return { report_id: '', error: error.message };
  }
  const p = data as { success?: boolean; report_id?: string; title?: string; error?: string } | null;
  if (!p?.success || !p.report_id) {
    return { report_id: '', error: p?.error ?? 'GENERATE_FAILED' };
  }
  return { report_id: p.report_id, title: p.title };
}

/** Alias aligned with product naming. */
export const generateAuditReport = generateAuditReportForInvoice;

/**
 * First high/critical-risk invoice in the given fiscal year (by latest invoice_date when available).
 */
export async function getFirstHighRiskInvoiceId(
  propertyId: string,
  fiscalYear: number,
): Promise<string | null> {
  const { data: results, error } = await supabase
    .from('invoice_ai_audit_results')
    .select('invoice_id')
    .eq('property_id', propertyId)
    .in('risk_level', ['high', 'critical']);

  if (error || !results?.length) {
    if (error) warnIfInvoiceAiAuditResultsMissing('getFirstHighRiskInvoiceId', error);
    return null;
  }

  const ids = [...new Set(results.map((r) => r.invoice_id as string))];
  const { data: invs, error: invErr } = await supabase
    .from('invoices')
    .select('id, invoice_date, created_at')
    .eq('property_id', propertyId)
    .eq('fiscal_year', fiscalYear)
    .in('id', ids);

  if (invErr || !invs?.length) {
    return null;
  }

  const scored = invs.map((row) => {
    const raw = (row.invoice_date as string | null) || (row.created_at as string | null);
    const t = raw ? new Date(raw).getTime() : 0;
    return { id: row.id as string, t };
  });
  scored.sort((a, b) => b.t - a.t);
  return scored[0]?.id ?? null;
}

export type MeetingPackResult = {
  report_ids: string[];
  errors: string[];
};

/**
 * Batch-generate council reports for high/critical invoices in a fiscal year (cap for rate limits).
 */
export async function generateMeetingPack(
  propertyId: string,
  fiscalYear: number,
  options?: { maxReports?: number; delayMs?: number },
): Promise<MeetingPackResult> {
  const maxReports = options?.maxReports ?? 8;
  const delayMs = options?.delayMs ?? 400;

  const { data: results, error } = await supabase
    .from('invoice_ai_audit_results')
    .select('invoice_id')
    .eq('property_id', propertyId)
    .in('risk_level', ['high', 'critical']);

  if (error || !results?.length) {
    if (error) warnIfInvoiceAiAuditResultsMissing('generateMeetingPack', error);
    return { report_ids: [], errors: [error?.message ?? 'NO_RESULTS'] };
  }

  const uniqueIds = [...new Set(results.map((r) => r.invoice_id as string))];
  const { data: invs } = await supabase
    .from('invoices')
    .select('id')
    .eq('property_id', propertyId)
    .eq('fiscal_year', fiscalYear)
    .in('id', uniqueIds);

  const fyIds = (invs ?? []).map((r) => r.id as string);
  const target = fyIds.slice(0, maxReports);

  const report_ids: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < target.length; i++) {
    const invoiceId = target[i]!;
    const res = await generateAuditReportForInvoice(invoiceId);
    if (res.report_id) {
      report_ids.push(res.report_id);
    } else {
      errors.push(`${invoiceId}: ${res.error ?? 'unknown'}`);
    }
    if (i < target.length - 1 && delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return { report_ids, errors };
}
