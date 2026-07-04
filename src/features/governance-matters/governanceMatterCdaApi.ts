import { supabase } from '@/lib/supabase';
import type { ConstitutionalPrincipleRef } from '@/lib/community/constitutionalBasis';
import {
  parseCdaReportContent,
  type GovernanceMatterCdaReportRow,
} from '@/lib/community/cdaReportModel';

function mapCdaReportRow(row: Record<string, unknown>): GovernanceMatterCdaReportRow {
  return {
    id: String(row.id),
    matter_id: String(row.matter_id),
    property_id: String(row.property_id),
    report_type: 'deliberation_analysis',
    content: parseCdaReportContent(row.content),
    constitutional_basis: Array.isArray(row.constitutional_basis)
      ? (row.constitutional_basis as ConstitutionalPrincipleRef[])
      : [],
    principles_reviewed: Array.isArray(row.principles_reviewed)
      ? (row.principles_reviewed as ConstitutionalPrincipleRef[])
      : [],
    model: typeof row.model === 'string' ? row.model : null,
    requested_by: typeof row.requested_by === 'string' ? row.requested_by : null,
    created_at: String(row.created_at),
  };
}

export async function fetchLatestCdaReport(
  propertyId: string,
  matterId: string,
): Promise<GovernanceMatterCdaReportRow | null> {
  const { data, error } = await supabase
    .from('governance_matter_cda_reports')
    .select('*')
    .eq('property_id', propertyId)
    .eq('matter_id', matterId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01' || error.message.includes('does not exist')) return null;
    throw new Error(error.message);
  }
  if (!data) return null;
  return mapCdaReportRow(data as Record<string, unknown>);
}

export async function requestCdaAnalysis(input: {
  propertyId: string;
  matterId: string;
  language: 'en' | 'zh';
}): Promise<GovernanceMatterCdaReportRow> {
  const { data, error } = await supabase.functions.invoke('constitutional-deliberation-assistant', {
    body: {
      property_id: input.propertyId,
      matter_id: input.matterId,
      language: input.language,
    },
  });

  if (error) throw new Error(error.message);

  const payload = data as { error?: string; report?: Record<string, unknown> } | null;
  if (payload?.error) throw new Error(payload.error);
  if (!payload?.report) throw new Error('No report returned from CDA');

  return mapCdaReportRow(payload.report);
}
