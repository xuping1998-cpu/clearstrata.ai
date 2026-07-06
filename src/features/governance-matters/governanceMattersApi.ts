import { supabase } from '@/lib/supabase';
import type {
  GovernanceMatterCategory,
  GovernanceMatterCommentRow,
  GovernanceMatterDashboardRow,
  GovernanceMatterRevisionRow,
  GovernanceMatterRow,
  GovernanceMatterStatus,
} from '@/lib/community/governanceMatterModel';

const DASHBOARD_STATUSES: GovernanceMatterStatus[] = [
  'discussion',
  'public_consultation',
  'resolution_draft',
  'council_review',
  'draft',
];

export async function fetchGovernanceMattersForDashboard(
  propertyId: string,
): Promise<GovernanceMatterDashboardRow[]> {
  const { data, error } = await supabase
    .from('governance_matters')
    .select('*')
    .eq('property_id', propertyId)
    .in('status', DASHBOARD_STATUSES)
    .order('last_revision_at', { ascending: false })
    .limit(12);

  if (error) throw new Error(error.message);
  const matters = (data ?? []) as GovernanceMatterRow[];
  if (!matters.length) return [];

  const ids = matters.map((m) => m.id);
  const { data: commentRows, error: cErr } = await supabase
    .from('governance_matter_comments')
    .select('matter_id')
    .eq('property_id', propertyId)
    .in('matter_id', ids)
    .eq('visibility', 'visible');

  if (cErr) throw new Error(cErr.message);

  const counts: Record<string, number> = {};
  for (const row of commentRows ?? []) {
    const mid = String((row as { matter_id: string }).matter_id);
    counts[mid] = (counts[mid] ?? 0) + 1;
  }

  return matters.map((m) => ({
    ...m,
    comment_count: counts[m.id] ?? 0,
  }));
}

export async function fetchGovernanceMattersForCouncilWorkspace(
  propertyId: string,
): Promise<GovernanceMatterDashboardRow[]> {
  const { data, error } = await supabase
    .from('governance_matters')
    .select('*')
    .eq('property_id', propertyId)
    .order('last_revision_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  const matters = (data ?? []) as GovernanceMatterRow[];
  if (!matters.length) return [];

  const ids = matters.map((m) => m.id);
  const { data: commentRows, error: cErr } = await supabase
    .from('governance_matter_comments')
    .select('matter_id')
    .eq('property_id', propertyId)
    .in('matter_id', ids)
    .eq('visibility', 'visible');

  if (cErr) throw new Error(cErr.message);

  const counts: Record<string, number> = {};
  for (const row of commentRows ?? []) {
    const mid = String((row as { matter_id: string }).matter_id);
    counts[mid] = (counts[mid] ?? 0) + 1;
  }

  return matters.map((m) => ({
    ...m,
    comment_count: counts[m.id] ?? 0,
  }));
}

export async function fetchGovernanceMatterById(
  propertyId: string,
  matterId: string,
): Promise<GovernanceMatterRow | null> {
  const { data, error } = await supabase
    .from('governance_matters')
    .select('*')
    .eq('property_id', propertyId)
    .eq('id', matterId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as GovernanceMatterRow | null) ?? null;
}

export async function fetchGovernanceMatterRevisions(
  propertyId: string,
  matterId: string,
): Promise<GovernanceMatterRevisionRow[]> {
  const { data, error } = await supabase
    .from('governance_matter_revisions')
    .select('*')
    .eq('property_id', propertyId)
    .eq('matter_id', matterId)
    .order('revision_no', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as GovernanceMatterRevisionRow[];
}

export async function fetchGovernanceMatterComments(
  propertyId: string,
  matterId: string,
): Promise<GovernanceMatterCommentRow[]> {
  const { data, error } = await supabase
    .from('governance_matter_comments')
    .select('*')
    .eq('property_id', propertyId)
    .eq('matter_id', matterId)
    .eq('visibility', 'visible')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as GovernanceMatterCommentRow[];
}

export type CreateGovernanceMatterInput = {
  propertyId: string;
  title: string;
  description?: string | null;
  category: GovernanceMatterCategory;
  status?: GovernanceMatterStatus;
  discussionDeadline?: string | null;
  resolutionDeadline?: string | null;
};

export async function createGovernanceMatter(input: CreateGovernanceMatterInput): Promise<GovernanceMatterRow> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('governance_matters')
    .insert({
      property_id: input.propertyId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category,
      status: input.status ?? 'discussion',
      created_by: uid,
      discussion_deadline: input.discussionDeadline ?? null,
      resolution_deadline: input.resolutionDeadline ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as GovernanceMatterRow;
}

export type UpdateGovernanceMatterInput = {
  propertyId: string;
  matterId: string;
  title?: string;
  description?: string | null;
  category?: GovernanceMatterCategory;
  status?: GovernanceMatterStatus;
  discussionDeadline?: string | null;
  resolutionDeadline?: string | null;
};

export async function updateGovernanceMatter(input: UpdateGovernanceMatterInput): Promise<GovernanceMatterRow> {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined) patch.description = input.description?.trim() || null;
  if (input.category !== undefined) patch.category = input.category;
  if (input.status !== undefined) patch.status = input.status;
  if (input.discussionDeadline !== undefined) patch.discussion_deadline = input.discussionDeadline;
  if (input.resolutionDeadline !== undefined) patch.resolution_deadline = input.resolutionDeadline;

  const { data, error } = await supabase
    .from('governance_matters')
    .update(patch)
    .eq('property_id', input.propertyId)
    .eq('id', input.matterId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as GovernanceMatterRow;
}

export async function addGovernanceMatterComment(
  propertyId: string,
  matterId: string,
  body: string,
): Promise<GovernanceMatterCommentRow> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('Not authenticated');

  const trimmed = body.trim();
  if (!trimmed) throw new Error('Comment cannot be empty');

  const { data, error } = await supabase
    .from('governance_matter_comments')
    .insert({
      property_id: propertyId,
      matter_id: matterId,
      author_id: uid,
      body: trimmed,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as GovernanceMatterCommentRow;
}

export async function moderateGovernanceMatterComment(
  commentId: string,
  action: 'hide' | 'remove' | 'flag',
  reason?: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('moderate_governance_matter_comment', {
    p_comment_id: commentId,
    p_action: action,
    p_reason: reason ?? null,
  });
  if (error) throw new Error(error.message);
}
