import { supabase } from '../../lib/supabase';
import { withProperty } from '../../lib/supabaseTenant';

export type MeetingType = 'agm' | 'sgm' | 'council';
export type MeetingFormat = 'in_person' | 'electronic' | 'hybrid';
export type MeetingStatus = 'draft' | 'scheduled' | 'open' | 'closed' | 'archived';
export type VoteRule = 'simple_majority' | 'three_quarter' | 'unanimous';
export type VoteStatus = 'draft' | 'open' | 'closed' | 'passed' | 'failed';

export interface MeetingRow {
  id: string;
  property_id: string;
  fiscal_year: number;
  meeting_type: MeetingType;
  title_en: string | null;
  title_zh: string | null;
  description_en: string | null;
  description_zh: string | null;
  scheduled_at: string | null;
  meeting_format: MeetingFormat;
  status: MeetingStatus;
  notice_sent_at: string | null;
  voting_open_at: string | null;
  voting_close_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingAgendaRow {
  id: string;
  meeting_id: string;
  sort_order: number;
  title_en: string | null;
  title_zh: string | null;
  description_en: string | null;
  description_zh: string | null;
  requires_vote: boolean;
  vote_rule: VoteRule | null;
  created_at: string | null;
}

export interface MeetingVoteRow {
  id: string;
  meeting_id: string;
  agenda_item_id: string;
  title_en: string | null;
  title_zh: string | null;
  description_en: string | null;
  description_zh: string | null;
  vote_rule: VoteRule;
  status: VoteStatus;
  opens_at: string | null;
  closes_at: string | null;
  created_at: string | null;
}

export interface MeetingVoteOptionRow {
  id: string;
  vote_id: string;
  option_key: string;
  label_en: string | null;
  label_zh: string | null;
  sort_order: number;
}

export interface MeetingBallotRow {
  id: string;
  vote_id: string;
  property_id: string;
  voter_user_id: string;
  selected_option_key: string;
  unit_weight: number | null;
  created_at: string | null;
}

export interface MeetingInvitationRow {
  id: string;
  meeting_id: string;
  property_id: string;
  recipient_user_id: string;
  delivery_channel: string;
  delivery_status: string;
  sent_at: string | null;
  opened_at: string | null;
  created_at: string | null;
}

export interface MeetingResolutionRow {
  id: string;
  meeting_id: string;
  agenda_item_id: string | null;
  resolution_text: string;
  outcome: 'passed' | 'failed' | 'deferred';
  followup_required: boolean;
  created_at: string | null;
}

export interface MeetingDashboardStats {
  property_id: string;
  fiscal_year: number;
  used_meetings: number;
  quota_meetings: number;
  remaining_meetings: number;
  agm_status: 'ok' | 'missing_agm';
}

export interface MeetingDetailBundle {
  meeting: MeetingRow | null;
  agendaItems: MeetingAgendaRow[];
  votes: Array<MeetingVoteRow & { options: MeetingVoteOptionRow[] }>;
  ballotsByVoteId: Record<string, MeetingBallotRow[]>;
  myBallotsByVoteId: Record<string, MeetingBallotRow | undefined>;
  invitations: MeetingInvitationRow[];
  resolutions: MeetingResolutionRow[];
}

const MEETING_LIST_COLUMNS =
  'id, property_id, fiscal_year, meeting_type, title_en, title_zh, description_en, description_zh, scheduled_at, meeting_format, status, created_at';

const AGENDA_DETAIL_COLUMNS =
  'id, meeting_id, sort_order, title_en, title_zh, description_en, description_zh, requires_vote, vote_rule, created_at';

const VOTE_DETAIL_COLUMNS =
  'id, meeting_id, agenda_item_id, title_en, title_zh, description_en, description_zh, vote_rule, status, opens_at, closes_at, created_at';

const VOTE_OPTION_COLUMNS = 'id, vote_id, option_key, label_en, label_zh, sort_order';

const BALLOT_DETAIL_COLUMNS = 'id, vote_id, property_id, voter_user_id, selected_option_key, unit_weight, created_at';

const RESOLUTION_DETAIL_COLUMNS =
  'id, meeting_id, agenda_item_id, resolution_text, outcome, followup_required, created_at';

export function meetingTitleZhFirst(m: Pick<MeetingRow, 'title_zh' | 'title_en'>) {
  const zh = m.title_zh?.trim();
  const en = m.title_en?.trim();
  return zh || en || '';
}

export function noticeReadiness(meeting: Partial<MeetingRow>, agendaCount: number) {
  const hasTitle =
    (meeting.title_en && meeting.title_en.trim().length > 0) ||
    (meeting.title_zh && meeting.title_zh.trim().length > 0);
  return {
    ok:
      !!meeting.meeting_type &&
      hasTitle &&
      !!meeting.scheduled_at &&
      !!meeting.meeting_format &&
      agendaCount >= 1,
    hasTitle,
    hasScheduledAt: !!meeting.scheduled_at,
    hasFormat: !!meeting.meeting_format,
    agendaCount,
  };
}

export async function getMeetingsByPropertyAndYear(propertyId: string, fiscalYear: number) {
  const { data, error } = await withProperty(
    supabase.from('meetings').select(MEETING_LIST_COLUMNS) as any,
    propertyId,
  )
    .eq('fiscal_year', fiscalYear)
    .order('scheduled_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  return { meetings: (data ?? []) as MeetingRow[], error };
}

export async function getMeetingDashboardStats(propertyId: string, fiscalYear: number) {
  const { data, error } = await withProperty(
    supabase.from('meeting_dashboard_cards').select('*') as any,
    propertyId,
  )
    .eq('fiscal_year', fiscalYear)
    .maybeSingle();

  if (error) return { stats: null, error };
  if (!data) {
    return {
      stats: {
        property_id: propertyId,
        fiscal_year: fiscalYear,
        used_meetings: 0,
        quota_meetings: 8,
        remaining_meetings: 8,
        agm_status: 'missing_agm' as const,
      } satisfies MeetingDashboardStats,
      error: null,
    };
  }
  const row = data as Record<string, unknown>;
  const used = Number(row.used_meetings ?? 0);
  const quota = Number(row.quota_meetings ?? 8);
  const rawRemaining = row.remaining_meetings;
  const remaining =
    rawRemaining != null && Number.isFinite(Number(rawRemaining))
      ? Math.max(0, Number(rawRemaining))
      : Math.max(0, quota - used);
  return {
    stats: {
      property_id: String(row.property_id ?? propertyId),
      fiscal_year: Number(row.fiscal_year ?? fiscalYear),
      used_meetings: Number.isFinite(used) ? used : 0,
      quota_meetings: Number.isFinite(quota) ? quota : 8,
      remaining_meetings: remaining,
      agm_status: (String(row.agm_status ?? '') === 'ok' ? 'ok' : 'missing_agm') as MeetingDashboardStats['agm_status'],
    },
    error: null,
  };
}

export type MeetingDetailExtras = Omit<MeetingDetailBundle, 'meeting'>;

const emptyExtras = (): MeetingDetailExtras => ({
  agendaItems: [],
  votes: [],
  ballotsByVoteId: {},
  myBallotsByVoteId: {},
  invitations: [],
  resolutions: [],
});

/**
 * Core row — `id` + `.single()`.
 * When `propertyId` is passed, adds `property_id` scope; otherwise relies on RLS only (e.g. before property context is ready).
 */
export async function fetchMeetingCore(meetingId: string, propertyId?: string | null) {
  try {
    const base = supabase.from('meetings').select('*');
    const scoped = propertyId ? withProperty(base as any, propertyId) : base;
    const { data, error } = await scoped.eq('id', meetingId).single();

    if (error || !data) {
      return { meeting: null as MeetingRow | null, error };
    }
    return { meeting: data as MeetingRow, error: null };
  } catch {
    return { meeting: null, error: null };
  }
}

/**
 * Agenda, new-model votes + options + ballots, invitations, resolutions.
 * Each sub-query is tolerant of errors (returns empty slice); never touches `meeting_votes_legacy`.
 */
export async function fetchMeetingExtras(meetingId: string, propertyId: string): Promise<MeetingDetailExtras> {
  try {
    const uid = (await supabase.auth.getUser()).data.user?.id ?? null;

    let agendaItems: MeetingAgendaRow[] = [];
    const agendaRes = await withProperty(
      supabase.from('meeting_agenda_items').select(AGENDA_DETAIL_COLUMNS) as any,
      propertyId,
    )
      .eq('meeting_id', meetingId)
      .order('sort_order', { ascending: true });
    if (!agendaRes.error && agendaRes.data) agendaItems = agendaRes.data as MeetingAgendaRow[];

    let voteRows: MeetingVoteRow[] = [];
    const votesRes = await withProperty(
      supabase.from('meeting_votes').select(VOTE_DETAIL_COLUMNS) as any,
      propertyId,
    ).eq('meeting_id', meetingId);
    if (!votesRes.error && votesRes.data) voteRows = votesRes.data as MeetingVoteRow[];

    const voteIds = voteRows.map((v) => v.id);
    const optionsByVote: Record<string, MeetingVoteOptionRow[]> = {};
    if (voteIds.length > 0) {
      const optRes = await supabase.from('meeting_vote_options').select(VOTE_OPTION_COLUMNS).in('vote_id', voteIds);
      if (!optRes.error && optRes.data) {
        for (const o of optRes.data as MeetingVoteOptionRow[]) {
          optionsByVote[o.vote_id] = optionsByVote[o.vote_id] ?? [];
          optionsByVote[o.vote_id].push(o);
        }
        for (const k of Object.keys(optionsByVote)) {
          optionsByVote[k].sort((a, b) => a.sort_order - b.sort_order);
        }
      }
    }

    const votes = voteRows.map((v) => ({
      ...v,
      options: optionsByVote[v.id] ?? [],
    }));

    const ballotsByVoteId: Record<string, MeetingBallotRow[]> = {};
    const myBallotsByVoteId: Record<string, MeetingBallotRow | undefined> = {};

    if (voteIds.length > 0) {
      const ballotRes = await withProperty(
        supabase.from('meeting_ballots').select(BALLOT_DETAIL_COLUMNS) as any,
        propertyId,
      ).in('vote_id', voteIds);
      if (!ballotRes.error && ballotRes.data) {
        for (const b of ballotRes.data as MeetingBallotRow[]) {
          ballotsByVoteId[b.vote_id] = ballotsByVoteId[b.vote_id] ?? [];
          ballotsByVoteId[b.vote_id].push(b);
          if (uid && b.voter_user_id === uid) myBallotsByVoteId[b.vote_id] = b;
        }
      }
    }

    let invitations: MeetingInvitationRow[] = [];
    const invRes = await withProperty(
      supabase.from('meeting_invitations').select('*') as any,
      propertyId,
    ).eq('meeting_id', meetingId);
    if (!invRes.error && invRes.data) invitations = invRes.data as MeetingInvitationRow[];

    let resolutions: MeetingResolutionRow[] = [];
    const resRes = await supabase.from('meeting_resolutions').select(RESOLUTION_DETAIL_COLUMNS).eq('meeting_id', meetingId);
    if (!resRes.error && resRes.data) resolutions = resRes.data as MeetingResolutionRow[];

    return {
      agendaItems,
      votes,
      ballotsByVoteId,
      myBallotsByVoteId,
      invitations,
      resolutions,
    };
  } catch {
    return emptyExtras();
  }
}

/**
 * Full meeting bundle for editors / one-shot loads.
 * Child query failures yield empty slices; the main row still returns when the meeting exists.
 */
export async function getMeetingDetail(meetingId: string, propertyId: string): Promise<MeetingDetailBundle> {
  const { data: meeting, error: meetingError } = await withProperty(
    supabase.from('meetings').select('*') as any,
    propertyId,
  )
    .eq('id', meetingId)
    .single();

  if (meetingError || !meeting) {
    return { meeting: null, ...emptyExtras() };
  }

  const m = meeting as MeetingRow;

  const agendaRes = await withProperty(
    supabase.from('meeting_agenda_items').select(AGENDA_DETAIL_COLUMNS) as any,
    propertyId,
  )
    .eq('meeting_id', meetingId)
    .order('sort_order', { ascending: true });
  const agendaError = agendaRes.error;
  const agendaItems: MeetingAgendaRow[] =
    !agendaError && agendaRes.data ? (agendaRes.data as MeetingAgendaRow[]) : [];

  const votesRes = await withProperty(
    supabase.from('meeting_votes').select(VOTE_DETAIL_COLUMNS) as any,
    propertyId,
  ).eq('meeting_id', meetingId);
  const votesError = votesRes.error;
  const voteRows: MeetingVoteRow[] = !votesError && votesRes.data ? (votesRes.data as MeetingVoteRow[]) : [];

  const voteIds = voteRows.map((v) => v.id);
  const optionsByVote: Record<string, MeetingVoteOptionRow[]> = {};
  if (voteIds.length > 0) {
    const optRes = await supabase.from('meeting_vote_options').select(VOTE_OPTION_COLUMNS).in('vote_id', voteIds);
    if (!optRes.error && optRes.data) {
      for (const o of optRes.data as MeetingVoteOptionRow[]) {
        optionsByVote[o.vote_id] = optionsByVote[o.vote_id] ?? [];
        optionsByVote[o.vote_id].push(o);
      }
      for (const k of Object.keys(optionsByVote)) {
        optionsByVote[k].sort((a, b) => a.sort_order - b.sort_order);
      }
    }
  }

  const votes = voteRows.map((v) => ({
    ...v,
    options: optionsByVote[v.id] ?? [],
  }));

  const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
  const ballotsByVoteId: Record<string, MeetingBallotRow[]> = {};
  const myBallotsByVoteId: Record<string, MeetingBallotRow | undefined> = {};
  if (voteIds.length > 0) {
    const ballotRes = await withProperty(
      supabase.from('meeting_ballots').select(BALLOT_DETAIL_COLUMNS) as any,
      propertyId,
    ).in('vote_id', voteIds);
    if (!ballotRes.error && ballotRes.data) {
      for (const b of ballotRes.data as MeetingBallotRow[]) {
        ballotsByVoteId[b.vote_id] = ballotsByVoteId[b.vote_id] ?? [];
        ballotsByVoteId[b.vote_id].push(b);
        if (uid && b.voter_user_id === uid) myBallotsByVoteId[b.vote_id] = b;
      }
    }
  }

  const invRes = await withProperty(
    supabase.from('meeting_invitations').select('*') as any,
    propertyId,
  ).eq('meeting_id', meetingId);
  const invitationsError = invRes.error;
  const invitations: MeetingInvitationRow[] =
    !invitationsError && invRes.data ? (invRes.data as MeetingInvitationRow[]) : [];

  const resRes = await supabase.from('meeting_resolutions').select(RESOLUTION_DETAIL_COLUMNS).eq('meeting_id', meetingId);
  const resolutionsError = resRes.error;
  const resolutions: MeetingResolutionRow[] =
    !resolutionsError && resRes.data ? (resRes.data as MeetingResolutionRow[]) : [];

  return {
    meeting: m,
    agendaItems,
    votes,
    ballotsByVoteId,
    myBallotsByVoteId,
    invitations,
    resolutions,
  };
}

export async function createMeeting(input: {
  propertyId: string;
  fiscalYear: number;
  meetingType: MeetingType;
  titleEn?: string | null;
  titleZh?: string | null;
  descriptionEn?: string | null;
  descriptionZh?: string | null;
  scheduledAt?: string | null;
  meetingFormat: MeetingFormat;
  status?: MeetingStatus;
  createdBy: string;
}) {
  const { data, error } = await supabase
    .from('meetings')
    .insert({
      property_id: input.propertyId,
      fiscal_year: input.fiscalYear,
      meeting_type: input.meetingType,
      title_en: input.titleEn ?? null,
      title_zh: input.titleZh ?? null,
      description_en: input.descriptionEn ?? null,
      description_zh: input.descriptionZh ?? null,
      scheduled_at: input.scheduledAt ?? null,
      meeting_format: input.meetingFormat,
      status: input.status ?? 'draft',
      created_by: input.createdBy,
    })
    .select('id')
    .maybeSingle();

  return { id: data?.id as string | undefined, error };
}

export async function updateMeeting(
  meetingId: string,
  propertyId: string,
  patch: Partial<{
    meeting_type: MeetingType;
    title_en: string | null;
    title_zh: string | null;
    description_en: string | null;
    description_zh: string | null;
    scheduled_at: string | null;
    meeting_format: MeetingFormat;
    status: MeetingStatus;
    notice_sent_at: string | null;
    voting_open_at: string | null;
    voting_close_at: string | null;
  }>,
) {
  const { data, error } = await withProperty(supabase.from('meetings').update(patch) as any, propertyId)
    .eq('id', meetingId)
    .select('id')
    .maybeSingle();

  return { id: data?.id, error };
}

export async function createAgendaItem(input: {
  propertyId: string;
  meetingId: string;
  sortOrder: number;
  titleEn?: string | null;
  titleZh?: string | null;
  descriptionEn?: string | null;
  descriptionZh?: string | null;
  requiresVote: boolean;
  voteRule?: VoteRule | null;
}) {
  const { data, error } = await supabase
    .from('meeting_agenda_items')
    .insert({
      meeting_id: input.meetingId,
      property_id: input.propertyId,
      item_number: input.sortOrder,
      sort_order: input.sortOrder,
      title_en: input.titleEn ?? null,
      title_zh: input.titleZh ?? null,
      description_en: input.descriptionEn ?? null,
      description_zh: input.descriptionZh ?? null,
      requires_vote: input.requiresVote,
      vote_rule: input.voteRule ?? null,
    })
    .select('id')
    .maybeSingle();

  return { id: data?.id as string | undefined, error };
}

const DEFAULT_OPTION_KEYS = [
  { key: 'for', label_en: 'For', label_zh: '赞成', so: 0 },
  { key: 'against', label_en: 'Against', label_zh: '反对', so: 1 },
  { key: 'abstain', label_en: 'Abstain', label_zh: '弃权', so: 2 },
] as const;

export async function createVote(input: {
  propertyId: string;
  meetingId: string;
  agendaItemId: string;
  voteRule: VoteRule;
  titleEn?: string | null;
  titleZh?: string | null;
  descriptionEn?: string | null;
  descriptionZh?: string | null;
  status?: VoteStatus;
}) {
  const { data: vote, error: vErr } = await supabase
    .from('meeting_votes')
    .insert({
      property_id: input.propertyId,
      meeting_id: input.meetingId,
      agenda_item_id: input.agendaItemId,
      title_en: input.titleEn ?? null,
      title_zh: input.titleZh ?? null,
      description_en: input.descriptionEn ?? null,
      description_zh: input.descriptionZh ?? null,
      vote_rule: input.voteRule,
      status: input.status ?? 'draft',
    })
    .select('id')
    .maybeSingle();

  if (vErr || !vote?.id) return { voteId: undefined, error: vErr };

  const voteId = vote.id as string;
  const rows = DEFAULT_OPTION_KEYS.map((o) => ({
    vote_id: voteId,
    option_key: o.key,
    label_en: o.label_en,
    label_zh: o.label_zh,
    sort_order: o.so,
  }));

  const { error: oErr } = await supabase.from('meeting_vote_options').insert(rows);
  return { voteId, error: oErr };
}

/** Resolves `property_id` via vote → meeting; uses current auth user as voter. */
export async function castBallot(voteId: string, selectedOptionKey: string, propertyId: string) {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { id: undefined, error: userErr ?? ({ message: 'Not signed in' } as { message: string }) };
  }

  const { data: vote, error: vErr } = await withProperty(
    supabase.from('meeting_votes').select('id, meeting_id') as any,
    propertyId,
  )
    .eq('id', voteId)
    .single();

  if (vErr || !vote) return { id: undefined, error: vErr };

  const { data: mrow, error: mErr } = await withProperty(
    supabase.from('meetings').select('property_id') as any,
    propertyId,
  )
    .eq('id', vote.meeting_id as string)
    .single();

  if (mErr || !mrow?.property_id) return { id: undefined, error: mErr };

  const { data, error } = await supabase
    .from('meeting_ballots')
    .upsert(
      {
        vote_id: voteId,
        property_id: mrow.property_id as string,
        voter_user_id: user.id,
        selected_option_key: selectedOptionKey,
      },
      { onConflict: 'vote_id,voter_user_id' },
    )
    .select('id')
    .maybeSingle();

  return { id: data?.id, error };
}

export async function sendMeetingInvitations(meetingId: string, propertyId: string) {
  try {
    if (!meetingId || !propertyId) {
      return {
        count: 0,
        error: new Error('meetingId and propertyId are required'),
      };
    }

    // Load property members
    const { data: members, error: membersError } = await withProperty(
      supabase.from('property_members').select('user_id') as any,
      propertyId,
    );

    if (membersError) {
      return { count: 0, error: membersError };
    }

    const userIds = Array.from(
      new Set((members ?? []).map((m: { user_id: string }) => m.user_id).filter(Boolean)),
    );

    if (userIds.length === 0) {
      return { count: 0, error: null };
    }

    const now = new Date().toISOString();

    const rows = userIds.map((userId) => ({
      meeting_id: meetingId,
      property_id: propertyId,
      recipient_user_id: userId,
      delivery_channel: 'in_app',
      delivery_status: 'sent',
      sent_at: now,
    }));

    const { data, error } = await supabase
      .from('meeting_invitations')
      .upsert(rows, {
        onConflict: 'meeting_id,recipient_user_id',
      })
      .select();

    if (error) {
      return { count: 0, error };
    }

    return {
      count: data?.length ?? rows.length,
      error: null,
    };
  } catch (error) {
    return {
      count: 0,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

export async function markInvitationsSent(meetingId: string, propertyId: string) {
  const now = new Date().toISOString();
  const { error } = await withProperty(
    supabase.from('meeting_invitations').update({ delivery_status: 'sent', sent_at: now }) as any,
    propertyId,
  )
    .eq('meeting_id', meetingId)
    .eq('delivery_status', 'pending');

  return { error };
}

export async function resetFailedInvitations(meetingId: string, propertyId: string) {
  return await withProperty(
    supabase.from('meeting_invitations').update({ delivery_status: 'pending', sent_at: null }) as any,
    propertyId,
  )
    .eq('meeting_id', meetingId)
    .eq('delivery_status', 'failed');
}

/** Aggregates counts for rows loaded from `meeting_invitations` (see fetchMeetingExtras / getMeetingDetail). */
export function invitationSummary(inv: MeetingInvitationRow[]) {
  return {
    total: inv.length,
    sent: inv.filter((r) => r.delivery_status === 'sent').length,
    opened: inv.filter((r) => r.delivery_status === 'opened').length,
    failed: inv.filter((r) => r.delivery_status === 'failed').length,
    pending: inv.filter((r) => r.delivery_status === 'pending').length,
  };
}

export function ballotTallies(ballots: MeetingBallotRow[]) {
  const tallies: Record<string, number> = {};
  for (const b of ballots) {
    tallies[b.selected_option_key] = (tallies[b.selected_option_key] ?? 0) + 1;
  }
  return tallies;
}

export async function updateVote(
  voteId: string,
  propertyId: string,
  patch: Partial<{ status: VoteStatus; opens_at: string | null; closes_at: string | null }>,
) {
  return await withProperty(supabase.from('meeting_votes').update(patch) as any, propertyId).eq('id', voteId);
}
