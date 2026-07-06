import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { withProperty } from '../../lib/supabaseTenant';
import { deriveOwnerVoteMeetingVotingTimes } from './meetingFormatModel';
import { addDaysIso } from './ownerVotingCouncil';
import {
  councilMeetingBindingMarkerSubstring,
  councilMeetingTitleForOwnerVoteBinding,
  embedCouncilMeetingBinding,
  extractCouncilMeetingBinding,
  ownerVoteMeetingBindsCouncil,
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
  noticeType?: MeetingNoticeType;
}): Promise<{ ok: boolean; message: string; detail?: unknown }> {
  const noticeType = params.noticeType ?? 'meeting_notice';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!anonKey) {
    return { ok: false, message: 'Missing VITE_SUPABASE_ANON_KEY', detail: null };
  }

  console.log('🚨 Edge invoke: supabase.functions.invoke send-meeting-invite', {
    meetingId: params.meetingId,
    propertyId: params.propertyId,
    userId: params.userId,
    noticeType,
  });
  const { data, error } = await supabase.functions.invoke('send-meeting-invite', {
    body: {
      meetingId: params.meetingId,
      propertyId: params.propertyId,
      userId: params.userId,
      locale: params.locale,
      noticeType,
      notice_type: noticeType,
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

async function loadInviteEmailsByUserId(userIds: string[]): Promise<{
  emailByUser: Record<string, string | null>;
  error: Error | null;
}> {
  if (userIds.length === 0) {
    return { emailByUser: {}, error: null };
  }
  const { data: profRows, error: profErr } = await supabase
    .from('profiles')
    .select('id, email')
    .in('id', userIds);
  if (profErr) {
    return { emailByUser: {}, error: new Error(profErr.message ?? 'Failed to load profiles') };
  }
  const emailByUser: Record<string, string | null> = {};
  for (const p of (profRows ?? []) as { id: string; email: string | null }[]) {
    emailByUser[p.id] = p.email ?? null;
  }
  return { emailByUser, error: null };
}

type VoteRecipientMemberRow = {
  user_id: string;
  unit_no: string | null;
  role: string;
  status: string;
};

function voteRecipientRoleRank(role: string): number {
  return String(role ?? '').trim().toLowerCase() === 'council' ? 1 : 2;
}

function compareVoteRecipientPriority(a: VoteRecipientMemberRow, b: VoteRecipientMemberRow): number {
  const ra = voteRecipientRoleRank(a.role);
  const rb = voteRecipientRoleRank(b.role);
  if (ra !== rb) return ra - rb;
  return a.user_id.localeCompare(b.user_id);
}

/** One recipient per unit; council beats owner (matches freeze_owner_vote_snapshot). */
function pickEligibleVoteRecipientsFromMemberRows(rows: VoteRecipientMemberRow[]): VoteRecipientMemberRow[] {
  const eligible = rows.filter((r) => {
    const unit = String(r.unit_no ?? '').trim();
    const role = String(r.role ?? '').trim().toLowerCase();
    return r.status === 'active' && unit && (role === 'owner' || role === 'council');
  });
  const byUnit = new Map<string, VoteRecipientMemberRow>();
  for (const r of eligible) {
    const key = String(r.unit_no).trim().toLowerCase();
    const prev = byUnit.get(key);
    if (!prev || compareVoteRecipientPriority(r, prev) < 0) {
      byUnit.set(key, r);
    }
  }
  return [...byUnit.values()].sort((a, b) =>
    String(a.unit_no).trim().toLowerCase().localeCompare(String(b.unit_no).trim().toLowerCase()),
  );
}

/** Invoke send-meeting-invite per recipient and sync meeting_invitations delivery_status. */
async function dispatchMeetingInviteEmails(params: {
  meetingId: string;
  propertyId: string;
  userIds: string[];
  emailByUser: Record<string, string | null>;
  locale: 'en' | 'zh';
  noticeType?: MeetingNoticeType;
}): Promise<SendMeetingInvitesResult> {
  const { meetingId, propertyId, userIds, emailByUser, locale, noticeType = 'meeting_notice' } = params;
  const errors: { userId: string; message: string }[] = [];
  let sent = 0;
  let failed = 0;

  for (const userId of userIds) {
    const r = await invokeSendMeetingInviteEdge({
      meetingId,
      propertyId,
      userId,
      locale,
      noticeType,
    });

    if (r.ok) {
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
          .eq('recipient_user_id', userId)
          .eq('notice_type', noticeType) as any,
        propertyId,
      );
      if (upErr) {
        console.error('[dispatchMeetingInviteEmails] failed to mark sent in DB', upErr);
      }
    } else {
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
          .eq('recipient_user_id', userId)
          .eq('notice_type', noticeType) as any,
        propertyId,
      );
    }
  }

  return {
    attempted: userIds.length,
    sent,
    failed,
    errors,
    error:
      failed === userIds.length && userIds.length > 0
        ? new Error(errors[0]?.message ?? 'All sends failed')
        : null,
  };
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
  opening_statement_zh?: string | null;
  opening_statement_en?: string | null;
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
  community_resolution_id?: string | null;
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
  notice_type?: string;
  created_at: string | null;
}

/** Current eligible invitee merged with optional `meeting_invitations` tracking row. */
export interface MeetingInviteRecipientRow {
  user_id: string;
  unit_no: string | null;
  email: string | null;
  full_name_en: string | null;
  full_name_zh: string | null;
  role: string;
  member_status: string;
  invitation: MeetingInvitationRow | null;
  delivery_status: string | null;
  opened_at: string | null;
  voted_at: string | null;
}

export interface MeetingResolutionRow {
  id: string;
  meeting_id: string;
  agenda_item_id: string | null;
  /** Canonical display body (compat: maps from legacy `resolution_text`, `content`, `title`). */
  resolution_text: string;
  /** Canonical outcome string; compat from legacy `outcome` or boolean `passed`. */
  outcome: string | null;
  followup_required: boolean;
  created_at: string | null;
  property_id?: string | null;
  /** DB / alternate column names when present on the payload */
  title?: string;
  content?: string;
  passed?: boolean;
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
  inviteRecipients: MeetingInviteRecipientRow[];
  resolutions: MeetingResolutionRow[];
}

const MEETING_LIST_COLUMNS =
  'id, property_id, fiscal_year, meeting_type, title_en, title_zh, description_en, description_zh, scheduled_at, meeting_format, status, voting_open_at, voting_close_at, notice_sent_at, created_at';

export type MeetingAgendaItemsListLiteRow = Pick<MeetingAgendaRow, 'meeting_id' | 'requires_vote' | 'description_zh'>;

/** Agenda rows for meeting cards (no RPC; same table SELECT as detail). */
export async function fetchMeetingAgendaSummariesForMeetingIds(propertyId: string, meetingIds: string[]) {
  if (!meetingIds.length) return { rows: [] as MeetingAgendaItemsListLiteRow[], error: null as Error | null };
  const { data, error } = await withProperty(
    supabase.from('meeting_agenda_items').select('meeting_id, requires_vote, description_zh') as any,
    propertyId,
  ).in('meeting_id', meetingIds);
  if (error) return { rows: [], error: new Error(error.message) };
  return { rows: (data ?? []) as MeetingAgendaItemsListLiteRow[], error: null };
}

export type OwnerVoteMeetingCardRow = Pick<
  OwnerVoteMeetingLite,
  'status' | 'voting_opens_at' | 'voting_closes_at' | 'snapshot_frozen_at'
>;

/**
 * Latest `owner_vote_meetings` row per council title binding (tie-break newest `created_at`).
 * Read-only SELECT; no inserts.
 */
export async function fetchLatestOwnerVoteMeetingCardRowsByCouncilTitles(propertyId: string, titles: string[]) {
  const uniq = [...new Set(titles.map((x) => String(x ?? '').trim()).filter(Boolean))];
  if (!uniq.length) return { byTitle: {} as Record<string, OwnerVoteMeetingCardRow>, error: null as Error | null };

  const { data, error } = await supabase
    .from('owner_vote_meetings')
    .select('title,status,voting_opens_at,voting_closes_at,snapshot_frozen_at,created_at')
    .eq('property_id', propertyId)
    .in('title', uniq);

  if (error) return { byTitle: {}, error: new Error(error.message) };

  const sorted = [...(data ?? [])].sort((a, b) =>
    String((b as { created_at?: string }).created_at ?? '').localeCompare(
      String((a as { created_at?: string }).created_at ?? ''),
    ),
  );

  const byTitle: Record<string, OwnerVoteMeetingCardRow> = {};
  for (const raw of sorted) {
    const row = raw as {
      title?: unknown;
      status?: unknown;
      voting_opens_at?: unknown;
      voting_closes_at?: unknown;
      snapshot_frozen_at?: unknown;
    };
    const titleKey = typeof row.title === 'string' ? row.title.trim() : '';
    if (!titleKey || byTitle[titleKey]) continue;
    const statusVal = typeof row.status === 'string' ? row.status : '';
    byTitle[titleKey] = {
      status: statusVal,
      voting_opens_at: typeof row.voting_opens_at === 'string' ? row.voting_opens_at : null,
      voting_closes_at: typeof row.voting_closes_at === 'string' ? row.voting_closes_at : null,
      snapshot_frozen_at: typeof row.snapshot_frozen_at === 'string' ? row.snapshot_frozen_at : null,
    };
  }

  return { byTitle, error: null };
}

const AGENDA_DETAIL_COLUMNS =
  'id, meeting_id, sort_order, title_en, title_zh, description_en, description_zh, requires_vote, vote_rule, community_resolution_id, created_at';

const VOTE_DETAIL_COLUMNS =
  'id, meeting_id, agenda_item_id, title_en, title_zh, description_en, description_zh, vote_rule, status, opens_at, closes_at, created_at';

const VOTE_OPTION_COLUMNS = 'id, vote_id, option_key, label_en, label_zh, sort_order';

const BALLOT_DETAIL_COLUMNS = 'id, vote_id, property_id, voter_user_id, selected_option_key, unit_weight, created_at';

const RESOLUTION_DETAIL_COLUMNS =
  'id, meeting_id, agenda_item_id, title, content, passed, created_at, property_id';

type MeetingResolutionApiRow = {
  id: string;
  meeting_id: string;
  agenda_item_id: string | null;
  title?: string | null;
  content?: string | null;
  passed?: boolean | null;
  resolution_text?: string | null;
  outcome?: string | null;
  followup_required?: boolean | null;
  created_at: string | null;
  property_id?: string | null;
};

export function normalizeMeetingResolutionRow(raw: MeetingResolutionApiRow): MeetingResolutionRow {
  const resolution_text = raw.resolution_text ?? raw.content ?? raw.title ?? '';
  const outcome =
    raw.outcome ?? (raw.passed === true ? 'passed' : raw.passed === false ? 'failed' : null);
  const followup_required = raw.followup_required ?? false;
  const row: MeetingResolutionRow = {
    id: raw.id,
    meeting_id: raw.meeting_id,
    agenda_item_id: raw.agenda_item_id,
    resolution_text,
    outcome,
    followup_required,
    created_at: raw.created_at,
    property_id: raw.property_id,
  };
  if (typeof raw.title === 'string') row.title = raw.title;
  if (typeof raw.content === 'string') row.content = raw.content;
  if (raw.passed === true || raw.passed === false) row.passed = raw.passed;
  return row;
}

export function meetingTitleZhFirst(m: Pick<MeetingRow, 'title_zh' | 'title_en'>) {
  const zh = m.title_zh?.trim();
  const en = m.title_en?.trim();
  return zh || en || '';
}

/** When `writtenRemote`, requires discussion open + closes (meta elsewhere) + voting open/close. */
export function noticeReadiness(
  meeting: Partial<MeetingRow>,
  agendaCount: number,
  opts?: {
    writtenRemote?: boolean;
    discussionClosesIso?: string | null;
    /** When false, permits zero agenda rows (draft / pre-detail save). Default true. */
    requireAgenda?: boolean;
  },
) {
  const hasTitle =
    (meeting.title_en && meeting.title_en.trim().length > 0) ||
    (meeting.title_zh && meeting.title_zh.trim().length > 0);
  const written = !!opts?.writtenRemote;
  const requireAgenda = opts?.requireAgenda !== false;
  const hasScheduleBlock = written
    ? !!(meeting.scheduled_at && meeting.voting_open_at && meeting.voting_close_at)
    : !!meeting.scheduled_at;
  const agendaOk = !requireAgenda || agendaCount >= 1;
  return {
    ok: !!meeting.meeting_type && hasTitle && hasScheduleBlock && !!meeting.meeting_format && agendaOk,
    hasTitle,
    hasScheduledAt: hasScheduleBlock,
    hasFormat: !!meeting.meeting_format,
    agendaCount,
  };
}

/** Rows are ordered in SQL for stability; `/meetings` list re-sorts client-side by status + voting window (see MeetingListView). */
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
  inviteRecipients: [],
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

const INVITE_SENT_DELIVERY_STATUSES = new Set(['sent', 'opened', 'delivered', 'voted']);

async function loadInviteProfilesByUserId(userIds: string[]): Promise<{
  profileById: Record<
    string,
    { email: string | null; full_name_en: string | null; full_name_zh: string | null }
  >;
  error: Error | null;
}> {
  if (userIds.length === 0) {
    return { profileById: {}, error: null };
  }
  const { data: profRows, error: profErr } = await supabase
    .from('profiles')
    .select('id, email, full_name_en, full_name_zh')
    .in('id', userIds);
  if (profErr) {
    return { profileById: {}, error: new Error(profErr.message ?? 'Failed to load profiles') };
  }
  const profileById: Record<
    string,
    { email: string | null; full_name_en: string | null; full_name_zh: string | null }
  > = {};
  for (const p of (profRows ?? []) as {
    id: string;
    email: string | null;
    full_name_en: string | null;
    full_name_zh: string | null;
  }[]) {
    profileById[p.id] = {
      email: p.email ?? null,
      full_name_en: p.full_name_en ?? null,
      full_name_zh: p.full_name_zh ?? null,
    };
  }
  return { profileById, error: null };
}

/** Current eligible owner/council invitees with optional `meeting_invitations` tracking. */
export async function fetchMeetingInviteRecipients(
  meetingId: string,
  propertyId: string,
): Promise<{ recipients: MeetingInviteRecipientRow[]; error: Error | null }> {
  try {
    const { data: members, error: membersError } = await withProperty(
      supabase.from('property_members').select('user_id, unit_no, role, status') as any,
      propertyId,
    )
      .eq('status', 'active')
      .in('role', ['owner', 'council']);

    if (membersError) {
      return {
        recipients: [],
        error: new Error(
          (membersError as { message?: string }).message ?? 'Failed to load property members',
        ),
      };
    }

    const picked = pickEligibleVoteRecipientsFromMemberRows((members ?? []) as VoteRecipientMemberRow[]);
    if (picked.length === 0) {
      return { recipients: [], error: null };
    }

    const userIds = picked.map((m) => m.user_id);
    const [{ profileById, error: profErr }, invRes] = await Promise.all([
      loadInviteProfilesByUserId(userIds),
      withProperty(supabase.from('meeting_invitations').select('*') as any, propertyId)
        .eq('meeting_id', meetingId)
        .eq('notice_type', 'meeting_notice'),
    ]);

    if (profErr) {
      return { recipients: [], error: profErr };
    }

    const invByUser = new Map<string, MeetingInvitationRow>();
    if (!invRes.error && invRes.data) {
      for (const inv of invRes.data as MeetingInvitationRow[]) {
        invByUser.set(inv.recipient_user_id, inv);
      }
    }

    const recipients: MeetingInviteRecipientRow[] = picked.map((m) => {
      const prof = profileById[m.user_id];
      const invitation = invByUser.get(m.user_id) ?? null;
      return {
        user_id: m.user_id,
        unit_no: String(m.unit_no ?? '').trim() || null,
        email: prof?.email ?? invitation?.email ?? null,
        full_name_en: prof?.full_name_en ?? null,
        full_name_zh: prof?.full_name_zh ?? null,
        role: m.role,
        member_status: m.status,
        invitation,
        delivery_status: invitation?.delivery_status ?? null,
        opened_at: invitation?.opened_at ?? null,
        voted_at: invitation?.voted_at ?? null,
      };
    });

    return { recipients, error: null };
  } catch (e) {
    return {
      recipients: [],
      error: e instanceof Error ? e : new Error('Failed to load invite recipients'),
    };
  }
}

/** Frozen-roll eligible voters merged with `meeting_invitations` where notice_type = voting_notice. */
export async function fetchVotingNoticeRecipients(
  councilMeetingId: string,
  propertyId: string,
  ownerVoteMeetingId: string,
): Promise<{ recipients: MeetingInviteRecipientRow[]; error: Error | null }> {
  try {
    const snapRes = await supabase
      .from('owner_vote_voter_snapshot')
      .select('user_id, unit_no, is_eligible')
      .eq('meeting_id', ownerVoteMeetingId)
      .eq('is_eligible', true);

    if (snapRes.error) {
      return {
        recipients: [],
        error: new Error(snapRes.error.message ?? 'Failed to load voter snapshot'),
      };
    }

    const snapRows = (snapRes.data ?? []) as {
      user_id: string;
      unit_no: string | null;
      is_eligible: boolean;
    }[];

    if (snapRows.length === 0) {
      return { recipients: [], error: null };
    }

    const userIds = [...new Set(snapRows.map((r) => r.user_id))];
    const unitByUser = new Map(snapRows.map((r) => [r.user_id, r.unit_no]));

    const [{ profileById, error: profErr }, invRes, membRes] = await Promise.all([
      loadInviteProfilesByUserId(userIds),
      withProperty(supabase.from('meeting_invitations').select('*') as any, propertyId)
        .eq('meeting_id', councilMeetingId)
        .eq('notice_type', 'voting_notice'),
      withProperty(supabase.from('property_members').select('user_id, role, status') as any, propertyId)
        .in('user_id', userIds)
        .eq('status', 'active'),
    ]);

    if (profErr) {
      return { recipients: [], error: profErr };
    }

    const roleByUser = new Map<string, string>();
    for (const m of (membRes.data ?? []) as { user_id: string; role: string; status: string }[]) {
      roleByUser.set(m.user_id, m.role);
    }

    const invByUser = new Map<string, MeetingInvitationRow>();
    if (!invRes.error && invRes.data) {
      for (const inv of invRes.data as MeetingInvitationRow[]) {
        invByUser.set(inv.recipient_user_id, inv);
      }
    }

    const recipients: MeetingInviteRecipientRow[] = userIds.map((userId) => {
      const prof = profileById[userId];
      const invitation = invByUser.get(userId) ?? null;
      return {
        user_id: userId,
        unit_no: unitByUser.get(userId) ?? null,
        email: prof?.email ?? invitation?.email ?? null,
        full_name_en: prof?.full_name_en ?? null,
        full_name_zh: prof?.full_name_zh ?? null,
        role: roleByUser.get(userId) ?? 'owner',
        member_status: 'active',
        invitation,
        delivery_status: invitation?.delivery_status ?? null,
        opened_at: invitation?.opened_at ?? null,
        voted_at: invitation?.voted_at ?? null,
      };
    });

    recipients.sort((a, b) =>
      String(a.unit_no ?? '').localeCompare(String(b.unit_no ?? ''), undefined, { numeric: true }),
    );

    return { recipients, error: null };
  } catch (e) {
    return {
      recipients: [],
      error: e instanceof Error ? e : new Error('Failed to load voting notice recipients'),
    };
  }
}

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

    let inviteRecipients: MeetingInviteRecipientRow[] = [];
    let invitations: MeetingInvitationRow[] = [];
    const inviteRecipRes = await fetchMeetingInviteRecipients(meetingId, propertyId);
    if (!inviteRecipRes.error) {
      inviteRecipients = inviteRecipRes.recipients;
      invitations = inviteRecipients
        .map((r) => r.invitation)
        .filter((x): x is MeetingInvitationRow => x != null);
    }

    let resolutions: MeetingResolutionRow[] = [];
    const resRes = await withProperty(
      supabase.from('meeting_resolutions').select(RESOLUTION_DETAIL_COLUMNS) as any,
      propertyId,
    ).eq('meeting_id', meetingId);
    if (!resRes.error && resRes.data) {
      resolutions = (resRes.data as MeetingResolutionApiRow[]).map(normalizeMeetingResolutionRow);
    }

    return {
      agendaItems,
      votes,
      ballotsByVoteId,
      myBallotsByVoteId,
      invitations,
      inviteRecipients,
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

  const inviteRecipRes = await fetchMeetingInviteRecipients(meetingId, propertyId);
  const inviteRecipients: MeetingInviteRecipientRow[] = inviteRecipRes.error ? [] : inviteRecipRes.recipients;
  const invitations: MeetingInvitationRow[] = inviteRecipients
    .map((r) => r.invitation)
    .filter((x): x is MeetingInvitationRow => x != null);

  const resRes = await withProperty(
    supabase.from('meeting_resolutions').select(RESOLUTION_DETAIL_COLUMNS) as any,
    propertyId,
  ).eq('meeting_id', meetingId);
  const resolutionsError = resRes.error;
  const resolutions: MeetingResolutionRow[] =
    !resolutionsError && resRes.data
      ? (resRes.data as MeetingResolutionApiRow[]).map(normalizeMeetingResolutionRow)
      : [];

  return {
    meeting: m,
    agendaItems,
    votes,
    ballotsByVoteId,
    myBallotsByVoteId,
    invitations,
    inviteRecipients,
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
  openingStatementEn?: string | null;
  openingStatementZh?: string | null;
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
      opening_statement_en: input.openingStatementEn ?? null,
      opening_statement_zh: input.openingStatementZh ?? null,
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
    opening_statement_en: string | null;
    opening_statement_zh: string | null;
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

/** Staff / platform: delete draft meeting before scheduled_at when RPC gates pass (no vote ballots). */
export async function deleteDraftMeetingBeforeStart(
  meetingId: string,
): Promise<{ ok: boolean; code?: string; error: Error | null }> {
  const { data, error } = await supabase.rpc('delete_draft_meeting_before_start', {
    p_meeting_id: meetingId,
  });
  if (error) {
    return { ok: false, code: error.message, error: new Error(error.message) };
  }
  const body = data as { ok?: boolean; code?: string } | null;
  if (!body?.ok) {
    return {
      ok: false,
      code: typeof body?.code === 'string' ? body.code : 'unknown',
      error: null,
    };
  }
  return { ok: true, error: null };
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

export async function updateMeetingAgendaItem(input: {
  propertyId: string;
  meetingId: string;
  agendaItemId: string;
  titleEn?: string | null;
  titleZh?: string | null;
  descriptionEn?: string | null;
  descriptionZh?: string | null;
  requiresVote: boolean;
  voteRule?: VoteRule | null;
}) {
  const { data, error } = await withProperty(
    supabase
      .from('meeting_agenda_items')
      .update({
        title_en: input.titleEn ?? null,
        title_zh: input.titleZh ?? null,
        description_en: input.descriptionEn ?? null,
        description_zh: input.descriptionZh ?? null,
        requires_vote: input.requiresVote,
        vote_rule: input.voteRule ?? null,
      } as Record<string, unknown>) as any,
    input.propertyId,
  )
    .eq('id', input.agendaItemId)
    .eq('meeting_id', input.meetingId)
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
export type SendMeetingInvitationsMode = 'missing_only' | 'all_current_eligible';

export type MeetingNoticeType = 'meeting_notice' | 'voting_notice';

export type SendMeetingInvitationsOptions = {
  mode?: SendMeetingInvitationsMode;
  noticeType?: MeetingNoticeType;
  /** Required when noticeType = voting_notice */
  ownerVoteMeetingId?: string;
};

export async function sendMeetingInvitations(
  meetingId: string,
  propertyId: string,
  locale: 'en' | 'zh' = 'zh',
  options: SendMeetingInvitationsOptions = {},
): Promise<SendMeetingInvitesResult> {
  const mode: SendMeetingInvitationsMode = options.mode ?? 'missing_only';
  const noticeType: MeetingNoticeType = options.noticeType ?? 'meeting_notice';
  console.log('🚨 BUILD VERSION', import.meta.env.VITE_BUILD_TIME || 'dev');
  console.log('🚨 sendMeetingInvitations CALLED', { meetingId, propertyId, locale, mode, noticeType });

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

    let inviteRecipients: MeetingInviteRecipientRow[] = [];

    if (noticeType === 'voting_notice') {
      const ovId = options.ownerVoteMeetingId?.trim();
      if (!ovId) {
        return empty(new Error('ownerVoteMeetingId is required for voting notices'));
      }

      const { data: ovRow, error: ovErr } = await supabase
        .from('owner_vote_meetings')
        .select('id, status, snapshot_frozen_at')
        .eq('id', ovId)
        .eq('property_id', propertyId)
        .maybeSingle();

      if (ovErr) {
        return empty(new Error(ovErr.message ?? 'Failed to load owner vote meeting'));
      }
      if (!ovRow) {
        return empty(new Error('Owner vote meeting not found'));
      }
      if (!String(ovRow.snapshot_frozen_at ?? '').trim()) {
        return empty(new Error('Voter roll is not frozen yet'));
      }
      if (String(ovRow.status ?? '').trim().toLowerCase() !== 'open') {
        return empty(new Error('Owner vote meeting is not open'));
      }

      const snapRes = await fetchVotingNoticeRecipients(meetingId, propertyId, ovId);
      if (snapRes.error) {
        return empty(snapRes.error);
      }
      inviteRecipients = snapRes.recipients;
      if (inviteRecipients.length === 0) {
        return empty(new Error('No eligible voters in frozen snapshot'));
      }
    } else {
      const recipRes = await fetchMeetingInviteRecipients(meetingId, propertyId);
      if (recipRes.error) {
        console.warn('🚨 early return reason:', 'fetchMeetingInviteRecipients failed', recipRes.error);
        return empty(recipRes.error);
      }
      inviteRecipients = recipRes.recipients;
      if (inviteRecipients.length === 0) {
        console.warn('🚨 early return reason:', 'no eligible invite recipients');
        return empty(null);
      }
    }

    const effectiveMode = noticeType === 'voting_notice' ? 'all_current_eligible' : mode;

    const toSend =
      effectiveMode === 'all_current_eligible'
        ? inviteRecipients
        : inviteRecipients.filter((r) => {
            if (!r.invitation) return true;
            const ds = r.invitation.delivery_status;
            return ds === 'pending' || ds === 'failed';
          });

    const userIds = toSend.map((r) => r.user_id);

    console.log(
      '[sendMeetingInvitations] recipients to send',
      userIds.length,
      'of',
      inviteRecipients.length,
      'mode',
      effectiveMode,
      'noticeType',
      noticeType,
    );

    if (userIds.length === 0) {
      console.warn('🚨 early return reason:', 'no recipients to send for mode', effectiveMode);
      return empty(null);
    }

    const { emailByUser, error: profErr } = await loadInviteEmailsByUserId(userIds);
    if (profErr) {
      console.warn('🚨 early return reason:', 'profiles query failed', profErr);
      return empty(profErr);
    }

    const pendingRows = userIds.map((userId) => {
      const base = {
        meeting_id: meetingId,
        property_id: propertyId,
        recipient_user_id: userId,
        email: emailByUser[userId] ?? null,
        delivery_channel: 'email' as const,
        delivery_status: 'pending' as const,
        sent_at: null as string | null,
        notice_type: noticeType,
      };
      if (effectiveMode === 'all_current_eligible') {
        return {
          ...base,
          opened_at: null as string | null,
          voted_at: null as string | null,
          vote: null as 'approve' | 'reject' | 'abstain' | null,
        };
      }
      return base;
    });

    const { error: pendingErr } = await withProperty(
      supabase.from('meeting_invitations').upsert(pendingRows, {
        onConflict: 'meeting_id,recipient_user_id,notice_type',
      }) as any,
      propertyId,
    );

    if (pendingErr) {
      console.warn('🚨 early return reason:', 'meeting_invitations upsert failed', pendingErr);
      return empty(
        new Error((pendingErr as { message?: string }).message ?? 'Failed to save pending invitations'),
      );
    }

    return dispatchMeetingInviteEmails({
      meetingId,
      propertyId,
      userIds,
      emailByUser,
      locale,
      noticeType,
    });
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

export async function resetFailedInvitations(
  meetingId: string,
  propertyId: string,
  noticeType: MeetingNoticeType = 'meeting_notice',
) {
  return await withProperty(
    supabase.from('meeting_invitations').update({ delivery_status: 'pending', sent_at: null, property_id: propertyId }) as any,
    propertyId,
  )
    .eq('meeting_id', meetingId)
    .eq('notice_type', noticeType)
    .eq('delivery_status', 'failed');
}

/** Aggregates counts for rows loaded from `meeting_invitations` (legacy). */
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

export type InvitationRecipientSummary = {
  total: number;
  sent: number;
  opened: number;
  voted: number;
  failed: number;
  pending: number;
  notSent: number;
  openedCount: number;
};

/** Aggregates invite tracking for current eligible recipients (preferred for meeting detail UI). */
export function invitationRecipientSummary(
  recipients: MeetingInviteRecipientRow[],
): InvitationRecipientSummary {
  let sent = 0;
  let opened = 0;
  let voted = 0;
  let failed = 0;
  let pending = 0;
  let notSent = 0;
  let openedCount = 0;

  for (const r of recipients) {
    const inv = r.invitation;
    const ds = r.delivery_status ?? inv?.delivery_status ?? null;

    if (!inv) {
      notSent += 1;
      continue;
    }

    if (ds === 'failed') failed += 1;
    if (ds === 'pending') pending += 1;
    if (ds && INVITE_SENT_DELIVERY_STATUSES.has(ds)) sent += 1;
    if (ds === 'voted' || inv.vote) voted += 1;

    const openedAt = r.opened_at ?? inv.opened_at;
    if (openedAt) {
      opened += 1;
      openedCount += 1;
    } else if (ds === 'voted' || inv.vote) {
      openedCount += 1;
    }
  }

  return {
    total: recipients.length,
    sent,
    opened,
    voted,
    failed,
    pending,
    notSent,
    openedCount,
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
  patch: Partial<{
    status: VoteStatus;
    opens_at: string | null;
    closes_at: string | null;
    title_en: string | null;
    title_zh: string | null;
    description_en: string | null;
    description_zh: string | null;
    vote_rule: VoteRule;
  }>,
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
 * Ensures one `owner_vote_resolutions` row per (meeting_id, title, threshold).
 * If a row already exists, returns its `id` without inserting (no backfill / no updates).
 */
export async function ensureOwnerVoteResolutionForMeeting(params: {
  meetingId: string;
  title: string;
  threshold: string;
  description: string | null;
  display_order: number | null;
}): Promise<{ id: string | null; reused: boolean; error: Error | null }> {
  const { meetingId, title, threshold, description, display_order } = params;
  const th = String(threshold ?? '').trim();

  const { data: existingRows, error: selErr } = await supabase
    .from('owner_vote_resolutions')
    .select('id')
    .eq('meeting_id', meetingId)
    .eq('title', title)
    .eq('threshold', th)
    .order('id', { ascending: true })
    .limit(1);

  if (selErr) {
    return { id: null, reused: false, error: new Error(selErr.message) };
  }

  const hit = (existingRows ?? [])[0] as { id?: unknown } | undefined;
  const existingId = hit?.id != null ? String(hit.id) : '';
  if (existingId) {
    return { id: existingId, reused: true, error: null };
  }

  const { data: inserted, error: insErr } = await supabase
    .from('owner_vote_resolutions')
    .insert({
      meeting_id: meetingId,
      title,
      description,
      threshold: th,
      display_order,
    })
    .select('id')
    .maybeSingle();

  if (insErr) {
    return { id: null, reused: false, error: new Error(insErr.message) };
  }

  const nid = inserted && typeof inserted === 'object' && 'id' in inserted ? String((inserted as { id: string }).id) : '';
  if (!nid) {
    return { id: null, reused: false, error: new Error('owner_vote_resolutions insert returned no id') };
  }
  return { id: nid, reused: false, error: null };
}

/**
 * Ensures an `owner_vote_meetings` row exists for the current AGM/SGM council meeting,
 * keyed by hidden `<!--clearstrata-council-meeting-binding-->` marker when possible (stable across devices).
 */
export async function ensureOwnerVoteMeetingForCouncilMeeting(params: {
  propertyId: string;
  meeting: MeetingRow;
  userId: string;
  /** Optional visible body merged before the binding marker (e.g. council-section agenda excerpt). */
  descriptionBase?: string | null;
}): Promise<{ id: string | null; error: Error | null }> {
  const { propertyId, meeting, userId, descriptionBase } = params;

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

  const councilId = meeting.id.trim();

  try {
    const { row: existing, error: resErr } = await resolveOwnerVoteMeetingDbRowForCouncil(propertyId, meeting);
    if (resErr) return { id: null, error: resErr };

    if (existing) {
      if (!ownerVoteMeetingBindsCouncil(existing.description ?? '', councilId)) {
        const embedded = embedCouncilMeetingBinding(existing.description ?? null, councilId);
        const { error: upErr } = await supabase
          .from('owner_vote_meetings')
          .update({ description: embedded, updated_at: new Date().toISOString() } as Record<string, unknown>)
          .eq('id', existing.id)
          .eq('property_id', propertyId);
        if (upErr) return { id: null, error: new Error(upErr.message) };
      }
      return { id: existing.id, error: null };
    }

    const scheduledIso = meeting.scheduled_at?.trim()
      ? new Date(meeting.scheduled_at).toISOString()
      : null;

    const descZh = meeting.description_zh?.trim();
    const descEn = meeting.description_en?.trim();
    const descriptionParts = [descZh, descEn].filter((x): x is string => Boolean(x));
    const zhEnBody = descriptionParts.length ? descriptionParts.join('\n\n').slice(0, 24000) : null;

    const mergedBaseCandidate =
      typeof descriptionBase === 'string' && descriptionBase.trim().length > 0
        ? descriptionBase.trim().slice(0, 24000)
        : zhEnBody;

    const description = embedCouncilMeetingBinding(mergedBaseCandidate, councilId);

    const { voting_opens_at, voting_closes_at } = deriveOwnerVoteMeetingVotingTimes(meeting);
    const row = {
      property_id: propertyId,
      meeting_type: ownerVoteMeetingTypeForInsert(meeting),
      title,
      description,
      scheduled_at: scheduledIso,
      voting_opens_at,
      voting_closes_at,
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

/** True when editor agenda rows include a council election item (not resolution-only). */
export function editorAgendaRowsHaveElectionAgenda(
  rows: ReadonlyArray<{ kind?: string }>,
): boolean {
  return rows.some((r) => r.kind === 'election');
}

/**
 * After MeetingEditor save: remote-written AGM/SGM with ≥1 election agenda → ensure
 * `owner_vote_meetings` (reuses binding marker; existing row is returned, not duplicated).
 * No-op for in-person meetings or resolution-only agendas.
 */
export async function ensureOwnerVoteMeetingAfterEditorElectionSave(params: {
  propertyId: string;
  userId: string;
  meeting: MeetingRow;
  remoteWritten: boolean;
  hasElectionAgenda: boolean;
}): Promise<{ id: string | null; error: Error | null }> {
  const { propertyId, userId, meeting, remoteWritten, hasElectionAgenda } = params;
  if (!remoteWritten || !hasElectionAgenda) {
    return { id: null, error: null };
  }
  if (!isOwnerVotingMeeting(meeting)) {
    return { id: null, error: null };
  }
  return ensureOwnerVoteMeetingForCouncilMeeting({ propertyId, meeting, userId });
}

/** Slim row for council meeting ↔ owner_vote_meetings binding (no auto-create). */
export type OwnerVoteMeetingLite = {
  id: string;
  status: string;
  voting_opens_at: string | null;
  voting_closes_at: string | null;
  snapshot_freeze_at?: string | null;
  snapshot_frozen_at: string | null;
  scheduled_at?: string | null;
  meeting_type?: string | null;
  created_at: string;
};

/** Alias for owner-vote meeting rows loaded from `owner_vote_meetings`. */
export type OwnerVoteMeeting = OwnerVoteMeetingLite;

/** DB row subset including `description` for council-binding resolution (stripped before returning lite). */
type OwnerVoteMeetingRowDb = OwnerVoteMeetingLite & { description?: string | null };

function ovDbRowToLite(r: OwnerVoteMeetingRowDb): OwnerVoteMeetingLite {
  return {
    id: r.id,
    status: r.status,
    voting_opens_at: r.voting_opens_at,
    voting_closes_at: r.voting_closes_at,
    snapshot_freeze_at: r.snapshot_freeze_at ?? null,
    snapshot_frozen_at: r.snapshot_frozen_at,
    scheduled_at: r.scheduled_at,
    meeting_type: r.meeting_type,
    created_at: r.created_at,
  };
}

function rowEligibleForCouncilTitleFallback(description: string | null | undefined, councilMeetingId: string): boolean {
  const m = extractCouncilMeetingBinding(description ?? '').meta;
  if (!m?.council_meeting_id?.trim()) return true;
  return m.council_meeting_id.trim() === councilMeetingId.trim();
}

function pickNewestOvDbByCreatedAt(rows: OwnerVoteMeetingRowDb[]): OwnerVoteMeetingRowDb | null {
  if (!rows.length) return null;
  return [...rows].sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))[0] ?? null;
}

function parseCouncilScheduledMs(iso: string | null | undefined): number | null {
  if (!iso?.trim()) return null;
  const t = Date.parse(iso.trim());
  return Number.isNaN(t) ? null : t;
}

async function fetchOwnerVoteMeetingCandidatesByTitle(
  propertyId: string,
  titleTrim: string,
): Promise<{ rows: OwnerVoteMeetingRowDb[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('owner_vote_meetings')
    .select(
      'id,status,voting_opens_at,voting_closes_at,snapshot_freeze_at,snapshot_frozen_at,created_at,scheduled_at,meeting_type,description',
    )
    .eq('property_id', propertyId)
    .eq('title', titleTrim)
    .order('created_at', { ascending: false })
    .limit(80);
  return {
    rows: ((data ?? []) as OwnerVoteMeetingRowDb[]) ?? [],
    error: error ? new Error(error.message) : null,
  };
}

async function fetchOwnerVoteMeetingsByBindingMarkerSubstring(propertyId: string): Promise<{
  rows: OwnerVoteMeetingRowDb[];
  error: Error | null;
}> {
  const needle = `%${councilMeetingBindingMarkerSubstring()}%`;
  const { data, error } = await supabase
    .from('owner_vote_meetings')
    .select(
      'id,status,voting_opens_at,voting_closes_at,snapshot_freeze_at,snapshot_frozen_at,created_at,scheduled_at,meeting_type,description',
    )
    .eq('property_id', propertyId)
    .ilike('description', needle);
  return {
    rows: ((data ?? []) as OwnerVoteMeetingRowDb[]) ?? [],
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Resolves `owner_vote_meetings` for a council AGM/SGM row: marker match wins; else title proximity.
 */
async function resolveOwnerVoteMeetingDbRowForCouncil(
  propertyId: string,
  meeting: MeetingRow,
): Promise<{ row: OwnerVoteMeetingRowDb | null; error: Error | null }> {
  const councilId = meeting.id.trim();

  const { rows: markedRows, error: mkErr } = await fetchOwnerVoteMeetingsByBindingMarkerSubstring(propertyId);
  if (mkErr) return { row: null, error: mkErr };

  console.log('[OVResolve] markerRows', {
    propertyId,
    councilId,
    count: markedRows.length,
    rows: markedRows.map((r) => ({
      id: r.id,
      parsed: extractCouncilMeetingBinding(r.description ?? '').meta,
    })),
  });

  const boundToCouncil = markedRows.filter((r) => ownerVoteMeetingBindsCouncil(r.description ?? '', councilId));
  const markerPick = pickNewestOvDbByCreatedAt(boundToCouncil);

  console.log('[OVResolve] boundToCouncil', {
    councilId,
    count: boundToCouncil.length,
    picked: markerPick?.id,
  });

  if (markerPick) return { row: markerPick, error: null };

  const title = councilMeetingTitleForOwnerVoteBinding(meeting).trim();
  if (!title) return { row: null, error: null };

  const { rows: titleRows, error: titleErr } = await fetchOwnerVoteMeetingCandidatesByTitle(propertyId, title);
  if (titleErr) return { row: null, error: titleErr };

  const filtered = titleRows.filter((r) => rowEligibleForCouncilTitleFallback(r.description ?? '', councilId));
  if (filtered.length === 0) return { row: null, error: null };

  const lites = filtered.map((r) => ovDbRowToLite(r));
  const pickedLite = pickBestOwnerVoteMeetingLiteForCouncil(lites, meeting.scheduled_at);
  if (!pickedLite) return { row: null, error: null };

  const full = filtered.find((r) => r.id === pickedLite.id) ?? null;
  return { row: full, error: null };
}

/**
 * Picks one `owner_vote_meetings` row when multiple share the same title (avoids tying to unrelated past meetings).
 * Prefers scheduled_at nearest to the council meeting’s scheduled_at, then newer created_at.
 */
export function pickBestOwnerVoteMeetingLiteForCouncil(
  rows: OwnerVoteMeetingLite[],
  councilMeetingScheduledAt: string | null | undefined,
): OwnerVoteMeetingLite | null {
  if (rows.length === 0) return null;
  if (rows.length === 1) return rows[0] ?? null;
  const target = parseCouncilScheduledMs(councilMeetingScheduledAt ?? null);
  const scored = rows.map((r) => {
    const rs = parseCouncilScheduledMs(r.scheduled_at ?? null);
    const dist =
      target != null && rs != null ? Math.abs(rs - target) : target != null && rs == null ? Number.MAX_SAFE_INTEGER - 5000 : 0;
    const ct = parseCouncilScheduledMs(r.created_at) ?? 0;
    return { r, dist, ct };
  });
  scored.sort((a, b) => {
    if (a.dist !== b.dist) return a.dist - b.dist;
    return b.ct - a.ct;
  });
  return scored[0]?.r ?? null;
}

/** Staff “open voting” precondition (no DB schema change); used by Meeting Detail + council voting section UIs. */
export type OwnerVoteOpenGateReason =
  | 'no_snapshot'
  | 'no_eligible'
  | 'no_agenda'
  | 'too_early'
  | 'past_close'
  | 'election_timeline_invalid';

export function evaluateOwnerVoteOpenGate(params: {
  ov: OwnerVoteMeetingLite | null | undefined;
  eligibleCount: number;
  resolutionCount: number;
  electionAgendaCount: number;
  nowMs?: number;
  /**
   * When true, council voting window overlaps or precedes nomination close on an election agenda
   * (or broader invalid_election_timeline against council row).
   */
  electionTimelineBlocksVoting?: boolean;
}): { ok: true } | { ok: false; reason: OwnerVoteOpenGateReason } {
  if (params.electionTimelineBlocksVoting) {
    return { ok: false, reason: 'election_timeline_invalid' };
  }
  const nowMs = params.nowMs ?? Date.now();
  const ov = params.ov;
  if (!ov?.id) return { ok: false, reason: 'no_snapshot' };

  if (!String(ov.snapshot_frozen_at ?? '').trim()) {
    return { ok: false, reason: 'no_snapshot' };
  }
  if (!(params.eligibleCount > 0)) {
    return { ok: false, reason: 'no_eligible' };
  }
  if (!(params.resolutionCount > 0 || params.electionAgendaCount > 0)) {
    return { ok: false, reason: 'no_agenda' };
  }

  const openIso = ov.voting_opens_at?.trim();
  if (openIso) {
    const t = Date.parse(openIso);
    if (!Number.isNaN(t) && nowMs < t) return { ok: false, reason: 'too_early' };
  }

  const closeIso = ov.voting_closes_at?.trim();
  if (closeIso) {
    const t = Date.parse(closeIso);
    if (!Number.isNaN(t) && nowMs > t) return { ok: false, reason: 'past_close' };
  }

  return { ok: true };
}

/** Owner navigation to `/owner-voting`: DB `status = open`, valid vote window, frozen snapshot, agenda, and eligible units. */
export type OwnerVoteOwnerNavigationGateReason = OwnerVoteOpenGateReason | 'status_not_open' | 'no_meeting';

export function evaluateOwnerVoteOwnerNavigationGate(params: {
  ov: OwnerVoteMeetingLite | null | undefined;
  eligibleCount: number;
  resolutionCount: number;
  electionAgendaCount: number;
  nowMs?: number;
  electionTimelineBlocksVoting?: boolean;
}): { ok: true } | { ok: false; reason: OwnerVoteOwnerNavigationGateReason } {
  const ov = params.ov;
  if (!ov?.id) return { ok: false, reason: 'no_meeting' };
  if (params.electionTimelineBlocksVoting) return { ok: false, reason: 'election_timeline_invalid' };
  const st = String(ov.status ?? '').trim().toLowerCase();
  if (st !== 'open') return { ok: false, reason: 'status_not_open' };

  const nowMs = params.nowMs ?? Date.now();
  const openIso = ov.voting_opens_at?.trim();
  const closeIso = ov.voting_closes_at?.trim();
  const openMs = openIso ? Date.parse(openIso) : NaN;
  const closeMs = closeIso ? Date.parse(closeIso) : NaN;
  if (!openIso || Number.isNaN(openMs)) return { ok: false, reason: 'too_early' };
  if (!closeIso || Number.isNaN(closeMs)) return { ok: false, reason: 'past_close' };
  if (nowMs < openMs) return { ok: false, reason: 'too_early' };
  if (nowMs > closeMs) return { ok: false, reason: 'past_close' };

  return evaluateOwnerVoteOpenGate({
    ov: params.ov,
    eligibleCount: params.eligibleCount,
    resolutionCount: params.resolutionCount,
    electionAgendaCount: params.electionAgendaCount,
    nowMs,
    electionTimelineBlocksVoting: params.electionTimelineBlocksVoting,
  });
}

export function translationKeyForOwnerVoteOpenGate(
  reason: OwnerVoteOpenGateReason,
):
  | 'meeting_ov_open_block_freeze_snap'
  | 'meeting_ov_open_block_no_eligible'
  | 'meeting_ov_open_block_no_agenda'
  | 'meeting_ov_open_block_too_early'
  | 'meeting_ov_open_block_past_close'
  | 'meeting_election_time_overlap_admin_warn' {
  switch (reason) {
    case 'election_timeline_invalid':
      return 'meeting_election_time_overlap_admin_warn';
    case 'no_snapshot':
      return 'meeting_ov_open_block_freeze_snap';
    case 'no_eligible':
      return 'meeting_ov_open_block_no_eligible';
    case 'no_agenda':
      return 'meeting_ov_open_block_no_agenda';
    case 'too_early':
      return 'meeting_ov_open_block_too_early';
    case 'past_close':
      return 'meeting_ov_open_block_past_close';
  }
}

export function translationKeyForOwnerVoteOwnerNavigationGate(
  reason: OwnerVoteOwnerNavigationGateReason,
):
  | ReturnType<typeof translationKeyForOwnerVoteOpenGate>
  | 'meeting_owner_vote_nav_status_not_open'
  | 'meeting_owner_vote_nav_no_meeting' {
  if (reason === 'status_not_open') return 'meeting_owner_vote_nav_status_not_open';
  if (reason === 'no_meeting') return 'meeting_owner_vote_nav_no_meeting';
  if (reason === 'election_timeline_invalid') return 'meeting_election_time_overlap_admin_warn';
  return translationKeyForOwnerVoteOpenGate(reason);
}

type PropertyMemberEligibleRow = { unit_no: unknown; role: unknown };

/** Active owner/council units eligible before snapshot freeze (matches freeze RPC unit dedupe). */
export function countOwnerVoteEligibleNowFromPropertyMembers(rows: PropertyMemberEligibleRow[]): number {
  const byUnit = new Map<string, number>();
  for (const r of rows) {
    const unit = String(r.unit_no ?? '').trim();
    if (!unit) continue;
    const role = String(r.role ?? '')
      .trim()
      .toLowerCase();
    if (role !== 'owner' && role !== 'council') continue;
    const rank = role === 'council' ? 1 : 2;
    const key = unit.toLowerCase();
    const prev = byUnit.get(key);
    if (prev == null || rank < prev) byUnit.set(key, rank);
  }
  return byUnit.size;
}

export async function fetchOwnerVoteEligibleNowCount(
  propertyId: string,
): Promise<{ count: number; error: Error | null }> {
  const { data, error } = await supabase
    .from('property_members')
    .select('unit_no, role')
    .eq('property_id', propertyId)
    .eq('status', 'active');

  if (error) return { count: 0, error: new Error(error.message) };

  return {
    count: countOwnerVoteEligibleNowFromPropertyMembers((data ?? []) as PropertyMemberEligibleRow[]),
    error: null,
  };
}

/** UI: frozen snapshot count when frozen; live property_members count otherwise. */
export function resolveOwnerVoteDisplayEligible(params: {
  snapshotFrozenAt: string | null | undefined;
  eligibleCount: number;
  eligibleNowCount: number;
}): number {
  return String(params.snapshotFrozenAt ?? '').trim() ? params.eligibleCount : params.eligibleNowCount;
}

/**
 * Loads `owner_vote_meetings` for this council AGM/SGM: binding marker beats title heuristic.
 */
export async function fetchOwnerVoteMeetingMetaForCouncilMeeting(params: {
  propertyId: string;
  meeting: MeetingRow;
}): Promise<{
  meeting: OwnerVoteMeetingLite | null;
  resolutions: Array<{ id: string; title: string; threshold: string; display_order: number | null }>;
  resolutionCount: number;
  eligibleCount: number;
  eligibleNowCount: number;
  error: Error | null;
}> {
  const { propertyId, meeting } = params;

  const { count: eligibleNowCount, error: eligibleNowErr } = await fetchOwnerVoteEligibleNowCount(propertyId);
  if (eligibleNowErr) {
    console.error('[fetchOwnerVoteMeetingMetaForCouncilMeeting] eligibleNow', eligibleNowErr);
  }

  if (!isOwnerVotingMeeting(meeting)) {
    return {
      meeting: null,
      resolutions: [],
      resolutionCount: 0,
      eligibleCount: 0,
      eligibleNowCount,
      error: null,
    };
  }

  const { row: resolvedDb, error: resErr } = await resolveOwnerVoteMeetingDbRowForCouncil(propertyId, meeting);
  if (resErr) {
    return {
      meeting: null,
      resolutions: [],
      resolutionCount: 0,
      eligibleCount: 0,
      eligibleNowCount,
      error: resErr,
    };
  }

  const picked = resolvedDb ? ovDbRowToLite(resolvedDb) : null;
  if (!picked) {
    return {
      meeting: null,
      resolutions: [],
      resolutionCount: 0,
      eligibleCount: 0,
      eligibleNowCount,
      error: null,
    };
  }

  const mid = String(picked.id);

  const resQ = await supabase
    .from('owner_vote_resolutions')
    .select('id,title,threshold,display_order')
    .eq('meeting_id', mid)
    .order('display_order', { ascending: true });

  const resolutionsRaw = (resQ.data ?? []) as {
    id: string;
    title: unknown;
    threshold: unknown;
    display_order: unknown;
  }[];
  const resolutions = resolutionsRaw.map((r) => ({
    id: String(r.id),
    title: typeof r.title === 'string' ? r.title : '',
    threshold: typeof r.threshold === 'string' ? r.threshold : String(r.threshold ?? ''),
    display_order:
      typeof r.display_order === 'number'
        ? r.display_order
        : r.display_order != null && String(r.display_order).trim() !== '' && Number.isFinite(Number(r.display_order))
          ? Number(r.display_order)
          : null,
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

  console.log('[OVMetaFetch] result', {
    pickedId: picked?.id,
    resolutionCount,
    eligibleCount,
    eligibleNowCount,
  });

  return {
    meeting: picked,
    resolutions,
    resolutionCount,
    eligibleCount,
    eligibleNowCount,
    error: countErr ? new Error(countErr.message) : null,
  };
}

/** Council/admin/property_admin: set planned voter-roll freeze time (before snapshot is frozen). */
export async function setOwnerVoteSnapshotFreezeAt(params: {
  ownerVoteMeetingId: string;
  snapshotFreezeAtIso: string;
}): Promise<{ snapshotFreezeAt: string | null; error: Error | null }> {
  const { ownerVoteMeetingId, snapshotFreezeAtIso } = params;
  const { data, error } = await supabase.rpc('set_owner_vote_snapshot_freeze_at', {
    p_meeting_id: ownerVoteMeetingId,
    p_snapshot_freeze_at: snapshotFreezeAtIso,
  });
  if (error) return { snapshotFreezeAt: null, error: new Error(error.message) };
  const d = data as { ok?: boolean; snapshot_freeze_at?: string } | null;
  const at =
    typeof d?.snapshot_freeze_at === 'string' && d.snapshot_freeze_at.trim()
      ? d.snapshot_freeze_at
      : snapshotFreezeAtIso;
  return { snapshotFreezeAt: at, error: null };
}

export type SyncOwnerVoteMeetingWindowResult = {
  ok: boolean;
  updated: boolean;
  reason?: string;
  ownerVoteMeetingId?: string | null;
  error: Error | null;
};

function resolveOwnerVoteSnapshotFreezeAt(params: {
  votingClosesAt: string;
  requestedIso?: string | null;
  existingIso?: string | null;
  hadUserSnapshotFreeze: boolean;
}): string {
  const defaultIso = addDaysIso(params.votingClosesAt, -7);
  const closeMs = Date.parse(params.votingClosesAt);

  let candidate = defaultIso;
  if (params.requestedIso?.trim()) {
    const t = Date.parse(params.requestedIso.trim());
    if (!Number.isNaN(t)) candidate = new Date(t).toISOString();
  } else if (params.hadUserSnapshotFreeze && params.existingIso?.trim()) {
    const t = Date.parse(params.existingIso.trim());
    if (!Number.isNaN(t)) candidate = new Date(t).toISOString();
  }

  const candMs = Date.parse(candidate);
  if (Number.isNaN(closeMs) || Number.isNaN(candMs) || candMs >= closeMs) {
    return defaultIso;
  }
  return candidate;
}

/**
 * After council AGM/SGM save: sync bound `owner_vote_meetings` voting window + planned freeze time.
 * Skips when snapshot is already frozen.
 */
export async function syncOwnerVoteMeetingWindowForCouncilMeeting(params: {
  propertyId: string;
  meeting: MeetingRow;
  votingOpensAt: string;
  votingClosesAt: string;
  snapshotFreezeAt?: string | null;
  hadUserSnapshotFreeze?: boolean;
}): Promise<SyncOwnerVoteMeetingWindowResult> {
  const {
    propertyId,
    meeting,
    votingOpensAt,
    votingClosesAt,
    snapshotFreezeAt,
    hadUserSnapshotFreeze = false,
  } = params;

  if (!isOwnerVotingMeeting(meeting)) {
    return {
      ok: true,
      updated: false,
      reason: 'not_owner_vote_meeting',
      ownerVoteMeetingId: null,
      error: null,
    };
  }

  const { row, error: resErr } = await resolveOwnerVoteMeetingDbRowForCouncil(propertyId, meeting);
  if (resErr) {
    return { ok: false, updated: false, error: resErr };
  }
  if (!row) {
    return {
      ok: true,
      updated: false,
      reason: 'no_owner_vote_meeting',
      ownerVoteMeetingId: null,
      error: null,
    };
  }

  if (String(row.snapshot_frozen_at ?? '').trim()) {
    return {
      ok: true,
      updated: false,
      reason: 'skipped_frozen',
      ownerVoteMeetingId: row.id,
      error: null,
    };
  }

  const resolvedFreezeAt = resolveOwnerVoteSnapshotFreezeAt({
    votingClosesAt: votingClosesAt,
    requestedIso: snapshotFreezeAt,
    existingIso: row.snapshot_freeze_at,
    hadUserSnapshotFreeze,
  });

  const scheduledIso = meeting.scheduled_at?.trim()
    ? new Date(meeting.scheduled_at).toISOString()
    : null;

  const { error: upErr } = await withProperty(
    supabase
      .from('owner_vote_meetings')
      .update({
        voting_opens_at: votingOpensAt,
        voting_closes_at: votingClosesAt,
        snapshot_freeze_at: resolvedFreezeAt,
        scheduled_at: scheduledIso,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('id', row.id) as any,
    propertyId,
  );

  if (upErr) {
    return {
      ok: false,
      updated: false,
      ownerVoteMeetingId: row.id,
      error: new Error((upErr as { message?: string }).message ?? 'Failed to sync owner vote window'),
    };
  }

  return {
    ok: true,
    updated: true,
    ownerVoteMeetingId: row.id,
    error: null,
  };
}

/** Council meeting row → owner_vote voting window (V3 / written-remote / row fields). */
export function councilMeetingOwnerVoteVotingWindow(meeting: MeetingRow): {
  votingOpensAt: string;
  votingClosesAt: string;
} {
  return deriveOwnerVoteMeetingVotingTimes(meeting);
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
  const yes_count = pickNumOvResult(raw, [
    'yes_count',
    'yesCount',
    'yes_votes',
    'votes_yes',
    'for_count',
    'approve_count',
    'approve',
    'yes',
  ]);
  const no_count = pickNumOvResult(raw, ['no_count', 'noCount', 'votes_no', 'against_count', 'reject_count', 'no']);
  const abstain_count = pickNumOvResult(raw, ['abstain_count', 'abstainCount', 'votes_abstain', 'abstain']);
  const total_cast = pickNumOvResult(raw, ['total_cast', 'totalCast', 'votes_cast', 'cast_count']);
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

async function aggregatesFromOwnerVoteBallots(
  propertyId: string,
  ownerVoteMeetingId: string,
): Promise<{ byResolution: Map<string, { yes: number; no: number; abstain: number }>; error: Error | null }> {
  const m = new Map<string, { yes: number; no: number; abstain: number }>();
  const { data, error } = await supabase
    .from('owner_vote_ballots')
    .select('resolution_id,choice')
    .eq('property_id', propertyId)
    .eq('meeting_id', ownerVoteMeetingId);
  if (error) return { byResolution: m, error: new Error(error.message) };
  for (const raw of (data ?? []) as { resolution_id?: string; choice?: string }[]) {
    const rid = String(raw.resolution_id ?? '').trim();
    if (!rid) continue;
    const chRaw = String(raw.choice ?? '').trim().toLowerCase();
    /** Align with optional DB/RPC spellings; only rows in `owner_vote_ballots` (not council `meeting_ballots`). */
    let ch: 'yes' | 'no' | 'abstain' | null = null;
    if (chRaw === 'yes' || chRaw === 'approve' || chRaw === 'for') ch = 'yes';
    else if (chRaw === 'no' || chRaw === 'reject' || chRaw === 'against') ch = 'no';
    else if (chRaw === 'abstain') ch = 'abstain';
    if (!ch) continue;
    const cur = m.get(rid) ?? { yes: 0, no: 0, abstain: 0 };
    if (ch === 'yes') cur.yes += 1;
    else if (ch === 'no') cur.no += 1;
    else if (ch === 'abstain') cur.abstain += 1;
    m.set(rid, cur);
  }
  return { byResolution: m, error: null };
}

function viewCountsAreBlank(r: OwnerVoteResolutionResultNormalized | undefined): boolean {
  if (!r) return true;
  const y = r.yes_count ?? 0;
  const n = r.no_count ?? 0;
  const a = r.abstain_count ?? 0;
  const t = r.total_cast ?? 0;
  return y === 0 && n === 0 && a === 0 && t === 0;
}

/**
 * Reads tallies from `owner_vote_resolution_results`; merges in live counts from `owner_vote_ballots`
 * when the view row is blank (stale projections, mismatched joins, or RLS quirks on the view only).
 *
 * Expects `meeting_id` = `owner_vote_meetings.id` (not council `meetings.id`), and `resolution_id` =
 * `owner_vote_resolutions.id`, matching how `submit_owner_vote` and ballot rows are stored.
 */
export async function fetchOwnerVoteResolutionResultsForOwnerMeeting(params: {
  propertyId: string;
  ownerVoteMeetingId: string;
}): Promise<{ rows: OwnerVoteResolutionResultNormalized[]; error: Error | null }> {
  const { propertyId, ownerVoteMeetingId } = params;
  const [{ data, error }, ballots] = await Promise.all([
    supabase
      .from('owner_vote_resolution_results')
      .select('*')
      .eq('property_id', propertyId)
      .eq('meeting_id', ownerVoteMeetingId),
    aggregatesFromOwnerVoteBallots(propertyId, ownerVoteMeetingId),
  ]);

  let viewErr: Error | null = error ? new Error(error.message) : null;
  if (ballots.error) viewErr ??= ballots.error;

  const viewRows: OwnerVoteResolutionResultNormalized[] = [];
  for (const row of data ?? []) {
    const n = normalizeOwnerVoteResolutionResultRow(row as Record<string, unknown>);
    if (n) viewRows.push(n);
  }

  const merged = new Map<string, OwnerVoteResolutionResultNormalized>();
  for (const r of viewRows) merged.set(r.resolution_id, r);

  for (const [rid, c] of ballots.byResolution) {
    const total = c.yes + c.no + c.abstain;
    if (total === 0) continue;
    const existing = merged.get(rid);
    if (!existing) {
      merged.set(rid, {
        resolution_id: rid,
        title: null,
        threshold: null,
        yes_count: c.yes,
        no_count: c.no,
        abstain_count: c.abstain,
        total_cast: total,
        eligible_count: 0,
        passed: null,
      });
      continue;
    }
    if (viewCountsAreBlank(existing) || existing.total_cast < total) {
      merged.set(rid, {
        ...existing,
        yes_count: c.yes,
        no_count: c.no,
        abstain_count: c.abstain,
        total_cast: total,
      });
    }
  }

  return { rows: [...merged.values()], error: viewErr };
}
