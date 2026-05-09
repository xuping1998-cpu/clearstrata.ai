import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { withProperty } from '../../lib/supabaseTenant';
import {
  addDaysIso,
  councilMeetingTitleForOwnerVoteBinding,
  isOwnerVotingMeeting,
  ownerVoteMeetingTypeForInsert,
} from './ownerVotingCouncil';

export type SendMeetingInvitesResult = {
  attempted: number;
  sent: number;
  failed: number;
  errors: { userId: string; message: string }[];
  error: Error | null;
};

/**
 * Calls send-meeting-invite with the anon key (HS256) so the Functions gateway does not verify
 * a user session JWT (ES256). The Edge Function uses the service role only; recipient comes from body.
 */
export async function invokeSendMeetingInviteEdge(params: {
  meetingId: string;
  propertyId: string;
  userId: string;
  locale: 'en' | 'zh';
}): Promise<{ ok: boolean; message: string; detail?: unknown }> {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!anonKey) {
    return { ok: false, message: 'Missing VITE_SUPABASE_ANON_KEY', detail: null };
  }

  console.log('🚨 Edge invoke: supabase.functions.invoke send-meeting-invite', {
    meetingId: params.meetingId,
    propertyId: params.propertyId,
    userId: params.userId,
  });
  const { data, error } = await supabase.functions.invoke('send-meeting-invite', {
    body: {
      meetingId: params.meetingId,
      propertyId: params.propertyId,
      userId: params.userId,
      locale: params.locale,
    },
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
  });

  if (error) {
    let body: Record<string, unknown> = {};
    if (error instanceof FunctionsHttpError) {
      try {
        body = (await error.context.clone().json()) as Record<string, unknown>;
      } catch (e) {
        console.error('🚨 failed to parse FunctionsHttpError body', e);
      }
    }
    const msg =
      (typeof body.message === 'string' && body.message) ||
      (typeof body.error === 'string' && body.error) ||
      error.message ||
      'send-meeting-invite failed';
    return { ok: false, message: msg, detail: body.detail ?? body };
  }

  const d = data as Record<string, unknown> | null;
  if (d && d.ok === false) {
    return {
      ok: false,
      message: String(d.message ?? d.error ?? 'error'),
      detail: d.detail,
    };
  }
  if (d && typeof d.error === 'string' && d.ok !== true && d.success !== true) {
    return { ok: false, message: d.error, detail: d };
  }
  if (d && (d.ok === true || d.success === true)) {
    return { ok: true, message: String(d.message ?? 'sent'), detail: d.detail ?? d };
  }
  return { ok: false, message: 'Unexpected response from send-meeting-invite', detail: data };
}

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
  /** Aggregated ballots for the meeting (DB trigger-maintained). */
  vote_result?: {
    approve?: number;
    reject?: number;
    abstain?: number;
    total?: number;
  } | null;
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
  email: string | null;
  voted_at: string | null;
  /** approve / reject / abstain (mapped from ballot option keys for / against / abstain). */
  vote: 'approve' | 'reject' | 'abstain' | null;
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

