export const GOVERNANCE_MATTER_CATEGORIES = [
  'property_management',
  'budget',
  'major_repair',
  'procurement',
  'special_general_meeting',
  'annual_general_meeting',
  'council_proposal',
  'owner_proposal',
  'bylaw_amendment',
  'policy_proposal',
  'emergency_matter',
  'other',
] as const;

export type GovernanceMatterCategory = (typeof GOVERNANCE_MATTER_CATEGORIES)[number];

export const GOVERNANCE_MATTER_STATUSES = [
  'draft',
  'discussion',
  'public_consultation',
  'resolution_draft',
  'council_review',
  'meeting',
  'voting',
  'decision',
  'execution',
  'archived',
] as const;

export type GovernanceMatterStatus = (typeof GOVERNANCE_MATTER_STATUSES)[number];

export type GovernanceMatterRow = {
  id: string;
  property_id: string;
  title: string;
  description: string | null;
  category: GovernanceMatterCategory;
  status: GovernanceMatterStatus;
  created_by: string | null;
  created_at: string;
  last_revision_at: string;
  discussion_deadline: string | null;
  resolution_deadline: string | null;
  meeting_id: string | null;
  voting_id: string | null;
  resolution_id: string | null;
  archived_at: string | null;
};

export type GovernanceMatterRevisionRow = {
  id: string;
  matter_id: string;
  property_id: string;
  revision_no: number;
  change_kind: string;
  title: string | null;
  description: string | null;
  category: string | null;
  status: string | null;
  discussion_deadline: string | null;
  resolution_deadline: string | null;
  meeting_id: string | null;
  voting_id: string | null;
  snapshot: Record<string, unknown>;
  changed_by: string | null;
  created_at: string;
};

export type GovernanceMatterCommentRow = {
  id: string;
  matter_id: string;
  property_id: string;
  author_id: string;
  body: string;
  created_at: string;
  visibility: 'visible' | 'hidden' | 'removed';
};

export type GovernanceMatterDashboardRow = GovernanceMatterRow & {
  comment_count: number;
};

const CATEGORY_LABELS_EN: Record<GovernanceMatterCategory, string> = {
  property_management: 'Property Management',
  budget: 'Budget',
  major_repair: 'Major Repair',
  procurement: 'Procurement',
  special_general_meeting: 'Special General Meeting',
  annual_general_meeting: 'Annual General Meeting',
  council_proposal: 'Council Proposal',
  owner_proposal: 'Owner Proposal',
  bylaw_amendment: 'Bylaw Amendment',
  policy_proposal: 'Policy Proposal',
  emergency_matter: 'Emergency Matter',
  other: 'Other',
};

const CATEGORY_LABELS_ZH: Record<GovernanceMatterCategory, string> = {
  property_management: '物业管理',
  budget: '预算',
  major_repair: '重大维修',
  procurement: '采购',
  special_general_meeting: '特别大会',
  annual_general_meeting: '年度大会',
  council_proposal: '业委会提案',
  owner_proposal: '业主提案',
  bylaw_amendment: '细则修订',
  policy_proposal: '政策提案',
  emergency_matter: '紧急事项',
  other: '其他',
};

export function governanceMatterCategoryLabel(category: GovernanceMatterCategory, langEn: boolean): string {
  return langEn ? CATEGORY_LABELS_EN[category] : CATEGORY_LABELS_ZH[category];
}

export function governanceMatterStatusLabel(status: GovernanceMatterStatus, langEn: boolean): string {
  const en: Record<GovernanceMatterStatus, string> = {
    draft: 'Draft',
    discussion: 'Discussion',
    public_consultation: 'Public Consultation',
    resolution_draft: 'Resolution Draft',
    council_review: 'Council Review',
    meeting: 'Meeting',
    voting: 'Voting',
    decision: 'Decision',
    execution: 'Execution',
    archived: 'Archived',
  };
  const zh: Record<GovernanceMatterStatus, string> = {
    draft: '草稿',
    discussion: '讨论中',
    public_consultation: '公开征求意见',
    resolution_draft: '决议草案',
    council_review: '业委会审议',
    meeting: '会议',
    voting: '投票',
    decision: '决议',
    execution: '执行',
    archived: '已归档',
  };
  return langEn ? en[status] : zh[status];
}

export function governanceMatterDeliberationType(
  status: GovernanceMatterStatus,
): 'discussion' | 'consultation' {
  if (status === 'public_consultation') return 'consultation';
  return 'discussion';
}

export function governanceMatterDetailUrl(matterId: string, propertyId: string): string {
  const qs = new URLSearchParams({ propertyId });
  return `/community-deliberation/${encodeURIComponent(matterId)}?${qs.toString()}`;
}

export function governanceMattersListUrl(propertyId: string): string {
  return `/community-deliberation?${new URLSearchParams({ propertyId }).toString()}`;
}

export function daysUntilIso(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso?.trim()) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.ceil((t - now) / (24 * 60 * 60 * 1000)));
}

export function formatOpenUntil(iso: string | null | undefined, langEn: boolean): string | undefined {
  if (!iso?.trim()) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const text = d.toLocaleDateString(langEn ? 'en-CA' : 'zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return langEn ? `Open until ${text}` : `开放至 ${text}`;
}

export function isCouncilGovernanceRole(role: string | null | undefined): boolean {
  return role === 'council' || role === 'admin' || role === 'property_admin';
}
