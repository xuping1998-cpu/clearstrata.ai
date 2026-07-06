import { supabase } from '@/lib/supabase';
import { constitutionalBasisForCategory } from '@/lib/community/constitutionalBasis';
import type { GovernanceMatterCategory } from '@/lib/community/governanceMatterModel';
import type {
  CommunityResolutionContextBundle,
  CommunityResolutionRevisionRow,
  CommunityResolutionRow,
  CommunityResolutionCouncilStatus,
  CommunityResolutionStatus,
} from '@/lib/community/communityResolutionModel';

function mapResolutionRow(row: Record<string, unknown>): CommunityResolutionRow {
  return {
    id: String(row.id),
    property_id: String(row.property_id),
    governance_matter_id: row.governance_matter_id ? String(row.governance_matter_id) : null,
    title: String(row.title),
    executive_summary: typeof row.executive_summary === 'string' ? row.executive_summary : null,
    constitutional_basis: Array.isArray(row.constitutional_basis) ? row.constitutional_basis : [],
    council_review_status: String(row.council_review_status) as CommunityResolutionRow['council_review_status'],
    meeting_id: row.meeting_id ? String(row.meeting_id) : null,
    owner_vote_resolution_id: row.owner_vote_resolution_id ? String(row.owner_vote_resolution_id) : null,
    cda_report_id: row.cda_report_id ? String(row.cda_report_id) : null,
    status: String(row.status) as CommunityResolutionRow['status'],
    created_by: row.created_by ? String(row.created_by) : null,
    created_at: String(row.created_at),
    last_revision_at: String(row.last_revision_at),
  };
}

export async function fetchCommunityResolutionById(
  propertyId: string,
  resolutionId: string,
): Promise<CommunityResolutionRow | null> {
  const { data, error } = await supabase
    .from('community_resolutions')
    .select('*')
    .eq('property_id', propertyId)
    .eq('id', resolutionId)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01' || error.message.includes('does not exist')) return null;
    throw new Error(error.message);
  }
  if (!data) return null;
  return mapResolutionRow(data as Record<string, unknown>);
}

export async function fetchCommunityResolutionByMatterId(
  propertyId: string,
  matterId: string,
): Promise<CommunityResolutionRow | null> {
  const { data, error } = await supabase
    .from('community_resolutions')
    .select('*')
    .eq('property_id', propertyId)
    .eq('governance_matter_id', matterId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01') return null;
    throw new Error(error.message);
  }
  if (!data) return null;
  return mapResolutionRow(data as Record<string, unknown>);
}

export async function fetchCommunityResolutionsForMeeting(
  propertyId: string,
  meetingId: string,
): Promise<CommunityResolutionRow[]> {
  const { data, error } = await supabase
    .from('community_resolutions')
    .select('*')
    .eq('property_id', propertyId)
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: true });

  if (error) {
    if (error.code === '42P01') return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((r) => mapResolutionRow(r as Record<string, unknown>));
}

export async function fetchCommunityResolutionRevisions(
  propertyId: string,
  resolutionId: string,
): Promise<CommunityResolutionRevisionRow[]> {
  const { data, error } = await supabase
    .from('community_resolution_revisions')
    .select('*')
    .eq('property_id', propertyId)
    .eq('resolution_id', resolutionId)
    .order('revision_no', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CommunityResolutionRevisionRow[];
}

async function enrichContextBundle(
  propertyId: string,
  resolution: CommunityResolutionRow,
  langEn: boolean,
): Promise<CommunityResolutionContextBundle> {
  let matterTitle: string | null = null;
  let commentCount = 0;

  if (resolution.governance_matter_id) {
    const { data: matter } = await supabase
      .from('governance_matters')
      .select('title')
      .eq('property_id', propertyId)
      .eq('id', resolution.governance_matter_id)
      .maybeSingle();
    matterTitle = matter?.title ?? null;

    const { count } = await supabase
      .from('governance_matter_comments')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', propertyId)
      .eq('matter_id', resolution.governance_matter_id)
      .eq('visibility', 'visible');
    commentCount = count ?? 0;
  }

  const { count: revisionCount } = await supabase
    .from('community_resolution_revisions')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId)
    .eq('resolution_id', resolution.id);

  let cdaSummary: string | null = null;
  if (resolution.cda_report_id) {
    const { data: cda } = await supabase
      .from('governance_matter_cda_reports')
      .select('content')
      .eq('id', resolution.cda_report_id)
      .maybeSingle();
    const content = cda?.content as { consensus_summary_en?: string; consensus_summary_zh?: string } | null;
    if (content) {
      cdaSummary = langEn
        ? content.consensus_summary_en ?? null
        : content.consensus_summary_zh ?? content.consensus_summary_en ?? null;
    }
  }

  return {
    resolution,
    matterTitle,
    matterId: resolution.governance_matter_id,
    commentCount,
    revisionCount: revisionCount ?? 0,
    cdaSummary,
  };
}

