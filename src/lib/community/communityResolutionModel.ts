import type { ConstitutionalPrincipleRef } from '@/lib/community/constitutionalBasis';

export const COMMUNITY_RESOLUTION_COUNCIL_STATUSES = [
  'draft',
  'in_review',
  'revised',
  'ready_for_meeting',
  'scheduled',
  'archived',
] as const;

export type CommunityResolutionCouncilStatus = (typeof COMMUNITY_RESOLUTION_COUNCIL_STATUSES)[number];

export const COMMUNITY_RESOLUTION_STATUSES = [
  'draft',
  'council_review',
  'approved',
  'scheduled',
  'voted',
  'archived',
] as const;

export type CommunityResolutionStatus = (typeof COMMUNITY_RESOLUTION_STATUSES)[number];

export type CommunityResolutionRow = {
  id: string;
  property_id: string;
  governance_matter_id: string | null;
  title: string;
  executive_summary: string | null;
  constitutional_basis: ConstitutionalPrincipleRef[];
  council_review_status: CommunityResolutionCouncilStatus;
  meeting_id: string | null;
  owner_vote_resolution_id: string | null;
  cda_report_id: string | null;
  status: CommunityResolutionStatus;
  created_by: string | null;
  created_at: string;
  last_revision_at: string;
};

export type CommunityResolutionRevisionRow = {
  id: string;
  resolution_id: string;
  property_id: string;
  revision_no: number;
  change_kind: string;
  title: string | null;
  executive_summary: string | null;
  council_review_status: string | null;
  status: string | null;
  snapshot: Record<string, unknown>;
  changed_by: string | null;
  created_at: string;
};

export type CommunityResolutionContextBundle = {
  resolution: CommunityResolutionRow;
  matterTitle: string | null;
  matterId: string | null;
  commentCount: number;
  revisionCount: number;
  cdaSummary: string | null;
};

export function communityResolutionDetailUrl(resolutionId: string, propertyId: string): string {
  const qs = new URLSearchParams({ propertyId });
  return `/community-resolutions/${encodeURIComponent(resolutionId)}?${qs.toString()}`;
}

export function communityResolutionCouncilStatusLabel(status: CommunityResolutionCouncilStatus, langEn: boolean): string {
  const en: Record<CommunityResolutionCouncilStatus, string> = {
    draft: 'Draft',
    in_review: 'In review',
    revised: 'Revised',
    ready_for_meeting: 'Ready for meeting',
    scheduled: 'Scheduled',
    archived: 'Archived',
  };
  const zh: Record<CommunityResolutionCouncilStatus, string> = {
    draft: '草稿',
    in_review: '审议中',
    revised: '已修订',
    ready_for_meeting: '待排会',
    scheduled: '已排会',
    archived: '已归档',
  };
  return langEn ? en[status] : zh[status];
}
