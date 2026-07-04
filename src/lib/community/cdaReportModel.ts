import type { ConstitutionalPrincipleRef } from '@/lib/community/constitutionalBasis';

export type CdaViewpoint = {
  label_en: string;
  label_zh: string;
  summary_en: string;
  summary_zh: string;
};

export type CdaTextItem = {
  text_en: string;
  text_zh: string;
};

export type CdaReportContent = {
  consensus_percent: number | null;
  consensus_summary_en: string;
  consensus_summary_zh: string;
  major_viewpoints: CdaViewpoint[];
  minority_opinions: CdaViewpoint[];
  potential_risks: CdaTextItem[];
  missing_information: CdaTextItem[];
  suggested_resolution_en: string;
  suggested_resolution_zh: string;
  suggested_next_step_en: string;
  suggested_next_step_zh: string;
};

export type GovernanceMatterCdaReportRow = {
  id: string;
  matter_id: string;
  property_id: string;
  report_type: 'deliberation_analysis';
  content: CdaReportContent;
  constitutional_basis: ConstitutionalPrincipleRef[];
  principles_reviewed: ConstitutionalPrincipleRef[];
  model: string | null;
  requested_by: string | null;
  created_at: string;
};

export function emptyCdaReportContent(): CdaReportContent {
  return {
    consensus_percent: null,
    consensus_summary_en: '',
    consensus_summary_zh: '',
    major_viewpoints: [],
    minority_opinions: [],
    potential_risks: [],
    missing_information: [],
    suggested_resolution_en: '',
    suggested_resolution_zh: '',
    suggested_next_step_en: '',
    suggested_next_step_zh: '',
  };
}

export function parseCdaReportContent(raw: unknown): CdaReportContent {
  const base = emptyCdaReportContent();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  const pct = o.consensus_percent;
  return {
    consensus_percent:
      typeof pct === 'number' && Number.isFinite(pct) ? Math.max(0, Math.min(100, Math.round(pct))) : null,
    consensus_summary_en: typeof o.consensus_summary_en === 'string' ? o.consensus_summary_en : '',
    consensus_summary_zh: typeof o.consensus_summary_zh === 'string' ? o.consensus_summary_zh : '',
    major_viewpoints: Array.isArray(o.major_viewpoints) ? (o.major_viewpoints as CdaViewpoint[]) : [],
    minority_opinions: Array.isArray(o.minority_opinions) ? (o.minority_opinions as CdaViewpoint[]) : [],
    potential_risks: Array.isArray(o.potential_risks) ? (o.potential_risks as CdaTextItem[]) : [],
    missing_information: Array.isArray(o.missing_information) ? (o.missing_information as CdaTextItem[]) : [],
    suggested_resolution_en: typeof o.suggested_resolution_en === 'string' ? o.suggested_resolution_en : '',
    suggested_resolution_zh: typeof o.suggested_resolution_zh === 'string' ? o.suggested_resolution_zh : '',
    suggested_next_step_en: typeof o.suggested_next_step_en === 'string' ? o.suggested_next_step_en : '',
    suggested_next_step_zh: typeof o.suggested_next_step_zh === 'string' ? o.suggested_next_step_zh : '',
  };
}