export async function fetchCommunityResolutionContext(
  propertyId: string,
  resolutionId: string,
  langEn: boolean,
): Promise<CommunityResolutionContextBundle | null> {
  const resolution = await fetchCommunityResolutionById(propertyId, resolutionId);
  if (!resolution) return null;
  return enrichContextBundle(propertyId, resolution, langEn);
}

export async function fetchMeetingResolutionContexts(
  propertyId: string,
  meetingId: string,
  langEn: boolean,
): Promise<CommunityResolutionContextBundle[]> {
  const rows = await fetchCommunityResolutionsForMeeting(propertyId, meetingId);
  return Promise.all(rows.map((r) => enrichContextBundle(propertyId, r, langEn)));
}

export type CreateCommunityResolutionInput = {
  propertyId: string;
  governanceMatterId: string;
  title: string;
  executiveSummary?: string | null;
  matterCategory: GovernanceMatterCategory;
  cdaReportId?: string | null;
};

export async function createCommunityResolutionFromMatter(
  input: CreateCommunityResolutionInput,
): Promise<CommunityResolutionRow> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('Not authenticated');

  const basis = constitutionalBasisForCategory(input.matterCategory);

  const { data, error } = await supabase
    .from('community_resolutions')
    .insert({
      property_id: input.propertyId,
      governance_matter_id: input.governanceMatterId,
      title: input.title.trim(),
      executive_summary: input.executiveSummary?.trim() || null,
      constitutional_basis: basis,
      council_review_status: 'in_review',
      status: 'council_review',
      cda_report_id: input.cdaReportId ?? null,
      created_by: uid,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  const resolution = mapResolutionRow(data as Record<string, unknown>);

  await supabase
    .from('governance_matters')
    .update({
      resolution_id: resolution.id,
      status: 'resolution_draft',
    })
    .eq('property_id', input.propertyId)
    .eq('id', input.governanceMatterId);

  return resolution;
}

export type UpdateCommunityResolutionInput = {
  propertyId: string;
  resolutionId: string;
  title?: string;
  executiveSummary?: string | null;
  councilReviewStatus?: CommunityResolutionCouncilStatus;
  status?: CommunityResolutionStatus;
  meetingId?: string | null;
};

export async function updateCommunityResolution(input: UpdateCommunityResolutionInput): Promise<CommunityResolutionRow> {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.executiveSummary !== undefined) patch.executive_summary = input.executiveSummary?.trim() || null;
  if (input.councilReviewStatus !== undefined) patch.council_review_status = input.councilReviewStatus;
  if (input.status !== undefined) patch.status = input.status;
  if (input.meetingId !== undefined) patch.meeting_id = input.meetingId;

  const { data, error } = await supabase
    .from('community_resolutions')
    .update(patch)
    .eq('property_id', input.propertyId)
    .eq('id', input.resolutionId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  const resolution = mapResolutionRow(data as Record<string, unknown>);

  if (input.meetingId && resolution.governance_matter_id) {
    await supabase
      .from('governance_matters')
      .update({ meeting_id: input.meetingId, status: 'meeting' })
      .eq('property_id', input.propertyId)
      .eq('id', resolution.governance_matter_id);
  }

  return resolution;
}

export async function linkAgendaItemToResolution(
  propertyId: string,
  agendaItemId: string,
  resolutionId: string,
): Promise<void> {
  const { error } = await supabase
    .from('meeting_agenda_items')
    .update({ community_resolution_id: resolutionId })
    .eq('id', agendaItemId);
  if (error) throw new Error(error.message);
}

export async function linkOwnerVoteResolutionToCommunityResolution(
  propertyId: string,
  communityResolutionId: string,
  ownerVoteResolutionId: string,
  governanceMatterId: string | null,
): Promise<void> {
  const { error: crErr } = await supabase
    .from('community_resolutions')
    .update({ owner_vote_resolution_id: ownerVoteResolutionId, status: 'scheduled' })
    .eq('property_id', propertyId)
    .eq('id', communityResolutionId);
  if (crErr) throw new Error(crErr.message);

  if (governanceMatterId) {
    await supabase
      .from('governance_matters')
      .update({ voting_id: ownerVoteResolutionId, status: 'voting' })
      .eq('property_id', propertyId)
      .eq('id', governanceMatterId);
  }

  await supabase
    .from('owner_vote_resolutions')
    .update({ community_resolution_id: communityResolutionId })
    .eq('id', ownerVoteResolutionId)
    .then(({ error }) => {
      if (error) console.warn('[community-resolutions] owner_vote_resolutions link', error.message);
    });
}