/** When `writtenRemote`, requires discussion open + closes (meta elsewhere) + voting open/close. */
export function noticeReadiness(
  meeting: Partial<MeetingRow>,
  agendaCount: number,
  opts?: { writtenRemote?: boolean; discussionClosesIso?: string | null },
) {
  const hasTitle =
    (meeting.title_en && meeting.title_en.trim().length > 0) ||
    (meeting.title_zh && meeting.title_zh.trim().length > 0);
  const written = !!opts?.writtenRemote;
  const hasScheduleBlock = written
    ? !!meeting.scheduled_at &&
      !!meeting.voting_open_at &&
      !!meeting.voting_close_at &&
      !!(opts?.discussionClosesIso && String(opts.discussionClosesIso).trim())
    : !!meeting.scheduled_at;
  return {
    ok: !!meeting.meeting_type && hasTitle && hasScheduleBlock && !!meeting.meeting_format && agendaCount >= 1,
    hasTitle,
    hasScheduledAt: hasScheduleBlock,
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
 * Core row — `id` + `.single()`, always scoped by `property_id` (defense in depth; not RLS-only).
 */
export async function fetchMeetingCore(meetingId: string, propertyId: string) {
  try {
    const scoped = withProperty(supabase.from('meetings').select('*') as any, propertyId);
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
      const optRes = await withProperty(
        supabase.from('meeting_vote_options').select(VOTE_OPTION_COLUMNS) as any,
        propertyId,
      ).in('vote_id', voteIds);
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
    const resRes = await withProperty(
      supabase.from('meeting_resolutions').select(RESOLUTION_DETAIL_COLUMNS) as any,
      propertyId,
    ).eq('meeting_id', meetingId);
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
    const optRes = await withProperty(
      supabase.from('meeting_vote_options').select(VOTE_OPTION_COLUMNS) as any,
      propertyId,
    ).in('vote_id', voteIds);
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

  const resRes = await withProperty(
    supabase.from('meeting_resolutions').select(RESOLUTION_DETAIL_COLUMNS) as any,
    propertyId,
  ).eq('meeting_id', meetingId);
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
  votingOpenAt?: string | null;
  votingCloseAt?: string | null;
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
      voting_open_at: input.votingOpenAt ?? null,
      voting_close_at: input.votingCloseAt ?? null,
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
  const { data, error } = await withProperty(
    supabase.from('meetings').update({ ...patch, property_id: propertyId }) as any,
    propertyId,
  )
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
    property_id: input.propertyId,
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
        property_id: propertyId,
        voter_user_id: user.id,
        selected_option_key: selectedOptionKey,
      },
      { onConflict: 'vote_id,voter_user_id' },
    )
    .select('id')
    .maybeSingle();

  return { id: data?.id, error };
}

/**
 * Bulk invite: writes `meeting_invitations` as pending, then invokes `send-meeting-invite`
 * per member. Only marks `sent` after Resend succeeds; otherwise `failed`.
 */
export async function sendMeetingInvitations(
  meetingId: string,
  propertyId: string,
  locale: 'en' | 'zh' = 'zh',
): Promise<SendMeetingInvitesResult> {
  console.log('🚨 BUILD VERSION', import.meta.env.VITE_BUILD_TIME || 'dev');
  console.log('🚨 sendMeetingInvitations CALLED', { meetingId, propertyId, locale });

  const empty = (error: Error | null): SendMeetingInvitesResult => ({
    attempted: 0,
    sent: 0,
    failed: 0,
    errors: [],
    error,
  });

  try {
    if (!meetingId || !propertyId) {
      console.warn('🚨 early return reason:', 'missing meetingId or propertyId', { meetingId, propertyId });
      return empty(new Error('meetingId and propertyId are required'));
    }

    const {
      data: { session },
      error: sessionErr,
    } = await supabase.auth.getSession();
    if (sessionErr || !session) {
      console.warn('🚨 early return reason:', 'no session (required for loading members / invitations)', {
        sessionErr: sessionErr?.message,
      });
      return empty(new Error(sessionErr?.message ?? 'Not signed in'));
    }

    const { data: members, error: membersError } = await withProperty(
      supabase.from('property_members').select('user_id') as any,
      propertyId,
    );

    if (membersError) {
      console.warn('🚨 early return reason:', 'property_members query failed', membersError);
      return empty(
        new Error(
          (membersError as { message?: string }).message ?? 'Failed to load property members',
        ),
      );
    }

    const userIds = Array.from(
      new Set((members ?? []).map((m: { user_id: string }) => m.user_id).filter(Boolean)),
    );

    console.log('[sendMeetingInvitations] recipients count', userIds.length);

    if (userIds.length === 0) {
      console.warn('🚨 early return reason:', 'recipientsList empty (no property members)');
      return empty(null);
    }

    const { data: profRows, error: profErr } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds);

    if (profErr) {
      console.warn('🚨 early return reason:', 'profiles query failed', profErr);
      return empty(new Error((profErr as { message?: string }).message ?? 'Failed to load profiles'));
    }

    const emailByUser: Record<string, string | null> = {};
    for (const p of (profRows ?? []) as { id: string; email: string | null }[]) {
      emailByUser[p.id] = p.email ?? null;
    }

    const pendingRows = userIds.map((userId) => ({
      meeting_id: meetingId,
      property_id: propertyId,
      recipient_user_id: userId,
      email: emailByUser[userId] ?? null,
      delivery_channel: 'email',
      delivery_status: 'pending',
      sent_at: null as string | null,
    }));

    const { error: pendingErr } = await withProperty(
      supabase.from('meeting_invitations').upsert(pendingRows, {
        onConflict: 'meeting_id,recipient_user_id',
      }) as any,
      propertyId,
    );

    if (pendingErr) {
      console.warn('🚨 early return reason:', 'meeting_invitations upsert failed', pendingErr);
      return empty(
        new Error((pendingErr as { message?: string }).message ?? 'Failed to save pending invitations'),
      );
    }

    const recipientsList = userIds.map((id) => ({
      userId: id,
      email: emailByUser[id] ?? null,
    }));
    console.log('🚨 about to invoke send-meeting-invite', { meetingId, propertyId, recipientsList });

    const errors: { userId: string; message: string }[] = [];
    let sent = 0;
    let failed = 0;

    for (const userId of userIds) {
      const inviteEmail = emailByUser[userId] ?? null;
      console.log('🚨 invoking for', inviteEmail, { userId });
      console.log('invoking send-meeting-invite', userId);
      console.log('[sendMeetingInvitations] invoking send-meeting-invite', { userId, meetingId, propertyId });
      const r = await invokeSendMeetingInviteEdge({
        meetingId,
        propertyId,
        userId,
        locale,
      });

      if (r.ok) {
        console.log('send-meeting-invite success', userId);
        console.log('[sendMeetingInvitations] send-meeting-invite success', userId);
        sent += 1;
        const now = new Date().toISOString();
        const { error: upErr } = await withProperty(
          supabase
            .from('meeting_invitations')
            .update({
              delivery_status: 'sent',
              sent_at: now,
              email: emailByUser[userId] ?? null,
              delivery_channel: 'email',
              property_id: propertyId,
            } as any)
            .eq('meeting_id', meetingId)
            .eq('recipient_user_id', userId) as any,
          propertyId,
        );
        if (upErr) {
          console.error('[sendMeetingInvitations] failed to mark sent in DB', upErr);
        }
      } else {
        console.error('send-meeting-invite error', userId, r.message);
        console.error('[sendMeetingInvitations] send-meeting-invite error', userId, r.message, r.detail);
        failed += 1;
        errors.push({ userId, message: r.message });
        await withProperty(
          supabase
            .from('meeting_invitations')
            .update({
              delivery_status: 'failed',
              sent_at: null,
              property_id: propertyId,
            } as any)
            .eq('meeting_id', meetingId)
            .eq('recipient_user_id', userId) as any,
          propertyId,
        );
      }
    }

    return {
      attempted: userIds.length,
      sent,
      failed,
      errors,
      error: failed === userIds.length && userIds.length > 0 ? new Error(errors[0]?.message ?? 'All sends failed') : null,
    };
  } catch (error) {
    console.error('🚨 invoke failed', error);
    return empty(error instanceof Error ? error : new Error('Unknown error'));
  }
}

export async function markInvitationsSent(meetingId: string, propertyId: string) {
  const now = new Date().toISOString();
  const { error } = await withProperty(
    supabase.from('meeting_invitations').update({ delivery_status: 'sent', sent_at: now, property_id: propertyId }) as any,
    propertyId,
  )
    .eq('meeting_id', meetingId)
    .eq('delivery_status', 'pending');

  return { error };
}

export async function resetFailedInvitations(meetingId: string, propertyId: string) {
  return await withProperty(
    supabase.from('meeting_invitations').update({ delivery_status: 'pending', sent_at: null, property_id: propertyId }) as any,
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
    voted: inv.filter((r) => r.delivery_status === 'voted').length,
    failed: inv.filter((r) => r.delivery_status === 'failed').length,
    pending: inv.filter((r) => r.delivery_status === 'pending').length,
    /** Rows with a recorded open (includes voted). */
    openedCount: inv.filter((r) => r.opened_at != null || r.delivery_status === 'voted').length,
  };
}

/** Marks the current user’s invitation as opened (RPC; preserves `voted` / `failed`). */
export async function markMeetingInvitationOpened(meetingId: string, propertyId: string) {
  return await supabase.rpc('mark_meeting_invitation_opened', {
    p_meeting_id: meetingId,
    p_property_id: propertyId,
  });
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
  return await withProperty(
    supabase.from('meeting_votes').update({ ...patch, property_id: propertyId }) as any,
    propertyId,
  ).eq('id', voteId);
}

/** Maps council `meeting_votes.vote_rule` to `owner_vote_resolutions.threshold`. */
export function mapVoteRuleToOwnerVoteThreshold(
  voteRule: VoteRule | null | undefined,
): 'majority' | 'three_quarter' | 'unanimous' {
  if (voteRule === 'three_quarter') return 'three_quarter';
  if (voteRule === 'unanimous') return 'unanimous';
  return 'majority';
}

/**
 * Ensures an `owner_vote_meetings` row exists for the current AGM/SGM council meeting (by title binding).
 * No-op returns `{ id: null, error: null }` when the meeting type is not owner-votable.
 */
export async function ensureOwnerVoteMeetingForCouncilMeeting(params: {
  propertyId: string;
  meeting: MeetingRow;
  userId: string;
}): Promise<{ id: string | null; error: Error | null }> {
  const { propertyId, meeting, userId } = params;

  if (!isOwnerVotingMeeting(meeting)) {
    return { id: null, error: null };
  }

  const title = councilMeetingTitleForOwnerVoteBinding(meeting).trim();
  if (!title) {
    return {
      id: null,
      error: new Error('Meeting needs a Chinese or English title before owner vote records can be created.'),
    };
  }

  try {
    const { data: existing, error: qErr } = await supabase
      .from('owner_vote_meetings')
      .select('id')
      .eq('property_id', propertyId)
      .eq('title', title)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (qErr) return { id: null, error: new Error(qErr.message) };
    const existingId =
      existing &&
      typeof existing === 'object' &&
      existing !== null &&
      'id' in existing &&
      (existing as { id: unknown }).id != null
        ? String((existing as { id: string }).id)
        : null;
    if (existingId) return { id: existingId, error: null };

    const scheduledIso = meeting.scheduled_at?.trim()
      ? new Date(meeting.scheduled_at).toISOString()
      : null;

    const descZh = meeting.description_zh?.trim();
    const descEn = meeting.description_en?.trim();
    const descriptionParts = [descZh, descEn].filter((x): x is string => Boolean(x));
    const description = descriptionParts.length ? descriptionParts.join('\n\n').slice(0, 24000) : null;

    const row = {
      property_id: propertyId,
      meeting_type: ownerVoteMeetingTypeForInsert(meeting),
      title,
      description,
      scheduled_at: scheduledIso,
      voting_opens_at: new Date().toISOString(),
      voting_closes_at: addDaysIso(scheduledIso ?? null, 7),
      status: 'draft',
      created_by: userId,
    };

    const { data: inserted, error: insErr } = await supabase
      .from('owner_vote_meetings')
      .insert(row)
      .select('id')
      .maybeSingle();

    if (insErr) return { id: null, error: new Error(insErr.message) };
    const newId =
      inserted &&
      typeof inserted === 'object' &&
      inserted !== null &&
      'id' in inserted &&
      (inserted as { id: unknown }).id != null
        ? String((inserted as { id: string }).id)
        : null;
    return { id: newId, error: null };
  } catch (e: unknown) {
    return { id: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/** Slim row for council meeting ↔ owner_vote_meetings binding (no auto-create). */
export type OwnerVoteMeetingLite = {
  id: string;
  status: string;
  voting_opens_at: string | null;
  voting_closes_at: string | null;
  snapshot_frozen_at: string | null;
  created_at: string;
};

/**
 * Loads the latest `owner_vote_meetings` row for this council meeting (by title binding) plus counts.
 * Does not insert — use `ensureOwnerVoteMeetingForCouncilMeeting` or agenda “需要表决” flow to create.
 */
export async function fetchOwnerVoteMeetingMetaForCouncilMeeting(params: {
  propertyId: string;
  meeting: MeetingRow;
}): Promise<{
  meeting: OwnerVoteMeetingLite | null;
  resolutions: Array<{ id: string; title: string; threshold: string }>;
  resolutionCount: number;
  eligibleCount: number;
  error: Error | null;
}> {
  const { propertyId, meeting } = params;

  if (!isOwnerVotingMeeting(meeting)) {
    return { meeting: null, resolutions: [], resolutionCount: 0, eligibleCount: 0, error: null };
  }

  const title = councilMeetingTitleForOwnerVoteBinding(meeting).trim();
  if (!title) {
    return { meeting: null, resolutions: [], resolutionCount: 0, eligibleCount: 0, error: null };
  }

  const { data: row, error: qErr } = await supabase
    .from('owner_vote_meetings')
    .select('id,status,voting_opens_at,voting_closes_at,snapshot_frozen_at,created_at')
    .eq('property_id', propertyId)
    .eq('title', title)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (qErr) {
    return { meeting: null, resolutions: [], resolutionCount: 0, eligibleCount: 0, error: new Error(qErr.message) };
  }

  if (!row || typeof row !== 'object' || !('id' in row) || row.id == null) {
    return { meeting: null, resolutions: [], resolutionCount: 0, eligibleCount: 0, error: null };
  }

  const mid = String(row.id);

  const resQ = await supabase
    .from('owner_vote_resolutions')
    .select('id,title,threshold')
    .eq('meeting_id', mid)
    .order('display_order', { ascending: true });

  const resolutionsRaw = (resQ.data ?? []) as { id: string; title: unknown; threshold: unknown }[];
  const resolutions = resolutionsRaw.map((r) => ({
    id: String(r.id),
    title: typeof r.title === 'string' ? r.title : '',
    threshold: typeof r.threshold === 'string' ? r.threshold : String(r.threshold ?? ''),
  }));

  const eligC = await supabase
    .from('owner_vote_voter_snapshot')
    .select('id', { count: 'exact', head: true })
    .eq('meeting_id', mid)
    .eq('is_eligible', true);

  const resolutionCount = resolutions.length;
  const eligibleCount = typeof eligC.count === 'number' ? eligC.count : 0;
  const countErr = resQ.error ?? eligC.error;
  if (countErr) {
    console.error('[fetchOwnerVoteMeetingMetaForCouncilMeeting]', countErr);
  }

  return {
    meeting: row as OwnerVoteMeetingLite,
    resolutions,
    resolutionCount,
    eligibleCount,
    error: countErr ? new Error(countErr.message) : null,
  };
}

/** Normalized row from `owner_vote_resolution_results` view. */
export type OwnerVoteResolutionResultNormalized = {
  resolution_id: string;
  title: string | null;
  threshold: string | null;
  yes_count: number;
  no_count: number;
  abstain_count: number;
  total_cast: number;
  eligible_count: number;
  passed: boolean | null;
};

function pickNumOvResult(raw: Record<string, unknown>, keys: string[]): number {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  }
  return 0;
}

export function normalizeOwnerVoteResolutionResultRow(raw: Record<string, unknown>): OwnerVoteResolutionResultNormalized | null {
  const resolution_id = String(raw.resolution_id ?? raw.resolutionId ?? '').trim();
  if (!resolution_id) return null;
  const title = raw.title != null ? String(raw.title) : null;
  const threshold = raw.threshold != null ? String(raw.threshold) : null;
  const yes_count = pickNumOvResult(raw, ['yes_count', 'yesCount']);
  const no_count = pickNumOvResult(raw, ['no_count', 'noCount']);
  const abstain_count = pickNumOvResult(raw, ['abstain_count', 'abstainCount']);
  const total_cast = pickNumOvResult(raw, ['total_cast', 'totalCast', 'votes_cast']);
  const eligible_count = pickNumOvResult(raw, ['eligible_count', 'eligibleCount', 'eligible_voters']);
  let passedVal: boolean | null = null;
  const pv = raw.passed ?? raw.is_passed;
  if (typeof pv === 'boolean') passedVal = pv;
  else if (pv === null || pv === undefined) passedVal = null;
  else if (pv === 't' || pv === 'true' || pv === 1) passedVal = true;
  else if (pv === 'f' || pv === 'false' || pv === 0) passedVal = false;
  return {
    resolution_id,
    title,
    threshold,
    yes_count,
    no_count,
    abstain_count,
    total_cast,
    eligible_count,
    passed: passedVal,
  };
}

/** Reads formal tallies from `owner_vote_resolution_results` (no ballot table scans). */
export async function fetchOwnerVoteResolutionResultsForOwnerMeeting(params: {
  propertyId: string;
  ownerVoteMeetingId: string;
}): Promise<{ rows: OwnerVoteResolutionResultNormalized[]; error: Error | null }> {
  const { propertyId, ownerVoteMeetingId } = params;
  const { data, error } = await supabase
    .from('owner_vote_resolution_results')
    .select('*')
    .eq('property_id', propertyId)
    .eq('meeting_id', ownerVoteMeetingId);
  if (error) return { rows: [], error: new Error(error.message) };
  const rows: OwnerVoteResolutionResultNormalized[] = [];
  for (const row of data ?? []) {
    const n = normalizeOwnerVoteResolutionResultRow(row as Record<string, unknown>);
    if (n) rows.push(n);
  }
  return { rows, error: null };
}
