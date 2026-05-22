import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Mail, RefreshCw, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProperty } from '../../contexts/PropertyContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  ballotTallies,
  castBallot,
  createAgendaItem,
  createVote,
  ensureOwnerVoteMeetingForCouncilMeeting,
  ensureOwnerVoteResolutionForMeeting,
  evaluateOwnerVoteOpenGate,
  evaluateOwnerVoteOwnerNavigationGate,
  fetchOwnerVoteMeetingMetaForCouncilMeeting,
  fetchOwnerVoteResolutionResultsForOwnerMeeting,
  fetchMeetingCore,
  translationKeyForOwnerVoteOpenGate,
  translationKeyForOwnerVoteOwnerNavigationGate,
  fetchMeetingExtras,
  invitationSummary,
  mapVoteRuleToOwnerVoteThreshold,
  markMeetingInvitationOpened,
  meetingTitleZhFirst,
  resetFailedInvitations,
  sendMeetingInvitations,
  deleteDraftMeetingBeforeStart,
  updateMeetingAgendaItem,
  updateVote,
  type VoteRule,
  type MeetingAgendaRow,
  type MeetingBallotRow,
  type MeetingDetailBundle,
  type MeetingInvitationRow,
  type MeetingVoteOptionRow,
  type MeetingVoteRow,
  type MeetingRow,
  type OwnerVoteMeetingLite,
  type OwnerVoteResolutionResultNormalized,
} from '../../features/meetings/api';
import {
  councilMeetingTitleForOwnerVoteBinding,
  findOwnerVoteResolutionForAgenda,
  isOwnerVotingMeeting,
} from '../../features/meetings/ownerVotingCouncil';
import { supabase } from '../../lib/supabase';
import { shouldDeferAutoPropertyRedirects } from '../../lib/authRecovery';
import { samePropertyId } from '../../lib/propertyIdMatch';
import { canManagePropertyMeetings } from '@/lib/meetingPermissions';
import { isPlatformAdmin } from '@/lib/permissions';
import {
  labelMeetingFormatUiPrimary,
  labelMeetingType,
  labelStatus,
  labelVoteRule,
  labelVoteStatus,
  meetingUiStrings,
} from '../../features/meetings/labels';
import {
  analyzeCouncilElectionTimeline,
  buildElectionNominationRibbon,
  defaultElectionMeta,
  displayAgendaZhWithoutElection,
  embedElectionAgendaMeta,
  extractElectionAgendaMeta,
  finalizeElectionMeta,
  fromDatetimeLocalValue,
  isStrictAgmOrSgmMeeting,
  toDatetimeLocalValue,
  type ElectionAgendaMetaV1,
} from '@/features/meetings/electionAgendaModel';
import {
  deriveCouncilElectionCanonFromScheduledAt,
  deriveRemoteWrittenV3CanonFromScheduledAt,
} from '@/features/meetings/electionTimelineMath';
import {
  CouncilElectionResultsBlock,
  type OwnerElectionBallotLite,
} from '@/components/meetings/CouncilElectionResultsBlock';
import { MeetingElectionCandidatesPanel } from '@/components/meetings/MeetingElectionCandidatesPanel';
import {
  councilMeetingVotingWindowFallback,
  extractGovernanceMeta,
  isWrittenRemoteV3Meeting,
  writtenRemoteV3AutoParticipationCopy,
  writtenRemoteV3ResolutionVotingCopy,
  meetingSgmRequisitionRequiredUnits,
  MEETING_SGM_REQUISITION_PERCENT_DEFAULT,
  stripWrittenRemoteMeta,
  type MeetingInitiationType,
} from '@/features/meetings/meetingFormatModel';
import { OwnerVotingInlineControlBar } from '@/components/meetings/OwnerVotingInlineControlBar';
import { MeetingVoteArchiveCard } from '@/components/meetings/MeetingVoteArchiveCard';
import {
  fetchMeetingSupportingDocuments,
  type MeetingSupportingDocumentRow,
} from '@/features/meetings/meetingDocumentsRead';
import { MeetingOwnerVoteResolutionResults } from '@/components/meetings/MeetingOwnerVoteResolutionResults';
import { StatusAlert, StatusBadge } from '@/components/status';

function isMeetingClosedForVoting(status: string | null | undefined): boolean {
  const s = String(status ?? '').trim().toLowerCase();
  return s === 'closed' || s === 'ended' || s === 'archived';
}

const REMOTE_WRITTEN_V3_DETAIL_EDIT_LOCKED = {
  en: 'After public notice starts, this remote written meeting is locked and can no longer be edited.',
  zh: '公示开始后，远程书面会议已锁定，不能再修改会议内容。',
} as const;

function remoteWrittenV3MeetingAgendaEditBlocked(meeting: MeetingRow): boolean {
  if (!isWrittenRemoteV3Meeting(meeting)) return false;
  const s = meeting.scheduled_at?.trim();
  if (!s) return false;
  const ms = new Date(s).getTime();
  return !Number.isNaN(ms) && Date.now() >= ms;
}

function remoteWrittenV3AgendaEditErr(en: boolean): string {
  return en ? REMOTE_WRITTEN_V3_DETAIL_EDIT_LOCKED.en : REMOTE_WRITTEN_V3_DETAIL_EDIT_LOCKED.zh;
}

function deleteDraftMeetingErr(code: string | undefined, en: boolean): string {
  switch (code) {
    case 'not_authenticated':
      return en ? 'Please sign in.' : '请先登录。';
    case 'meeting_not_found':
      return en ? 'Meeting not found.' : '未找到会议。';
    case 'not_draft':
      return en ? 'Only draft meetings can be deleted.' : '仅可删除草稿会议。';
    case 'schedule_locked':
      return en
        ? 'Cannot delete: the meeting has already started.'
        : '无法删除：会议已开始。';
    case 'has_votes':
      return en
        ? 'Cannot delete: this meeting already has vote records.'
        : '无法删除：该会议已有投票记录。';
    case 'not_allowed':
      return en ? 'You are not allowed to delete this meeting.' : '无权删除此会议。';
    default:
      return en ? 'Delete failed.' : '删除失败。';
  }
}

function initiationTypeLabel(type: MeetingInitiationType, t: (key: string) => string): string {
  switch (type) {
    case 'council_initiated':
      return t('meeting_initiation_council');
    case 'owner_requisitioned':
      return t('meeting_initiation_owner_requisitioned');
    case 'annual_required':
      return t('meeting_initiation_annual_required');
    default:
      return '—';
  }
}

type AgendaKindUi = 'normal' | 'resolution' | 'election';

function agendaKindFromRow(a: MeetingAgendaRow): AgendaKindUi {
  const meta = extractElectionAgendaMeta(a.description_zh ?? '').meta;
  if (meta?.agenda_type === 'council_election') return 'election';
  return a.requires_vote ? 'resolution' : 'normal';
}

/** DB-backed blank “normal” row with no votes / ballots / linked OV resolution — safe to remove on cancel. */
function isBlankDeletableCouncilAgendaPlaceholder(
  row: MeetingAgendaRow,
  voteByAgendaId: Map<string, MeetingVoteRow & { options: MeetingVoteOptionRow[] }>,
  electionBallotsByAgenda: Map<string, number>,
  ownerVoteResolutions: Array<{ id: string; title: string; display_order?: number | null }>,
): boolean {
  if (agendaKindFromRow(row) !== 'normal') return false;
  if (String(row.title_zh ?? '').trim() || String(row.title_en ?? '').trim()) return false;
  if (voteByAgendaId.has(row.id)) return false;
  if ((electionBallotsByAgenda.get(row.id) ?? 0) > 0) return false;
  const ord = row.sort_order;
  if (ord != null && Number.isFinite(Number(ord))) {
    const n = Number(ord);
    if (
      ownerVoteResolutions.some(
        (r) => r.display_order != null && Number(r.display_order) === n,
      )
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Explicit agenda delete from MeetingDetail: returns `null` when delete is allowed, otherwise a user-facing reason.
 * Reuses the same structural gates as blank-placeholder cancel (election / council vote / election ballots / OV slot),
 * then blocks any linked owner-vote resolution (even without ballots yet).
 */
async function meetingDetailAgendaDeleteBlockReason(params: {
  meeting: MeetingRow;
  row: MeetingAgendaRow;
  voteByAgendaId: Map<string, MeetingVoteRow & { options: MeetingVoteOptionRow[] }>;
  ballotsByVoteId: Record<string, MeetingBallotRow[]>;
  electionBallotsByAgenda: Map<string, number>;
  resolutionsForMatch: Array<{ id: string; title: string; display_order?: number | null }>;
  propertyId: string;
  en: boolean;
}): Promise<string | null> {
  const { meeting, row, voteByAgendaId, ballotsByVoteId, electionBallotsByAgenda, resolutionsForMatch, propertyId, en } =
    params;
  if (isMeetingClosedForVoting(meeting.status)) {
    return en ? 'This meeting has ended. The agenda is locked.' : '会议已结束，议程已锁定。';
  }
  if (remoteWrittenV3MeetingAgendaEditBlocked(meeting)) {
    return remoteWrittenV3AgendaEditErr(en);
  }
  if (agendaKindFromRow(row) === 'election') {
    return en ? 'Election agendas cannot be deleted here.' : '选举议程不能在此删除。';
  }
  if ((electionBallotsByAgenda.get(row.id) ?? 0) > 0) {
    return en
      ? 'This election agenda already has owner ballots and cannot be deleted here.'
      : '该选举议题已有业主投票记录，不能在此删除。';
  }
  const councilVote = voteByAgendaId.get(row.id);
  if (councilVote) {
    const councilBallots = ballotsByVoteId[councilVote.id] ?? [];
    if (councilBallots.length > 0) {
      return en
        ? 'This agenda already has ballots on its council vote and cannot be deleted here.'
        : '该议题的会议表决已有投票记录，不能在此删除。';
    }
    return en
      ? 'This agenda has a linked council vote (meeting_votes) and cannot be deleted here.'
      : '该议题已关联会议表决（meeting_votes），不能在此删除。';
  }
  const matchedRes = findOwnerVoteResolutionForAgenda(
    { sort_order: row.sort_order, title_zh: row.title_zh, title_en: row.title_en },
    resolutionsForMatch,
  );
  if (matchedRes) {
    const { count, error } = await supabase
      .from('owner_vote_ballots')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', propertyId)
      .eq('resolution_id', matchedRes.id);
    if (error) {
      console.warn('[MeetingDetail] owner_vote_ballots count (delete)', error.message);
      return en
        ? 'Could not verify owner-voting ballots. Try again later.'
        : '无法确认业主表决投票记录，请稍后重试。';
    }
    const n = typeof count === 'number' ? count : 0;
    if (n > 0) {
      return en
        ? 'This agenda has formal owner-voting records and cannot be deleted here.'
        : '该议题已有正式表决记录，不能在此删除。';
    }
    return en
      ? 'This agenda is linked to an owner vote resolution. Remove or resolve it in owner voting before deleting the agenda.'
      : '该议题已关联业主表决决议，请先在业主表决中处理后再删除议程。';
  }
  return null;
}

function canonElectionNominationPairOrNull(meeting: MeetingRow): { opens: string; closes: string } | null {
  if (isWrittenRemoteV3Meeting(meeting)) {
    const v3 = deriveRemoteWrittenV3CanonFromScheduledAt(meeting.scheduled_at);
    if (!v3) return null;
    return { opens: v3.nominationOpenIso, closes: v3.nominationCloseIso };
  }
  const canon = deriveCouncilElectionCanonFromScheduledAt(meeting.scheduled_at);
  if (!canon) return null;
  return { opens: canon.nominationOpenIso, closes: canon.nominationCloseIso };
}

function canonNominationFmt(
  meeting: MeetingRow | null | undefined,
  en: boolean,
): { opens: string; closes: string } | null {
  if (!meeting) return null;
  const pair = canonElectionNominationPairOrNull(meeting);
  if (!pair) return null;
  const loc = en ? 'en-CA' : 'zh-CN';
  const opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };
  return {
    opens: new Date(pair.opens).toLocaleString(loc, opts),
    closes: new Date(pair.closes).toLocaleString(loc, opts),
  };
}

const initialBundle = (): MeetingDetailBundle => ({
  meeting: null,
  agendaItems: [],
  votes: [],
  ballotsByVoteId: {},
  myBallotsByVoteId: {},
  invitations: [],
  resolutions: [],
});

export function MeetingDetail() {
  const { meetingId: meetingIdParam, id: legacyVotingId } = useParams<{ meetingId?: string; id?: string }>();
  const meetingId = meetingIdParam ?? legacyVotingId;
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { currentPropertyId, roleInProperty, ready: propertyReady } = useProperty();
  const { language, t } = useLanguage();
  const en = language === 'en';
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [bundle, setBundle] = useState<MeetingDetailBundle>(initialBundle);
  const [coreDone, setCoreDone] = useState(false);
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newAgendaZh, setNewAgendaZh] = useState('');
  const [newAgendaEn, setNewAgendaEn] = useState('');
  const [newAgendaKind, setNewAgendaKind] = useState<AgendaKindUi>('normal');
  const [newElectionSeats, setNewElectionSeats] = useState(3);
  const [newElectionMaxChoices, setNewElectionMaxChoices] = useState(3);
  const [newElectionSelfNom, setNewElectionSelfNom] = useState(true);
  const [newVoteRule, setNewVoteRule] = useState<'simple_majority' | 'three_quarter' | 'unanimous'>('simple_majority');
  const [agendaEdit, setAgendaEdit] = useState<{
    agendaId: string;
    title_zh: string;
    title_en: string;
    kind: AgendaKindUi;
    vote_rule: VoteRule;
    started_kind: AgendaKindUi;
    election_seats: number;
    election_max_choices: number;
    election_allow_self_nomination: boolean;
    election_nomination_opens_dl: string;
    election_nomination_closes_dl: string;
  } | null>(null);
  const [inviteProfileById, setInviteProfileById] = useState<
    Record<string, { full_name_en: string | null; full_name_zh: string | null; email: string | null }>
  >({});
  const [inviteToast, setInviteToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [evToast, setEvToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [ovBusy, setOvBusy] = useState(false);
  const [ovMeta, setOvMeta] = useState<{
    loading: boolean;
    meeting: OwnerVoteMeetingLite | null;
    resolutions: Array<{ id: string; title: string; threshold: string; display_order?: number | null }>;
    resolutionCount: number;
    eligibleCount: number;
  }>({ loading: false, meeting: null, resolutions: [], resolutionCount: 0, eligibleCount: 0 });
  const [ovResolutionResults, setOvResolutionResults] = useState<OwnerVoteResolutionResultNormalized[]>([]);
  const [ownerElectionBallots, setOwnerElectionBallots] = useState<OwnerElectionBallotLite[]>([]);
  const [viewerOvUnitNo, setViewerOvUnitNo] = useState<string | null>(null);
  const openedTrackedRef = useRef<string | null>(null);
  /** Guard: V3 auto-freeze fires at most once per OV meeting id within a session. */
  const v3AutoFreezeAttemptedRef = useRef<string | null>(null);

  const canManageCouncilMeetings = canManagePropertyMeetings(roleInProperty);
  const platformAdmin = isPlatformAdmin(profile);

  useEffect(() => {
    if (!propertyReady || !meetingId) return;
    if (!location.pathname.startsWith('/meetings/')) return;
    if (canManageCouncilMeetings) return;
    if (!coreDone) return;

    navigate(`/voting/${encodeURIComponent(meetingId)}${location.search}${location.hash}`, { replace: true });
  }, [
    propertyReady,
    meetingId,
    location.pathname,
    location.search,
    location.hash,
    navigate,
    canManageCouncilMeetings,
    coreDone,
  ]);

  const propertyIdForAgenda = currentPropertyId ?? bundle.meeting?.property_id ?? null;

  const load = useCallback(async () => {
    if (shouldDeferAutoPropertyRedirects()) {
      setBundle(initialBundle());
      setCoreDone(true);
      setExtrasLoading(false);
      return;
    }
    if (!meetingId || !user) {
      setBundle(initialBundle());
      setCoreDone(true);
      return;
    }
    if (!currentPropertyId) {
      setBundle(initialBundle());
      setCoreDone(true);
      return;
    }

    setCoreDone(false);
    setBundle(initialBundle());

    const { meeting: m } = await fetchMeetingCore(meetingId, currentPropertyId);
    setBundle((prev) => ({ ...prev, meeting: m }));
    setCoreDone(true);

    if (!m) return;

    setExtrasLoading(true);
    const ex = await fetchMeetingExtras(meetingId, m.property_id);
    setBundle((prev) => (prev.meeting ? { ...prev, ...ex } : prev));
    setExtrasLoading(false);
  }, [meetingId, user, currentPropertyId, location.pathname, location.hash, location.search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (shouldDeferAutoPropertyRedirects()) return;
    const ids = Array.from(new Set(bundle.invitations.map((i) => i.recipient_user_id).filter(Boolean)));
    if (ids.length === 0) {
      setInviteProfileById({});
      return;
    }
    let cancelled = false;
    void supabase
      .from('profiles')
      .select('id, full_name_en, full_name_zh, email')
      .in('id', ids)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const next: Record<string, { full_name_en: string | null; full_name_zh: string | null; email: string | null }> = {};
        for (const p of data as {
          id: string;
          full_name_en: string | null;
          full_name_zh: string | null;
          email: string | null;
        }[]) {
          next[p.id] = {
            full_name_en: p.full_name_en,
            full_name_zh: p.full_name_zh,
            email: p.email,
          };
        }
        setInviteProfileById(next);
      });
    return () => {
      cancelled = true;
    };
  }, [bundle.invitations, location.pathname, location.hash, location.search]);

  const meeting = bundle.meeting;

  const [supportingDocumentsArchive, setSupportingDocumentsArchive] = useState<MeetingSupportingDocumentRow[]>([]);

  const refreshSupportingDocumentsArchive = useCallback(async () => {
    if (!meeting?.id?.trim() || !meeting.property_id?.trim()) {
      setSupportingDocumentsArchive([]);
      return;
    }
    const { rows, error } = await fetchMeetingSupportingDocuments(meeting.property_id, meeting.id);
    if (error) {
      console.warn('[meetings] supporting documents archive', error.message);
      setSupportingDocumentsArchive([]);
      return;
    }
    setSupportingDocumentsArchive(rows);
  }, [meeting?.id, meeting?.property_id]);

  useEffect(() => {
    void refreshSupportingDocumentsArchive();
  }, [refreshSupportingDocumentsArchive]);
  useEffect(() => {
    if (!meeting) return;
    if (isMeetingClosedForVoting(meeting.status)) {
      setAgendaEdit(null);
      return;
    }
    if (isWrittenRemoteV3Meeting(meeting) && meeting.scheduled_at?.trim()) {
      const ms = new Date(meeting.scheduled_at).getTime();
      if (!Number.isNaN(ms) && Date.now() >= ms) setAgendaEdit(null);
    }
  }, [meeting?.id, meeting?.status, meeting?.scheduled_at, meeting?.description_zh]);

  const showCouncilOwnerVoteUi = !!(meeting && currentPropertyId && isOwnerVotingMeeting(meeting));
  const writtenRemoteV3Meeting = !!(meeting && isWrittenRemoteV3Meeting(meeting));

  const governanceMeta = useMemo(() => {
    if (!meeting?.description_zh) return null;
    return extractGovernanceMeta(meeting.description_zh).meta;
  }, [meeting?.description_zh]);

  const canSendMeetingInvites = canManageCouncilMeetings;
  const canShowMeetingEditControl = canManageCouncilMeetings;

  const canDeleteDraftMeeting = useMemo(() => {
    if (!meeting) return false;
    if (!canManageCouncilMeetings && !platformAdmin) return false;
    if (String(meeting.status ?? '').toLowerCase() !== 'draft') return false;
    const s = meeting.scheduled_at?.trim();
    if (!s) return true;
    const ms = new Date(s).getTime();
    return !Number.isNaN(ms) && Date.now() < ms;
  }, [meeting, canManageCouncilMeetings, platformAdmin]);

  const electionBundles = useMemo(() => {
    return bundle.agendaItems.flatMap((a) => {
      const m = extractElectionAgendaMeta(a.description_zh ?? '').meta;
      if (m?.agenda_type !== 'council_election') return [];
      return [{ agenda: a, meta: finalizeElectionMeta(m) }];
    });
  }, [bundle.agendaItems]);

  const electionBallotsByAgenda = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of ownerElectionBallots) {
      const id = String(b.agenda_item_id ?? '');
      if (!id) continue;
      m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  }, [ownerElectionBallots]);

  const electionRulesLockedForAgendaEdit = !!(agendaEdit && (electionBallotsByAgenda.get(agendaEdit.agendaId) ?? 0) > 0);

  const electionNomRibbonModel = useMemo(() => {
    if (!electionBundles.length || !meeting) return null;
    const base = buildElectionNominationRibbon(electionBundles.map((e) => e.meta), new Date(), meeting);
    if (!base) return null;
    if (!isStrictAgmOrSgmMeeting(meeting)) return base;
    const canon = deriveCouncilElectionCanonFromScheduledAt(meeting.scheduled_at);
    if (!canon) {
      return { ...base, nominationOpensIso: null, nominationClosesIso: null };
    }
    return {
      ...base,
      nominationOpensIso: canon.nominationOpenIso,
      nominationClosesIso: canon.nominationCloseIso,
    };
  }, [electionBundles, meeting]);

  const electionTimelineBlocksOwnerVote =
    electionNomRibbonModel?.nominationUiStatus === 'invalid';

  const councilFormalResolutionAgendaCount = useMemo(() => {
    let n = 0;
    for (const a of bundle.agendaItems) {
      if (agendaKindFromRow(a) === 'resolution') n++;
    }
    return n;
  }, [bundle.agendaItems]);

  const handleNavigateOwnerVotingForOwner = useCallback(() => {
    /**
     * Bug 2: V3 remote-written SGM has no staff "open voting" button — the
     * participation window is governed entirely by the canonical 14-day
     * timeline (`scheduled_at` → `+14d`). The legacy navigation gate requires
     * `owner_vote_meetings.status === 'open'`, which never flips for V3 and
     * produces a misleading "not open" error while the UI shows "Voting open".
     *
     * For V3: use the canonical timeline as the single source of truth, and
     * still require the same data-readiness checks (frozen snapshot, eligible
     * voters, and at least one agenda) used by the resolution gate.
     */
    if (meeting && isWrittenRemoteV3Meeting(meeting)) {
      const v3 = deriveRemoteWrittenV3CanonFromScheduledAt(meeting.scheduled_at);
      const ov = ovMeta.meeting;
      const openMs = v3?.votingOpenIso ? Date.parse(v3.votingOpenIso) : NaN;
      const closeMs = v3?.votingCloseIso ? Date.parse(v3.votingCloseIso) : NaN;
      const nowMs = Date.now();
      if (
        v3 &&
        !Number.isNaN(openMs) &&
        !Number.isNaN(closeMs) &&
        nowMs >= openMs &&
        nowMs < closeMs &&
        ov?.id &&
        String(ov.snapshot_frozen_at ?? '').trim() &&
        ovMeta.eligibleCount > 0 &&
        (ovMeta.resolutionCount > 0 || electionBundles.length > 0) &&
        !electionTimelineBlocksOwnerVote
      ) {
        const pid = currentPropertyId?.trim() || meeting?.property_id?.trim();
        navigate(pid ? `/voting?${new URLSearchParams({ propertyId: pid }).toString()}` : '/voting');
        return;
      }
    }
    const gate = evaluateOwnerVoteOwnerNavigationGate({
      ov: ovMeta.meeting,
      eligibleCount: ovMeta.eligibleCount,
      resolutionCount: ovMeta.resolutionCount,
      electionAgendaCount: electionBundles.length,
      electionTimelineBlocksVoting: electionTimelineBlocksOwnerVote,
    });
    if (!gate.ok) {
      if (gate.reason === 'too_early') {
        const iso = ovMeta.meeting?.voting_opens_at?.trim();
        let timeLabel = '—';
        if (iso) {
          const d = new Date(iso);
          if (!Number.isNaN(d.getTime())) {
            timeLabel = d.toLocaleString(en ? 'en-CA' : 'zh-CN', {
              dateStyle: 'medium',
              timeStyle: 'short',
            });
          }
        }
        setEvToast({
          kind: 'error',
          text: en
            ? `Voting is not open yet. It opens at ${timeLabel}.`
            : `投票尚未开放，将于 ${timeLabel} 开放。`,
        });
        return;
      }
      setEvToast({
        kind: 'error',
        text: t(translationKeyForOwnerVoteOwnerNavigationGate(gate.reason)),
      });
      return;
    }
    const pid = currentPropertyId?.trim() || meeting?.property_id?.trim();
    navigate(pid ? `/voting?${new URLSearchParams({ propertyId: pid }).toString()}` : '/voting');
  }, [
    meeting,
    ovMeta.meeting,
    ovMeta.eligibleCount,
    ovMeta.resolutionCount,
    electionBundles.length,
    en,
    t,
    navigate,
    electionTimelineBlocksOwnerVote,
    currentPropertyId,
    meeting?.property_id,
  ]);

  const showVoteWaitingResultsBanner =
    showCouncilOwnerVoteUi &&
    !ovMeta.loading &&
    !!ovMeta.meeting &&
    (ovMeta.resolutions.length > 0 || electionBundles.length > 0) &&
    (ovMeta.meeting.status?.trim().toLowerCase() ?? '') === 'open' &&
    !ovResolutionResults.some((r) => (r.total_cast ?? 0) > 0) &&
    ownerElectionBallots.length === 0;

  useEffect(() => {
    let cancelled = false;
    if (!showCouncilOwnerVoteUi || !user?.id) {
      setViewerOvUnitNo(null);
      return undefined;
    }
    const mid = ovMeta.meeting?.id?.trim();
    if (!mid) {
      setViewerOvUnitNo(null);
      return undefined;
    }
    void (async () => {
      const { data, error } = await supabase
        .from('owner_vote_voter_snapshot')
        .select('unit_no')
        .eq('user_id', user.id)
        .eq('meeting_id', mid)
        .eq('is_eligible', true)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) setViewerOvUnitNo(null);
      else setViewerOvUnitNo(data.unit_no != null ? String(data.unit_no).trim() : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [showCouncilOwnerVoteUi, user?.id, ovMeta.meeting?.id]);
  const refreshOwnerVoteMeta = useCallback(async () => {
    if (!meeting || !currentPropertyId || !isOwnerVotingMeeting(meeting)) {
      setOvMeta({ loading: false, meeting: null, resolutions: [], resolutionCount: 0, eligibleCount: 0 });
      setOvResolutionResults([]);
      setOwnerElectionBallots([]);
      return;
    }
    setOvMeta((p) => ({ ...p, loading: true }));
    const r = await fetchOwnerVoteMeetingMetaForCouncilMeeting({ propertyId: currentPropertyId, meeting });
    let viewRows: OwnerVoteResolutionResultNormalized[] = [];
    if (r.meeting?.id) {
      const vr = await fetchOwnerVoteResolutionResultsForOwnerMeeting({
        propertyId: currentPropertyId,
        ownerVoteMeetingId: r.meeting.id,
      });
      viewRows = vr.rows;
      if (vr.error) console.error('[MeetingDetail] owner_vote_resolution_results', vr.error);
    }
    setOvMeta({
      loading: false,
      meeting: r.meeting,
      resolutions: r.resolutions,
      resolutionCount: r.resolutionCount,
      eligibleCount: r.eligibleCount,
    });
    setOvResolutionResults(viewRows);

    if (r.meeting?.id) {
      const eb = await supabase
        .from('owner_election_ballots')
        .select('agenda_item_id, selected_candidate_ids, unit_no')
        .eq('meeting_id', r.meeting.id);
      if (eb.error) {
        console.error('[MeetingDetail] owner_election_ballots', eb.error.message);
        setOwnerElectionBallots([]);
      } else {
        setOwnerElectionBallots(((eb.data ?? []) as OwnerElectionBallotLite[]) ?? []);
      }
    } else {
      setOwnerElectionBallots([]);
    }

    if (r.error) console.error('[MeetingDetail] owner vote meta', r.error);
  }, [meeting, currentPropertyId, bundle.agendaItems.length]);

  useEffect(() => {
    if (shouldDeferAutoPropertyRedirects()) return;
    if (!meeting || !currentPropertyId || !isOwnerVotingMeeting(meeting)) {
      setOvMeta({ loading: false, meeting: null, resolutions: [], resolutionCount: 0, eligibleCount: 0 });
      setOvResolutionResults([]);
      setOwnerElectionBallots([]);
      return;
    }

    void refreshOwnerVoteMeta();
  }, [meeting, currentPropertyId, refreshOwnerVoteMeta]);

  useEffect(() => {
    if (shouldDeferAutoPropertyRedirects()) return;
    if (!meeting || !isOwnerVotingMeeting(meeting)) return;
    const onVis = () => {
      if (document.visibilityState === 'visible') void refreshOwnerVoteMeta();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [meeting, refreshOwnerVoteMeta]);

  /**
   * V3 remote-written: no manual freeze button is rendered (hideStaffOvManualLifecycle),
   * but `submit_owner_election_nomination` + `eligibleUnitNo` still require a frozen
   * `owner_vote_voter_snapshot`. After meeting.scheduled_at, freeze once via the existing
   * RPC so owner self-nomination becomes possible. AGM/legacy flows are unaffected.
   */
  useEffect(() => {
    if (!meeting || !isWrittenRemoteV3Meeting(meeting)) return;
    const ovId = ovMeta.meeting?.id?.trim();
    if (!ovId) return;
    if (ovMeta.meeting?.snapshot_frozen_at?.trim()) return;
    const scheduled = meeting.scheduled_at?.trim();
    if (!scheduled) return;
    const startMs = new Date(scheduled).getTime();
    if (Number.isNaN(startMs) || Date.now() < startMs) return;
    if (v3AutoFreezeAttemptedRef.current === ovId) return;
    v3AutoFreezeAttemptedRef.current = ovId;
    void (async () => {
      const { error } = await supabase.rpc('freeze_owner_vote_snapshot', { p_meeting_id: ovId });
      if (error) {
        console.error('[MeetingDetail] v3 auto freeze_owner_vote_snapshot', error);
        return;
      }
      await refreshOwnerVoteMeta();
    })();
  }, [meeting, ovMeta.meeting?.id, ovMeta.meeting?.snapshot_frozen_at, refreshOwnerVoteMeta]);

  useEffect(() => {
    if (!evToast) return;
    const h = window.setTimeout(() => setEvToast(null), 8000);
    return () => window.clearTimeout(h);
  }, [evToast]);

  const isVotingRoute =
    location.pathname.startsWith('/voting') && !location.pathname.includes('/demo/voting');

  const backToListHref = useMemo(() => {
    if (location.pathname.includes('/demo/voting')) return '/demo/voting';
    /** 会议所属物业优先，避免多物业下切换 UI 后返回串物业 */
    const pid =
      meeting?.property_id?.trim() ||
      searchParams.get('propertyId')?.trim() ||
      new URLSearchParams(location.search).get('propertyId')?.trim() ||
      currentPropertyId?.trim();

    const sourceRaw = (searchParams.get('source') ?? '').trim().toLowerCase();
    if (sourceRaw === 'voting') {
      if (pid) return `/voting?${new URLSearchParams({ propertyId: pid }).toString()}`;
      return '/voting';
    }
    if (sourceRaw === 'owner-voting') {
      if (pid) return `/voting?${new URLSearchParams({ propertyId: pid }).toString()}`;
      return '/voting';
    }
    if (sourceRaw === 'meetings') {
      if (pid) return `/meetings?${new URLSearchParams({ propertyId: pid }).toString()}`;
      return '/meetings';
    }

    if (
      meeting &&
      isWrittenRemoteV3Meeting(meeting) &&
      extractGovernanceMeta(meeting.description_zh ?? '').meta?.initiation_type === 'owner_requisitioned' &&
      pid
    ) {
      return `/voting?${new URLSearchParams({ propertyId: pid }).toString()}`;
    }
    const base = location.pathname.startsWith('/voting') ? '/voting' : '/meetings';
    if (pid) return `${base}?${new URLSearchParams({ propertyId: pid }).toString()}`;
    return base;
  }, [location.pathname, location.search, searchParams, currentPropertyId, meeting]);

  /** 刷新 / 深链：加载会议后把 URL 中的 propertyId 与会议所属物业对齐，返回列表与多物业上下文一致 */
  useEffect(() => {
    if (shouldDeferAutoPropertyRedirects()) return;
    if (!meeting?.property_id) return;
    const urlPid = searchParams.get('propertyId');
    if (urlPid && samePropertyId(urlPid, meeting.property_id)) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('propertyId', meeting.property_id);
        return next;
      },
      { replace: true },
    );
  }, [meeting?.property_id, searchParams, setSearchParams]);

  useEffect(() => {
    if (shouldDeferAutoPropertyRedirects()) return;
    const mid = meeting?.id;
    if (!mid || !user?.id || !currentPropertyId) return;
    const key = `${mid}:${currentPropertyId}`;
    if (openedTrackedRef.current === key) return;
    openedTrackedRef.current = key;
    void (async () => {
      const { error } = await markMeetingInvitationOpened(mid, currentPropertyId);
      if (!error) await load();
    })();
  }, [meeting?.id, user?.id, currentPropertyId, load, location.pathname, location.hash, location.search]);

  const voteByAgendaId = useMemo(() => {
    const m = new Map<string, MeetingVoteRow & { options: MeetingVoteOptionRow[] }>();
    for (const v of bundle.votes) {
      m.set(v.agenda_item_id, v);
    }
    return m;
  }, [bundle.votes]);

  const handleCancelAgendaEdit = useCallback(async () => {
    if (!agendaEdit) return;
    if (!meeting || !propertyIdForAgenda) {
      setAgendaEdit(null);
      return;
    }
    const row = bundle.agendaItems.find((x) => x.id === agendaEdit.agendaId);
    if (
      row &&
      !isMeetingClosedForVoting(meeting.status) &&
      isBlankDeletableCouncilAgendaPlaceholder(row, voteByAgendaId, electionBallotsByAgenda, ovMeta.resolutions)
    ) {
      setBusy(true);
      setActionErr(null);
      const { error } = await supabase
        .from('meeting_agenda_items')
        .delete()
        .eq('property_id', propertyIdForAgenda)
        .eq('meeting_id', meeting.id)
        .eq('id', row.id);
      if (error) {
        setActionErr(error.message);
        setBusy(false);
        return;
      }
      setAgendaEdit(null);
      setBusy(false);
      await load();
      await refreshOwnerVoteMeta();
      return;
    }
    setAgendaEdit(null);
  }, [
    agendaEdit,
    meeting,
    propertyIdForAgenda,
    bundle.agendaItems,
    voteByAgendaId,
    electionBallotsByAgenda,
    ovMeta.resolutions,
    load,
    refreshOwnerVoteMeta,
  ]);

  const handleDeleteAgendaItem = useCallback(async () => {
    if (!agendaEdit) {
      setActionErr(en ? 'No agenda item is being edited.' : '当前没有正在编辑的议程。');
      return;
    }
    if (!meeting) {
      setActionErr(en ? 'Meeting is not loaded.' : '会议信息未加载。');
      return;
    }
    if (!propertyIdForAgenda) {
      setActionErr(en ? 'No property context. Select a property and try again.' : '未选择物业，请先选择物业后再试。');
      return;
    }
    if (!user?.id) {
      setActionErr(en ? 'Sign in required.' : '请先登录。');
      return;
    }
    const row = bundle.agendaItems.find((x) => x.id === agendaEdit.agendaId);
    if (!row) {
      setActionErr(en ? 'That agenda row is missing. Refresh the page and try again.' : '找不到该议程，请刷新页面后重试。');
      return;
    }
    const resolutionsForMatch = ovMeta.resolutions.map((r) => ({
      id: r.id,
      title: r.title,
      display_order: r.display_order ?? null,
    }));
    const blockReason = await meetingDetailAgendaDeleteBlockReason({
      meeting,
      row,
      voteByAgendaId,
      ballotsByVoteId: bundle.ballotsByVoteId,
      electionBallotsByAgenda,
      resolutionsForMatch,
      propertyId: propertyIdForAgenda,
      en,
    });
    if (blockReason) {
      setActionErr(blockReason);
      return;
    }
    setBusy(true);
    setActionErr(null);
    const { error } = await supabase
      .from('meeting_agenda_items')
      .delete()
      .eq('property_id', propertyIdForAgenda)
      .eq('meeting_id', meeting.id)
      .eq('id', row.id);
    if (error) {
      setActionErr(
        en ? `Could not delete this agenda item: ${error.message}` : `无法删除该议题：${error.message}`,
      );
      setBusy(false);
      return;
    }
    setAgendaEdit(null);
    setBusy(false);
    await load();
    await refreshOwnerVoteMeta();
  }, [
    agendaEdit,
    meeting,
    propertyIdForAgenda,
    user?.id,
    bundle.agendaItems,
    bundle.ballotsByVoteId,
    voteByAgendaId,
    electionBallotsByAgenda,
    ovMeta.resolutions,
    en,
    load,
    refreshOwnerVoteMeta,
  ]);

  async function handleCreateVote(agenda: MeetingAgendaRow) {
    if (!meeting || !user) return;
    if (isMeetingClosedForVoting(meeting.status)) {
      setActionErr(en ? 'This meeting has ended. The agenda is locked.' : '会议已结束，议程已锁定。');
      return;
    }
    if (remoteWrittenV3MeetingAgendaEditBlocked(meeting)) {
      setActionErr(remoteWrittenV3AgendaEditErr(en));
      return;
    }
    setBusy(true);
    setActionErr(null);
    const { voteId, error } = await createVote({
      propertyId: meeting.property_id,
      meetingId: meeting.id,
      agendaItemId: agenda.id,
      voteRule: (agenda.vote_rule as 'simple_majority' | 'three_quarter' | 'unanimous' | null) || 'simple_majority',
      titleEn: agenda.title_en,
      titleZh: agenda.title_zh,
      descriptionEn: agenda.description_en,
      descriptionZh: agenda.description_zh,
      status: 'draft',
    });
    if (error || !voteId) setActionErr(error?.message ?? (en ? 'Could not create vote.' : '无法创建表决。'));
    setBusy(false);
    await load();
  }

  async function handleOpenVote(voteId: string) {
    if (!meeting) return;
    if (isMeetingClosedForVoting(meeting.status)) {
      setActionErr(en ? 'This meeting has ended. The agenda is locked.' : '会议已结束，议程已锁定。');
      return;
    }
    if (remoteWrittenV3MeetingAgendaEditBlocked(meeting)) {
      setActionErr(remoteWrittenV3AgendaEditErr(en));
      return;
    }
    setBusy(true);
    setActionErr(null);
    const { error } = await updateVote(voteId, meeting.property_id, {
      status: 'open',
      opens_at: new Date().toISOString(),
    });
    if (error) setActionErr(error.message);
    setBusy(false);
    await load();
  }

  async function handleCloseVote(voteId: string) {
    if (!meeting) return;
    if (isMeetingClosedForVoting(meeting.status)) {
      setActionErr(en ? 'This meeting has ended. The agenda is locked.' : '会议已结束，议程已锁定。');
      return;
    }
    if (remoteWrittenV3MeetingAgendaEditBlocked(meeting)) {
      setActionErr(remoteWrittenV3AgendaEditErr(en));
      return;
    }
    setBusy(true);
    setActionErr(null);
    const { error } = await updateVote(voteId, meeting.property_id, {
      status: 'closed',
      closes_at: new Date().toISOString(),
    });
    if (error) setActionErr(error.message);
    setBusy(false);
    await load();
  }

  async function handleBallot(voteId: string, optionKey: string) {
    if (!user || !meeting) return;
    if (isMeetingClosedForVoting(meeting.status)) {
      setActionErr(
        en ? 'This meeting has ended. Voting is closed.' : '会议已结束，投票已关闭。',
      );
      return;
    }
    setBusy(true);
    setActionErr(null);
    const { error } = await castBallot(voteId, optionKey, meeting.property_id);
    if (error && 'message' in error) setActionErr(String(error.message));
    setBusy(false);
    await load();
  }

  async function handleAddAgenda(e: React.FormEvent) {
    e.preventDefault();
    if (!meeting || !propertyIdForAgenda) return;
    if (isMeetingClosedForVoting(meeting.status)) {
      setActionErr(en ? 'This meeting has ended. The agenda is locked.' : '会议已结束，议程已锁定。');
      return;
    }
    if (remoteWrittenV3MeetingAgendaEditBlocked(meeting)) {
      setActionErr(remoteWrittenV3AgendaEditErr(en));
      return;
    }
    if (!newAgendaZh.trim() && !newAgendaEn.trim()) {
      setActionErr(en ? 'Enter an agenda title.' : '请填写议程标题。');
      return;
    }
    setBusy(true);
    setActionErr(null);
    const nextOrder = bundle.agendaItems.length + 1;
    const savedTitleZh = newAgendaZh.trim();
    const savedTitleEn = newAgendaEn.trim();
    const savedVoteRule = newVoteRule;
    const savedKind = newAgendaKind;
    const requiresVote = savedKind === 'resolution';

    let descriptionZh: string | undefined;
    if (savedKind === 'election') {
      const pairCanon = canonElectionNominationPairOrNull(meeting);
      if (!pairCanon) {
        setActionErr(
          en
            ? 'Set a valid AGM/SGM scheduled start before adding an election agenda (phases derive from meeting start).'
            : '请先设置有效的 AGM/SGM 召开时间后再添加业委会选举议程（阶段由会议开始自动生成）。',
        );
        setBusy(false);
        return;
      }
      const nomination_opens_at = pairCanon.opens;
      const nomination_closes_at = pairCanon.closes;
      descriptionZh = embedElectionAgendaMeta(
        '',
        defaultElectionMeta({
          seats: newElectionSeats,
          max_choices_per_unit: newElectionMaxChoices,
          allow_self_nomination: newElectionSelfNom,
          nomination_opens_at,
          nomination_closes_at,
        }),
      );
    }

    if (savedKind === 'election' && meeting && descriptionZh) {
      const em = extractElectionAgendaMeta(descriptionZh).meta;
      if (
        em &&
        analyzeCouncilElectionTimeline(em, meeting).invalid_election_timeline
      ) {
        setActionErr(t('meeting_election_invalid_timeline'));
        setBusy(false);
        return;
      }
    }

    const { error } = await createAgendaItem({
      propertyId: propertyIdForAgenda,
      meetingId: meeting.id,
      sortOrder: nextOrder,
      titleEn: savedTitleEn || null,
      titleZh: savedTitleZh || null,
      descriptionZh,
      requiresVote,
      voteRule: requiresVote ? savedVoteRule : null,
    });

    if (error) {
      setActionErr(error.message);
      setBusy(false);
      await load();
      return;
    }

    setNewAgendaZh('');
    setNewAgendaEn('');
    setNewAgendaKind('normal');

    if (requiresVote && isOwnerVotingMeeting(meeting) && canManageCouncilMeetings && currentPropertyId && user?.id) {
      const ensured = await ensureOwnerVoteMeetingForCouncilMeeting({
        propertyId: propertyIdForAgenda,
        meeting,
        userId: user.id,
      });

      if (ensured.error || !ensured.id) {
        console.error('[MeetingDetail] ensureOwnerVoteMeetingForCouncilMeeting', ensured.error);
        setActionErr(
          en
            ? 'Agenda added, but owner vote meeting could not be created. Add formal resolutions later in expense review if needed.'
            : '议程已添加，但业主表决会议准备失败，正式决议未同步。请稍后在业主表决管理中补充。',
        );
      } else {
        const resTitle = savedTitleZh || savedTitleEn || (en ? 'Untitled resolution' : '未命名决议');
        const th = mapVoteRuleToOwnerVoteThreshold(savedVoteRule);
        const { id: resId, error: resErr } = await ensureOwnerVoteResolutionForMeeting({
          meetingId: ensured.id,
          title: resTitle,
          threshold: th,
          description: null,
          display_order: nextOrder,
        });
        if (resErr || !resId) {
          console.error('[MeetingDetail] owner_vote_resolutions ensure', resErr);
          setActionErr(
            en
              ? 'Agenda added, but the formal owner vote resolution could not be created. You can add it later.'
              : '议程已添加，但正式表决决议创建失败，请稍后补充。',
          );
        }
      }
    }

    setBusy(false);
    await load();
  }

  async function handlePersistAgendaEdit() {
    if (!meeting || !propertyIdForAgenda || !user?.id || !agendaEdit) return;
    if (isMeetingClosedForVoting(meeting.status)) {
      setActionErr(en ? 'This meeting has ended. The agenda is locked.' : '会议已结束，议程已锁定。');
      return;
    }
    if (remoteWrittenV3MeetingAgendaEditBlocked(meeting)) {
      setActionErr(remoteWrittenV3AgendaEditErr(en));
      return;
    }
    const row = bundle.agendaItems.find((x) => x.id === agendaEdit.agendaId);
    if (!row) return;

    const tzh = agendaEdit.title_zh.trim();
    const ten = agendaEdit.title_en.trim();
    if (!tzh && !ten) {
      setActionErr(en ? 'Enter a title.' : '请填写议程标题。');
      return;
    }

    const resolutionsForMatch = ovMeta.resolutions.map((r) => ({
      id: r.id,
      title: r.title,
      display_order: r.display_order ?? null,
    }));
    const matchedRes = findOwnerVoteResolutionForAgenda(
      { sort_order: row.sort_order, title_zh: row.title_zh, title_en: row.title_en },
      resolutionsForMatch,
    );

    const startedKind = agendaEdit.started_kind;
    const nextKind = agendaEdit.kind;

    if (startedKind === 'resolution' && nextKind !== 'resolution' && matchedRes) {
      const { count, error: cErr } = await supabase
        .from('owner_vote_ballots')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyIdForAgenda)
        .eq('resolution_id', matchedRes.id);
      if (cErr) console.warn('[MeetingDetail] ballot count', cErr.message);
      if ((typeof count === 'number' ? count : 0) > 0) {
        setActionErr(t('meeting_agenda_cannot_remove_vote_has_ballots'));
        return;
      }
    }

    if (startedKind === 'resolution' && nextKind === 'election' && matchedRes) {
      const { count, error: cErr } = await supabase
        .from('owner_vote_ballots')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyIdForAgenda)
        .eq('resolution_id', matchedRes.id);
      if (cErr) console.warn('[MeetingDetail] ballot count (to election)', cErr.message);
      if ((typeof count === 'number' ? count : 0) > 0) {
        setActionErr(t('meeting_agenda_cannot_make_election_resolution_has_ballots'));
        return;
      }
    }

    if (startedKind === 'election' && nextKind !== 'election') {
      const n = electionBallotsByAgenda.get(row.id) ?? 0;
      if (n > 0) {
        setActionErr(t('meeting_agenda_cannot_remove_election_has_ballots'));
        return;
      }
    }

    /** Council-level `meeting_votes` ballots (distinct from owner_vote_ballots). */
    const councilVoteRow = voteByAgendaId.get(row.id);
    if (startedKind === 'resolution' && nextKind === 'election' && councilVoteRow) {
      const councilBallots = bundle.ballotsByVoteId[councilVoteRow.id] ?? [];
      if (councilBallots.length > 0) {
        setActionErr(
          en
            ? 'This agenda already has ballots on its council vote. Close or archive that vote before converting to an election agenda.'
            : '该议程关联的「会议表决」已有投票记录，请先结束或归档后再转为选举议程。',
        );
        return;
      }
    }

    const existing = row.description_zh ?? '';
    const peeled = extractElectionAgendaMeta(existing).cleanDescriptionZh.trim();

    /** Resolution-only; council election meta lives in description_zh blob. */
    const nextRequiresVote = nextKind === 'resolution';
    const nextVoteRule: VoteRule | null = nextRequiresVote ? agendaEdit.vote_rule : null;

    let electionMetaTimelineProbe: ElectionAgendaMetaV1 | null = null;
    let descriptionZh: string | null | undefined = row.description_zh;

    const pairCanon = canonElectionNominationPairOrNull(meeting);
    if (nextKind === 'election' && !pairCanon) {
      setActionErr(
        en
          ? 'Set a valid AGM/SGM scheduled start; election timelines are derived automatically from meeting start.'
          : '请设置有效的 AGM/SGM 召开时间；业委会选举时间由会议开始自动生成。',
      );
      return;
    }

    if (nextKind === 'election') {
      const upgradingToElectionFromNonElection = startedKind !== 'election';

      if (upgradingToElectionFromNonElection) {
        electionMetaTimelineProbe = defaultElectionMeta({
          seats: 7,
          max_choices_per_unit: 7,
          allow_self_nomination: true,
          nomination_opens_at: pairCanon!.opens,
          nomination_closes_at: pairCanon!.closes,
        });
        descriptionZh = embedElectionAgendaMeta(peeled || null, electionMetaTimelineProbe);
      } else {
        const previousMeta = extractElectionAgendaMeta(row.description_zh ?? '').meta ?? defaultElectionMeta();
        const base = finalizeElectionMeta(previousMeta);
        const ballotsN = electionBallotsByAgenda.get(row.id) ?? 0;
        let nextSeats = Math.max(1, Math.floor(Number(agendaEdit.election_seats) || 1));
        let nextMax = Math.max(1, Math.floor(Number(agendaEdit.election_max_choices) || 1));

        if (ballotsN > 0 && (nextSeats !== base.seats || nextMax !== base.max_choices_per_unit)) {
          setActionErr(t('meeting_election_rules_locked'));
          return;
        }

        const merged: ElectionAgendaMetaV1 = {
          ...base,
          seats: nextSeats,
          max_choices_per_unit: nextMax,
          allow_self_nomination: agendaEdit.election_allow_self_nomination,
          candidates: [...base.candidates],
          nomination_opens_at: pairCanon!.opens,
          nomination_closes_at: pairCanon!.closes,
        };
        electionMetaTimelineProbe = merged;
        descriptionZh = embedElectionAgendaMeta(peeled || null, merged);
      }
    } else {
      descriptionZh = peeled.trim() ? peeled : null;
    }

    if (electionMetaTimelineProbe && meeting) {
      const { invalid_election_timeline } = analyzeCouncilElectionTimeline(
        electionMetaTimelineProbe,
        meeting,
      );
      if (invalid_election_timeline) {
        setActionErr(t('meeting_election_invalid_timeline'));
        return;
      }
    }

    setBusy(true);
    setActionErr(null);

    const { error: upAgendaErr } = await updateMeetingAgendaItem({
      propertyId: propertyIdForAgenda,
      meetingId: meeting.id,
      agendaItemId: row.id,
      titleZh: tzh || null,
      titleEn: ten || null,
      descriptionEn: row.description_en,
      descriptionZh,
      requiresVote: nextRequiresVote,
      voteRule: nextVoteRule,
    });
    if (upAgendaErr) {
      setActionErr(upAgendaErr.message);
      setBusy(false);
      return;
    }

    if (
      startedKind === 'resolution' &&
      nextKind === 'election' &&
      councilVoteRow
    ) {
      const { error: delCouncilVoteErr } = await supabase
        .from('meeting_votes')
        .delete()
        .eq('property_id', propertyIdForAgenda)
        .eq('id', councilVoteRow.id)
        .eq('meeting_id', meeting.id);
      if (delCouncilVoteErr) {
        console.warn('[MeetingDetail] delete orphan meeting_vote after election conversion', delCouncilVoteErr.message);
      }
    }

    if (councilVoteRow && nextRequiresVote) {
      await updateVote(councilVoteRow.id, meeting.property_id, {
        title_en: ten || null,
        title_zh: tzh || null,
        vote_rule: agendaEdit.vote_rule,
      });
    }

    if (isOwnerVotingMeeting(meeting) && canManageCouncilMeetings && nextRequiresVote) {
      const ensured = await ensureOwnerVoteMeetingForCouncilMeeting({
        propertyId: propertyIdForAgenda,
        meeting,
        userId: user.id,
      });

      if (ensured.error || !ensured.id) {
        console.error('[MeetingDetail] ensure OV on agenda edit', ensured.error);
      } else {
        const titleForRes = tzh || ten || (en ? 'Untitled resolution' : '未命名决议');
        const matchedBefore = findOwnerVoteResolutionForAgenda(
          { sort_order: row.sort_order, title_zh: row.title_zh, title_en: row.title_en },
          resolutionsForMatch,
        );
        if (matchedBefore) {
          const { error: rErr } = await supabase
            .from('owner_vote_resolutions')
            .update({
              title: titleForRes,
              threshold: mapVoteRuleToOwnerVoteThreshold(agendaEdit.vote_rule),
              display_order: row.sort_order,
            } as Record<string, unknown>)
            .eq('id', matchedBefore.id)
            .eq('meeting_id', ensured.id);
          if (rErr) console.error('[MeetingDetail] owner_vote_resolutions update', rErr);
        } else {
          const th = mapVoteRuleToOwnerVoteThreshold(agendaEdit.vote_rule);
          const { id: newResId, error: insErr } = await ensureOwnerVoteResolutionForMeeting({
            meetingId: ensured.id,
            title: titleForRes,
            threshold: th,
            description: null,
            display_order: row.sort_order,
          });
          if (insErr || !newResId) {
            console.error('[MeetingDetail] owner_vote_resolutions ensure (edit)', insErr);
          }
        }
      }
    }

    setAgendaEdit(null);
    setBusy(false);
    await load();
    await refreshOwnerVoteMeta();
  }

  useEffect(() => {
    if (!inviteToast) return;
    const t = window.setTimeout(() => setInviteToast(null), 8000);
    return () => window.clearTimeout(t);
  }, [inviteToast]);

  async function handleDeleteDraftMeeting() {
    if (!meeting || !canDeleteDraftMeeting) return;
    const confirmed = window.confirm(
      en
        ? 'Delete this draft meeting? This cannot be undone.'
        : '确认删除这个草稿会议？删除后不可恢复。',
    );
    if (!confirmed) return;
    setBusy(true);
    setActionErr(null);
    setInviteToast(null);
    try {
      const result = await deleteDraftMeetingBeforeStart(meeting.id);
      if (!result.ok) {
        const msg = deleteDraftMeetingErr(result.code, en);
        setActionErr(msg);
        setInviteToast({ kind: 'error', text: msg });
        return;
      }
      const pid = meeting.property_id?.trim() || '';
      navigate(
        pid ? `/meetings?${new URLSearchParams({ propertyId: pid }).toString()}` : '/meetings',
        { replace: true },
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSendInvites() {
    console.log('🚨 BUILD VERSION', import.meta.env.VITE_BUILD_TIME || 'dev');
    if (!meeting) {
      console.warn('🚨 early return reason: handleSendInvites — meeting is null');
      return;
    }
    console.log('send invite clicked', { meetingId: meeting.id, propertyId: meeting.property_id });
    setBusy(true);
    setActionErr(null);
    setInviteToast(null);
    try {
      const result = await sendMeetingInvitations(meeting.id, meeting.property_id, en ? 'en' : 'zh');
      console.log('recipients count', result.attempted);
      if (result.attempted === 0) {
        const msg = en ? 'No property members to invite.' : '没有可邀请的成员。';
        setInviteToast({ kind: 'error', text: msg });
        setActionErr(msg);
        return;
      }
      if (result.failed > 0 && result.sent === 0) {
        const msg =
          result.errors[0]?.message ??
          (en ? 'All invitation emails failed. See console.' : '全部邀请发送失败，请查看控制台。');
        console.error('send-meeting-invite error (all failed)', result.errors);
        setActionErr(msg);
        setInviteToast({ kind: 'error', text: msg });
        return;
      }
      if (result.failed > 0) {
        const msg = en
          ? `Sent ${result.sent}, failed ${result.failed}. Check console for details.`
          : `已发送 ${result.sent} 封，失败 ${result.failed} 封。详情请查看控制台。`;
        setActionErr(msg);
        setInviteToast({ kind: 'error', text: msg });
        return;
      }
      const okMsg = en
        ? `Invitation emails sent: ${result.sent}`
        : `已成功发送 ${result.sent} 封会议邀请邮件`;
      console.log('send-meeting-invite success', { sent: result.sent });
      setInviteToast({ kind: 'success', text: okMsg });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('send invite failed', e);
      setActionErr(msg);
      setInviteToast({ kind: 'error', text: msg });
    } finally {
      setBusy(false);
      try {
        await load();
      } catch (loadErr) {
        console.warn('[MeetingDetail] load after send failed (non-blocking)', loadErr);
      }
    }
  }

  async function handleRetryFailedInvites() {
    if (!meeting) return;
    setBusy(true);
    setActionErr(null);
    setInviteToast(null);
    try {
      const { error } = await resetFailedInvitations(meeting.id, meeting.property_id);
      if (error) setActionErr(error.message);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setActionErr(msg);
      setInviteToast({ kind: 'error', text: msg });
    } finally {
      setBusy(false);
      try {
        await load();
      } catch (loadErr) {
        console.warn('[MeetingDetail] load after retry invites failed (non-blocking)', loadErr);
      }
    }
  }

  async function handleEnableElectronicVoting() {
    if (!meeting || !user?.id || !currentPropertyId) return;
    if (isMeetingClosedForVoting(meeting.status)) return;
    if (electionTimelineBlocksOwnerVote) {
      setEvToast({
        kind: 'error',
        text: t('meeting_election_time_overlap_admin_warn'),
      });
      return;
    }
    if (!councilMeetingTitleForOwnerVoteBinding(meeting).trim()) {
      setEvToast({
        kind: 'error',
        text: en
          ? 'Add a Chinese or English meeting title before enabling electronic voting.'
          : '请先为本次会议填写标题后再启用。',
      });
      return;
    }
    setOvBusy(true);
    const { id, error } = await ensureOwnerVoteMeetingForCouncilMeeting({
      propertyId: currentPropertyId,
      meeting,
      userId: user.id,
    });
    if (error || !id) {
      console.error('[MeetingDetail] enable electronic voting', error);
      setEvToast({
        kind: 'error',
        text: error?.message ?? (en ? 'Could not enable electronic voting.' : '启用失败。'),
      });
      setOvBusy(false);
      return;
    }
    setEvToast({ kind: 'success', text: t('meeting_ov_enabled_toast') });
    setOvBusy(false);
    await refreshOwnerVoteMeta();
  }

  async function handleFreezeOwnerVoteSnapshot() {
    if (!meeting || isMeetingClosedForVoting(meeting.status)) return;
    const ov = ovMeta.meeting;
    if (!ov?.id) return;
    const st = ov.status?.trim().toLowerCase() ?? '';
    if (st === 'open' && !window.confirm(t('meeting_ov_freeze_confirm_open'))) return;
    setOvBusy(true);
    const { error } = await supabase.rpc('freeze_owner_vote_snapshot', { p_meeting_id: ov.id });
    if (error) {
      console.error('[MeetingDetail] freeze_owner_vote_snapshot', error);
      setEvToast({ kind: 'error', text: error.message });
    } else {
      setEvToast({ kind: 'success', text: t('meeting_ov_freeze_toast') });
    }
    setOvBusy(false);
    await refreshOwnerVoteMeta();
  }

  async function handleOpenOwnerVoteMeeting() {
    if (!meeting || isMeetingClosedForVoting(meeting.status)) return;
    const ov = ovMeta.meeting;
    if (!ov?.id) return;
    const gate = evaluateOwnerVoteOpenGate({
      ov,
      eligibleCount: ovMeta.eligibleCount,
      resolutionCount: ovMeta.resolutionCount,
      electionAgendaCount: electionBundles.length,
      electionTimelineBlocksVoting: electionTimelineBlocksOwnerVote,
    });
    if (!gate.ok) {
      setEvToast({ kind: 'error', text: t(translationKeyForOwnerVoteOpenGate(gate.reason)) });
      return;
    }
    setOvBusy(true);
    const { error } = await supabase
      .from('owner_vote_meetings')
      .update({ status: 'open', updated_at: new Date().toISOString() } as Record<string, unknown>)
      .eq('id', ov.id);
    if (error) {
      console.error('[MeetingDetail] open owner vote meeting', error);
      setEvToast({ kind: 'error', text: error.message });
    } else {
      setEvToast({ kind: 'success', text: t('meeting_ev_open_toast') });
    }
    setOvBusy(false);
    await refreshOwnerVoteMeta();
  }

  async function handleCloseOwnerVoteMeeting() {
    if (!meeting || isMeetingClosedForVoting(meeting.status)) return;
    const ov = ovMeta.meeting;
    if (!ov?.id || ov.status?.trim().toLowerCase() !== 'open') return;
    setOvBusy(true);
    const { error } = await supabase
      .from('owner_vote_meetings')
      .update({ status: 'closed', updated_at: new Date().toISOString() } as Record<string, unknown>)
      .eq('id', ov.id);
    if (error) {
      console.error('[MeetingDetail] close owner vote meeting', error);
      setEvToast({ kind: 'error', text: error.message });
    } else {
      setEvToast({ kind: 'success', text: t('meeting_ev_close_toast') });
    }
    setOvBusy(false);
    await refreshOwnerVoteMeta();
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">{en ? 'Sign in required.' : '请先登录。'}</div>;
  }

  if (!coreDone) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-clearstrata-ui-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Link
          to={backToListHref}
          className="inline-flex items-center gap-2 text-clearstrata-brand-700 font-medium hover:text-clearstrata-brand-900 hover:underline mb-6"
        >
          <ArrowLeft size={18} />{' '}
          {isVotingRoute ? (en ? 'Back to voting list' : '返回投票列表') : t('meeting_back_list')}
        </Link>
        <p className="text-center text-gray-700 text-lg">{en ? meetingUiStrings.notFound.en : meetingUiStrings.notFound.zh}</p>
      </div>
    );
  }

  const inv = invitationSummary(bundle.invitations);
  const meetingAgendaLocked = isMeetingClosedForVoting(meeting.status);
  const remoteWrittenV3NoticeStartedLock = remoteWrittenV3MeetingAgendaEditBlocked(meeting);
  const agendaStructureEditLocked = meetingAgendaLocked || remoteWrittenV3NoticeStartedLock;
  const openRatePct = inv.total ? Math.min(100, Math.round((inv.openedCount / inv.total) * 100)) : 0;
  const voteRatePct = inv.total ? Math.min(100, Math.round((inv.voted / inv.total) * 100)) : 0;

  function inviteTrackingStatusLabel(row: MeetingInvitationRow) {
    if (row.delivery_status === 'voted') return en ? 'Voted' : '已投票';
    if (row.opened_at) return en ? 'Opened' : '已打开';
    return en ? 'Not opened' : '未打开';
  }

  function inviteVoteResultLabel(v: MeetingInvitationRow['vote']) {
    if (!v) return '—';
    if (v === 'approve') return en ? 'Approve' : '赞成';
    if (v === 'reject') return en ? 'Reject' : '反对';
    return en ? 'Abstain' : '弃权';
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="border-b border-white/25 bg-clearstrata-hero text-white shadow-md shadow-clearstrata-ui-primary/25">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="inline-flex w-fit items-center gap-2 rounded-lg bg-white/25 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/45 hover:bg-white/35 transition-colors"
                >
                  {en ? 'Home' : '返回首页'}
                </button>
                <Link
                  to={backToListHref}
                  className="inline-flex w-fit items-center gap-2 rounded-lg bg-white/20 px-3 py-2 text-sm font-medium text-white ring-1 ring-white/35 hover:bg-white/30 transition-colors"
                >
                  <ArrowLeft size={18} />
                  {isVotingRoute ? (en ? 'Back to voting list' : '返回投票列表') : t('meeting_back_list')}
                </Link>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/90 mb-2 drop-shadow-sm">
                  {isVotingRoute ? (en ? 'Meeting voting' : '会议投票') : en ? 'Meeting details' : '会议详情'}
                </p>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-white/25 text-white ring-1 ring-white/40 shadow-sm">
                    {labelMeetingType(meeting.meeting_type, en)}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-white/25 text-white ring-1 ring-white/40 shadow-sm">
                    {labelMeetingFormatUiPrimary(meeting, en)}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug break-words">
                  {meetingTitleZhFirst(meeting) || (en ? meetingUiStrings.untitled.en : meetingUiStrings.untitled.zh)}
                </h1>
                <dl className="mt-4 space-y-2 text-sm text-white/95 border-t border-white/25 pt-4">
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    <dt className="text-white/75 shrink-0">{en ? 'Status' : '状态'}</dt>
                    <dd className="font-semibold text-white">{labelStatus(meeting.status, en)}</dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    <dt className="text-white/75 shrink-0">{en ? 'Time' : '时间'}</dt>
                    <dd>
                      {meeting.scheduled_at
                        ? new Date(meeting.scheduled_at).toLocaleString(en ? 'en-CA' : 'zh-CN', {
                            dateStyle: 'full',
                            timeStyle: 'short',
                          })
                        : en
                          ? 'Not scheduled'
                          : '未排期'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
            {canShowMeetingEditControl || canDeleteDraftMeeting ? (
              <div className="flex shrink-0 flex-col gap-2 self-start lg:mt-12">
                {canShowMeetingEditControl ? (
                  remoteWrittenV3NoticeStartedLock ? (
                    <span
                    className="rounded-lg bg-white/15 px-4 py-2.5 text-sm font-medium text-white/70 ring-1 ring-white/25 cursor-not-allowed shadow-sm"
                    title={en ? REMOTE_WRITTEN_V3_DETAIL_EDIT_LOCKED.en : REMOTE_WRITTEN_V3_DETAIL_EDIT_LOCKED.zh}
                  >
                    {en ? 'Edit meeting' : '编辑会议'}
                  </span>
                ) : (
                  <Link
                    to={`/meetings/${meeting.id}/edit?${new URLSearchParams({ propertyId: meeting.property_id }).toString()}`}
                    className="rounded-lg bg-white/22 px-4 py-2.5 text-sm font-medium text-white text-center ring-1 ring-white/40 hover:bg-white/34 transition-colors shadow-sm"
                  >
                    {en ? 'Edit meeting' : '编辑会议'}
                  </Link>
                  )
                ) : null}
                {canDeleteDraftMeeting ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDeleteDraftMeeting()}
                    className="rounded-lg border border-red-200/80 bg-red-500/25 px-4 py-2.5 text-sm font-medium text-white ring-1 ring-red-200/60 hover:bg-red-500/40 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {en ? 'Delete draft' : '删除草稿'}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-6 relative z-10">
        <div className="rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-8 shadow-[0_16px_50px_-12px_rgba(6,61,47,0.14)] space-y-8">
        {(inviteToast || evToast) ? (
          <div className="fixed bottom-6 left-1/2 z-50 flex max-w-lg w-[min(100%,28rem)] -translate-x-1/2 flex-col gap-2 px-4">
            {inviteToast ? (
              <StatusAlert
                tone={inviteToast.kind === 'success' ? 'success' : 'danger'}
                variant="solid"
                className="shadow-lg"
              >
                {inviteToast.text}
              </StatusAlert>
            ) : null}
            {evToast ? (
              <StatusAlert
                tone={evToast.kind === 'success' ? 'success' : 'danger'}
                variant="solid"
                className="shadow-lg"
              >
                {evToast.text}
              </StatusAlert>
            ) : null}
          </div>
        ) : null}
        {actionErr ? (
          <StatusAlert tone="danger" className="mb-4">
            {actionErr}
          </StatusAlert>
        ) : null}
        {extrasLoading ? (
          <p className="text-xs text-gray-500 mb-4">{en ? 'Loading agenda, votes, and invitations…' : '正在加载议程、投票与邀请…'}</p>
        ) : null}

        {/* Layer 1 — meeting core */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                {en ? meetingUiStrings.sectionInfo.en : meetingUiStrings.sectionInfo.zh}
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-gray-500">{en ? 'Description (EN)' : '说明（英）'}</dt>
                  <dd className="text-gray-900 whitespace-pre-wrap">{meeting.description_en || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">{en ? 'Description (ZH)' : '说明（中）'}</dt>
                  <dd className="text-gray-900 whitespace-pre-wrap">
                    {stripWrittenRemoteMeta(meeting.description_zh) || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">{t('meeting_initiation_type')}</dt>
                  <dd className="text-gray-900">
                    {governanceMeta
                      ? initiationTypeLabel(governanceMeta.initiation_type, t)
                      : t('meeting_initiation_council')}
                  </dd>
                </div>
                {governanceMeta?.initiation_type === 'owner_requisitioned' ? (
                  <div className="sm:col-span-2 rounded-lg border border-gray-100 bg-gray-50/90 p-4 space-y-2 text-sm">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <span className="text-gray-500">{t('meeting_total_voting_units')}: </span>
                        <span className="font-medium text-gray-900">{governanceMeta.total_voting_units ?? '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">{t('meeting_required_percent')}: </span>
                        <span className="font-medium text-gray-900">
                          {governanceMeta.required_percent ?? MEETING_SGM_REQUISITION_PERCENT_DEFAULT}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">{t('meeting_required_units')}: </span>
                        <span className="font-medium text-gray-900">
                          {governanceMeta.required_units ??
                            meetingSgmRequisitionRequiredUnits(
                              governanceMeta.total_voting_units ?? 0,
                              governanceMeta.required_percent ?? MEETING_SGM_REQUISITION_PERCENT_DEFAULT,
                            )}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">{t('meeting_signed_units')}: </span>
                        <span className="font-medium text-gray-900">{governanceMeta.signed_units ?? '—'}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <span className="text-gray-500">{en ? 'Status' : '状态'}: </span>
                      <span className="font-semibold text-gray-900">
                        {(governanceMeta.signed_units ?? 0) >=
                        (governanceMeta.required_units ??
                          meetingSgmRequisitionRequiredUnits(
                            governanceMeta.total_voting_units ?? 0,
                            governanceMeta.required_percent ?? MEETING_SGM_REQUISITION_PERCENT_DEFAULT,
                          ))
                          ? t('meeting_requisition_met')
                          : t('meeting_requisition_not_met')}
                      </span>
                    </div>
                  </div>
                ) : null}
                <div>
                  <dt className="text-gray-500">
                    {en ? 'Latest meeting notification email sent at' : '会议最新通知电子邮件发出时间'}
                  </dt>
                  <dd>{meeting.notice_sent_at ? new Date(meeting.notice_sent_at).toLocaleString() : '—'}</dd>
                </div>
              </dl>
        </section>

        {/* Layer 2 — agenda & voting */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                {en ? meetingUiStrings.sectionAgenda.en : meetingUiStrings.sectionAgenda.zh}
              </h2>
              {remoteWrittenV3NoticeStartedLock ? (
                <p className="mb-4 text-sm text-amber-800 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                  {en ? REMOTE_WRITTEN_V3_DETAIL_EDIT_LOCKED.en : REMOTE_WRITTEN_V3_DETAIL_EDIT_LOCKED.zh}
                </p>
              ) : meetingAgendaLocked ? (
                <p className="mb-4 text-sm text-amber-800 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                  {en ? 'This meeting has ended. The agenda is locked.' : '会议已结束，议程已锁定。'}
                </p>
              ) : null}
              {showCouncilOwnerVoteUi ? (
                <>
                  <OwnerVotingInlineControlBar
                    meeting={meeting}
                    isCouncilMeetingEnded={isMeetingClosedForVoting(meeting.status)}
                    isStaff={canManageCouncilMeetings}
                    userId={user?.id}
                    languageEn={en}
                    t={t}
                    onNavigateOwnerVoting={() => handleNavigateOwnerVotingForOwner()}
                    meta={ovMeta}
                    ovBusy={ovBusy}
                    canEnableBinding={
                      Boolean(councilMeetingTitleForOwnerVoteBinding(meeting).trim()) &&
                      !electionTimelineBlocksOwnerVote
                    }
                    electionNomRibbon={electionNomRibbonModel}
                    councilFormalResolutionAgendaCount={councilFormalResolutionAgendaCount}
                    electionAgendaCount={electionBundles.length}
                    viewerIsEligibleVoter={!!viewerOvUnitNo?.trim()}
                    onEnableElectronicVoting={() => void handleEnableElectronicVoting()}
                    onFreezeSnapshot={() => void handleFreezeOwnerVoteSnapshot()}
                    onOpenVoting={() => void handleOpenOwnerVoteMeeting()}
                    onCloseVoting={() => void handleCloseOwnerVoteMeeting()}
                  />
                  <MeetingVoteArchiveCard
                    languageEn={en}
                    meeting={meeting}
                    meetingId={String(meeting.id)}
                    canManageDocuments={canManageCouncilMeetings}
                    onSupportingDocumentsChanged={() => void refreshSupportingDocumentsArchive()}
                    ownerVoteMeeting={ovMeta.meeting}
                    resolutionAgendaCount={councilFormalResolutionAgendaCount}
                    electionAgendaCount={electionBundles.length}
                    supportingDocuments={supportingDocumentsArchive}
                  />
                </>
              ) : null}
              <div className="space-y-6">
                {bundle.agendaItems.map((agenda) => {
                  const agendaKindUi = agendaKindFromRow(agenda);
                  const vote = voteByAgendaId.get(agenda.id);
                  const legacyCouncilVoteUi =
                    !writtenRemoteV3Meeting &&
                    !showCouncilOwnerVoteUi &&
                    agendaKindUi !== 'election' &&
                    vote;
                  const ballots = legacyCouncilVoteUi ? bundle.ballotsByVoteId[vote!.id] ?? [] : [];
                  const tallies = legacyCouncilVoteUi ? ballotTallies(ballots) : {};
                  const my = legacyCouncilVoteUi ? bundle.myBallotsByVoteId[vote!.id] : undefined;
                  const descShowZh = displayAgendaZhWithoutElection(agenda.description_zh);
                  return (
                    <div key={agenda.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-gray-500">#{agenda.sort_order}</span>
                          {agendaEdit?.agendaId !== agenda.id && agendaKindUi === 'election' ? (
                            <StatusBadge tone="warning" size="sm">
                              {t('meeting_agenda_type_election')}
                            </StatusBadge>
                          ) : null}
                          {agendaEdit?.agendaId !== agenda.id && agendaKindUi === 'resolution' ? (
                            <StatusBadge tone="success" size="sm">
                              {t('meeting_agenda_type_resolution')}
                            </StatusBadge>
                          ) : null}
                          {agendaEdit?.agendaId !== agenda.id && agendaKindUi === 'normal' ? (
                            <StatusBadge tone="neutral" size="sm">
                              {t('meeting_agenda_type_normal')}
                            </StatusBadge>
                          ) : null}
                          {agendaEdit?.agendaId !== agenda.id &&
                          agendaKindUi === 'resolution' &&
                          agenda.vote_rule &&
                          !showCouncilOwnerVoteUi ? (
                            <StatusBadge tone="neutral" size="sm">
                              {labelVoteRule(agenda.vote_rule, en)}
                            </StatusBadge>
                          ) : null}
                        </div>
                        {canManageCouncilMeetings && !agendaStructureEditLocked && agendaEdit?.agendaId !== agenda.id ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              const k = agendaKindFromRow(agenda);
                              const peeledMeta = extractElectionAgendaMeta(agenda.description_zh ?? '').meta;
                              const fin = finalizeElectionMeta(peeledMeta ?? defaultElectionMeta());
                              const pairDef =
                                meeting && showCouncilOwnerVoteUi ? canonElectionNominationPairOrNull(meeting) : null;
                              setAgendaEdit({
                                agendaId: agenda.id,
                                title_zh: agenda.title_zh ?? '',
                                title_en: agenda.title_en ?? '',
                                kind: k,
                                vote_rule: (agenda.vote_rule ?? 'simple_majority') as VoteRule,
                                started_kind: k,
                                election_seats: fin.seats,
                                election_max_choices: fin.max_choices_per_unit,
                                election_allow_self_nomination: fin.allow_self_nomination,
                                election_nomination_opens_dl:
                                  toDatetimeLocalValue(fin.nomination_opens_at) ||
                                  (pairDef ? toDatetimeLocalValue(pairDef.opens) : ''),
                                election_nomination_closes_dl:
                                  toDatetimeLocalValue(fin.nomination_closes_at) ||
                                  (pairDef ? toDatetimeLocalValue(pairDef.closes) : ''),
                              });
                            }}
                            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-800 hover:bg-white disabled:opacity-50"
                          >
                            {t('meeting_agenda_edit')}
                          </button>
                        ) : null}
                      </div>
                      {agendaEdit?.agendaId === agenda.id && !agendaStructureEditLocked ? (
                        <div className="space-y-3 mt-1">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              value={agendaEdit.title_zh}
                              onChange={(e) => setAgendaEdit((prev) => (prev ? { ...prev, title_zh: e.target.value } : prev))}
                              placeholder={en ? 'Title (Chinese)' : '标题（中文）'}
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                            <input
                              value={agendaEdit.title_en}
                              onChange={(e) => setAgendaEdit((prev) => (prev ? { ...prev, title_en: e.target.value } : prev))}
                              placeholder={en ? 'Title (English)' : '标题（英文）'}
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                          </div>
                          <label className="block text-sm">
                            <span className="font-medium text-gray-800">{t('meeting_agenda_type')}</span>
                            <select
                              value={agendaEdit.kind}
                              disabled={busy}
                              onChange={(e) => {
                                const nk = e.target.value as AgendaKindUi;
                                setAgendaEdit((prev) => {
                                  if (!prev) return prev;
                                  if (!meeting || nk !== 'election') return { ...prev, kind: nk };
                                  const row = bundle.agendaItems.find((a) => a.id === prev.agendaId);
                                  const pairDef = canonElectionNominationPairOrNull(meeting);
                                  const peeled = extractElectionAgendaMeta(row?.description_zh ?? '').meta;
                                  const seed = peeled?.agenda_type === 'council_election' ? finalizeElectionMeta(peeled) : null;
                                  const fin = seed ?? defaultElectionMeta({});
                                  return {
                                    ...prev,
                                    kind: nk,
                                    election_seats: fin.seats,
                                    election_max_choices: fin.max_choices_per_unit,
                                    election_allow_self_nomination: fin.allow_self_nomination,
                                    election_nomination_opens_dl:
                                      (pairDef && toDatetimeLocalValue(pairDef.opens)) ||
                                      toDatetimeLocalValue(fin.nomination_opens_at) ||
                                      '',
                                    election_nomination_closes_dl:
                                      (pairDef && toDatetimeLocalValue(pairDef.closes)) ||
                                      toDatetimeLocalValue(fin.nomination_closes_at) ||
                                      '',
                                  };
                                });
                              }}
                              className="mt-1 w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            >
                              <option value="normal">{t('meeting_agenda_type_normal')}</option>
                              <option value="resolution">{t('meeting_agenda_type_resolution')}</option>
                              <option value="election">{t('meeting_agenda_type_election')}</option>
                            </select>
                          </label>
                          {agendaEdit.kind === 'resolution' ? (
                            <label className="block text-sm space-y-1">
                              <span className="font-medium text-gray-800">{en ? 'Vote threshold' : '表决门槛'}</span>
                              <select
                                value={agendaEdit.vote_rule}
                                disabled={busy}
                                onChange={(e) =>
                                  setAgendaEdit((prev) =>
                                    prev ? { ...prev, vote_rule: e.target.value as VoteRule } : prev,
                                  )
                                }
                                className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm"
                              >
                                <option value="simple_majority">{en ? 'Simple majority' : '普通多数'}</option>
                                <option value="three_quarter">{en ? 'Three-quarters' : '3/4 票'}</option>
                                <option value="unanimous">{en ? 'Unanimous' : '全票通过'}</option>
                              </select>
                            </label>
                          ) : null}
                          {agendaEdit.kind === 'election' ? (
                            <>
                              <div className="grid gap-3 sm:grid-cols-3">
                                <label className="block text-sm space-y-1">
                                  <span className="font-medium text-gray-800">{t('meeting_election_seats')}</span>
                                  <input
                                    type="number"
                                    min={1}
                                    disabled={busy || electionRulesLockedForAgendaEdit}
                                    value={agendaEdit.election_seats}
                                    onChange={(e) =>
                                      setAgendaEdit((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              election_seats: Math.max(1, Number(e.target.value) || 1),
                                            }
                                          : prev,
                                      )
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                  />
                                </label>
                                <label className="block text-sm space-y-1">
                                  <span className="font-medium text-gray-800">{t('meeting_election_max_choices')}</span>
                                  <input
                                    type="number"
                                    min={1}
                                    disabled={busy || electionRulesLockedForAgendaEdit}
                                    value={agendaEdit.election_max_choices}
                                    onChange={(e) =>
                                      setAgendaEdit((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              election_max_choices: Math.max(1, Number(e.target.value) || 1),
                                            }
                                          : prev,
                                      )
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                  />
                                </label>
                                <label className="flex items-center gap-2 text-sm sm:items-end pb-2">
                                  <input
                                    type="checkbox"
                                    disabled={busy}
                                    checked={agendaEdit.election_allow_self_nomination}
                                    onChange={(e) =>
                                      setAgendaEdit((prev) =>
                                        prev ? { ...prev, election_allow_self_nomination: e.target.checked } : prev,
                                      )
                                    }
                                  />
                                  {t('meeting_election_allow_self_nomination')}
                                </label>
                              </div>
                              {electionRulesLockedForAgendaEdit ? (
                                <p className="text-xs text-amber-800">{t('meeting_election_rules_locked')}</p>
                              ) : null}
                              <div className="rounded-lg border border-gray-100 bg-gray-50/90 px-3 py-3 text-xs text-gray-800 space-y-1">
                                <p className="font-medium text-gray-900">{t('meeting_election_auto_nomination_schedule_title')}</p>
                                <p>
                                  <span className="text-gray-600">{t('meeting_election_nomination_opens')}</span>:{' '}
                                  {(() => {
                                    const f = canonNominationFmt(meeting, en);
                                    return f?.opens ?? t('meeting_election_need_valid_scheduled');
                                  })()}
                                </p>
                                <p>
                                  <span className="text-gray-600">{t('meeting_election_nomination_closes')}</span>:{' '}
                                  {(() => {
                                    const f = canonNominationFmt(meeting, en);
                                    return f?.closes ?? t('meeting_election_need_valid_scheduled');
                                  })()}
                                </p>
                              </div>
                            </>
                          ) : null}
                          {actionErr ? (
                            <StatusAlert tone="danger" className="text-sm">
                              {actionErr}
                            </StatusAlert>
                          ) : null}
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handlePersistAgendaEdit()}
                              className="text-sm px-4 py-2 rounded-lg bg-clearstrata-ui-primary text-white hover:bg-clearstrata-ui-primaryHover disabled:opacity-50"
                            >
                              {t('meeting_agenda_save')}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleCancelAgendaEdit()}
                              className="text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                            >
                              {t('meeting_agenda_cancel')}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleDeleteAgendaItem()}
                              className="text-sm px-4 py-2 rounded-lg border border-red-200 text-red-800 hover:bg-red-50 disabled:opacity-50"
                            >
                              {t('action_delete')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3 className="font-medium text-gray-900">
                            {agenda.title_zh?.trim() ||
                              agenda.title_en ||
                              (en ? meetingUiStrings.untitled.en : meetingUiStrings.untitled.zh)}
                          </h3>
                          {(descShowZh || agenda.description_en) &&
                          !(showCouncilOwnerVoteUi && agendaKindUi === 'resolution') && (
                            <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                              {descShowZh || agenda.description_en}
                            </p>
                          )}

                          {agendaKindUi !== 'election' && agenda.requires_vote ? (
                            writtenRemoteV3Meeting ? (
                              <p className="mt-3 text-sm text-gray-700 rounded-md border border-blue-100 bg-blue-50/60 px-3 py-2">
                                {writtenRemoteV3ResolutionVotingCopy(en)}
                              </p>
                            ) : !vote ? (
                              canManageCouncilMeetings && !agendaStructureEditLocked ? (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleCreateVote(agenda)}
                                  className="mt-3 text-sm px-3 py-1.5 rounded-lg bg-clearstrata-ui-primary text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive disabled:opacity-50"
                                >
                                  {t('meeting_agenda_generate_formal_vote')}
                                </button>
                              ) : null
                            ) : (
                              <p className="mt-3 text-sm font-medium text-clearstrata-brand-800">
                                {t('meeting_agenda_formal_vote_created')}
                              </p>
                            )
                          ) : null}

                          {legacyCouncilVoteUi ? (
                            <div className="mt-4 space-y-3 border-t border-gray-200 pt-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-medium text-gray-700">{en ? 'Vote status' : '表决状态'}:</span>
                                <StatusBadge tone="neutral" size="sm">
                                  {labelVoteStatus(vote!.status, en)}
                                </StatusBadge>
                                <span className="text-xs text-gray-600">
                                  {en ? 'Vote rule' : '投票规则'}: {labelVoteRule(vote!.vote_rule, en)}
                                </span>
                              </div>

                              {canManageCouncilMeetings && !agendaStructureEditLocked && vote!.status === 'draft' && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleOpenVote(vote!.id)}
                                  className="text-sm px-3 py-1.5 rounded-lg bg-clearstrata-ui-primary text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive disabled:opacity-50"
                                >
                                  {en ? 'Open voting' : '开放投票'}
                                </button>
                              )}
                              {canManageCouncilMeetings && !agendaStructureEditLocked && vote!.status === 'open' && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleCloseVote(vote!.id)}
                                  className="text-sm px-3 py-1.5 rounded-lg bg-clearstrata-brand-700 text-white hover:bg-clearstrata-brand-800 active:bg-clearstrata-brand-900 disabled:opacity-50"
                                >
                                  {en ? 'Close voting' : '关闭投票'}
                                </button>
                              )}

                              {vote!.status === 'open' && !isMeetingClosedForVoting(meeting.status) ? (
                                <div className="space-y-2">
                                  <p className="text-sm text-gray-700">{en ? 'Cast your ballot' : '投票'}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {vote!.options.map((opt) => (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        disabled={busy}
                                        onClick={() => handleBallot(vote!.id, opt.option_key)}
                                        className={`px-3 py-2 rounded-lg border text-sm ${
                                          my?.selected_option_key === opt.option_key
                                            ? 'border-clearstrata-ui-primary bg-clearstrata-ui-primary/10 text-clearstrata-ui-softText'
                                            : 'border-gray-200 bg-white hover:border-clearstrata-ui-primary/40'
                                        }`}
                                      >
                                        {en ? opt.label_en || opt.option_key : opt.label_zh || opt.label_en || opt.option_key}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ) : vote!.status === 'open' && isMeetingClosedForVoting(meeting.status) ? (
                                <p className="text-sm text-amber-800 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                                  {en
                                    ? 'This meeting has ended. Voting is closed.'
                                    : '会议已结束，投票已关闭。'}
                                </p>
                              ) : null}

                              {(vote!.status === 'closed' ||
                                vote!.status === 'passed' ||
                                vote!.status === 'failed') && (
                                <div className="text-sm text-gray-800">
                                  <p className="font-medium mb-1">{en ? 'Results' : '结果汇总'}</p>
                                  <ul className="list-disc pl-5">
                                    {Object.entries(tallies).map(([k, n]) => (
                                      <li key={k}>
                                        {k}: {n}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ) : null}

                          {agendaKindUi === 'election' && propertyIdForAgenda ? (
                            <MeetingElectionCandidatesPanel
                              agenda={agenda}
                              propertyId={propertyIdForAgenda}
                              meetingId={meeting.id}
                              ownerVoteMeetingId={showCouncilOwnerVoteUi ? ovMeta.meeting?.id : null}
                              eligibleUnitNo={viewerOvUnitNo}
                              currentUserId={user?.id ?? null}
                              meetingCreatedBy={meeting.created_by ?? null}
                              governanceInitiationType={governanceMeta?.initiation_type ?? null}
                              canModerateCandidates={
                                governanceMeta?.initiation_type === 'owner_requisitioned'
                                  ? meeting.created_by === user?.id || canManageCouncilMeetings
                                  : canManageCouncilMeetings
                              }
                              resultsLocked={(electionBallotsByAgenda.get(agenda.id) ?? 0) > 0}
                              hasSubmittedElectionBallot={(() => {
                                const unit = viewerOvUnitNo?.trim().toLowerCase();
                                if (!unit) return false;
                                return ownerElectionBallots.some(
                                  (b) =>
                                    b.agenda_item_id === agenda.id &&
                                    String(b.unit_no ?? '').trim().toLowerCase() === unit,
                                );
                              })()}
                              submittedSelectedCandidateIds={(() => {
                                const unit = viewerOvUnitNo?.trim().toLowerCase();
                                if (!unit) return [];
                                const ballot = ownerElectionBallots.find(
                                  (b) =>
                                    b.agenda_item_id === agenda.id &&
                                    String(b.unit_no ?? '').trim().toLowerCase() === unit,
                                );
                                if (!ballot || !Array.isArray(ballot.selected_candidate_ids)) return [];
                                return ballot.selected_candidate_ids
                                  .filter((x): x is string => typeof x === 'string' && !!x.trim())
                                  .map((x) => x.trim());
                              })()}
                              ownerVoteMeetingStatus={ovMeta.meeting?.status ?? null}
                              canEdit={canManageCouncilMeetings && !agendaStructureEditLocked}
                              electionBallotCount={electionBallotsByAgenda.get(agenda.id) ?? 0}
                              languageEn={en}
                              t={t}
                              councilElectionMeeting={meeting}
                              onUpdated={async () => {
                                await load();
                                await refreshOwnerVoteMeta();
                              }}
                            />
                          ) : null}
                        </>
                      )}
                    </div>
                  );
                })}
                {bundle.agendaItems.length === 0 && (
                  <p className="text-gray-600 text-sm">
                    {en ? 'No agenda items yet. Add items below when you have access.' : '暂无议程。有权限时可在下方添加。'}
                  </p>
                )}

                {canManageCouncilMeetings && propertyIdForAgenda && !agendaStructureEditLocked && (
                  <form onSubmit={handleAddAgenda} className="mt-6 border border-dashed border-gray-300 rounded-lg p-4 space-y-3 bg-white">
                    <p className="text-sm font-medium text-gray-800">{en ? 'Add agenda item' : '添加议程'}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        value={newAgendaZh}
                        onChange={(e) => setNewAgendaZh(e.target.value)}
                        placeholder={en ? 'Title (Chinese)' : '标题（中文）'}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <input
                        value={newAgendaEn}
                        onChange={(e) => setNewAgendaEn(e.target.value)}
                        placeholder={en ? 'Title (English)' : '标题（英文）'}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <label className="block text-sm space-y-1">
                      <span className="font-medium text-gray-800">{t('meeting_agenda_type')}</span>
                      <select
                        value={newAgendaKind}
                        disabled={busy}
                        onChange={(e) => setNewAgendaKind(e.target.value as AgendaKindUi)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="normal">{t('meeting_agenda_type_normal')}</option>
                        <option value="resolution">{t('meeting_agenda_type_resolution')}</option>
                        <option value="election">{t('meeting_agenda_type_election')}</option>
                      </select>
                    </label>
                    {newAgendaKind === 'resolution' && (
                      <label className="block text-sm space-y-1">
                        <span className="font-medium text-gray-800">{en ? 'Vote threshold' : '表决门槛'}</span>
                        <select
                          value={newVoteRule}
                          disabled={busy}
                          onChange={(e) => setNewVoteRule(e.target.value as typeof newVoteRule)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        >
                          <option value="simple_majority">{en ? 'Simple majority' : '普通多数'}</option>
                          <option value="three_quarter">{en ? 'Three-quarters' : '3/4 票'}</option>
                          <option value="unanimous">{en ? 'Unanimous' : '全票通过'}</option>
                        </select>
                      </label>
                    )}
                    {newAgendaKind === 'election' && (
                      <>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <label className="block text-sm space-y-1">
                            <span className="font-medium text-gray-800">{t('meeting_election_seats')}</span>
                            <input
                              type="number"
                              min={1}
                              disabled={busy}
                              value={newElectionSeats}
                              onChange={(e) => setNewElectionSeats(Number(e.target.value) || 1)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                          </label>
                          <label className="block text-sm space-y-1">
                            <span className="font-medium text-gray-800">{t('meeting_election_max_choices')}</span>
                            <input
                              type="number"
                              min={1}
                              disabled={busy}
                              value={newElectionMaxChoices}
                              onChange={(e) => setNewElectionMaxChoices(Number(e.target.value) || 1)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-sm sm:items-end pb-2">
                            <input
                              type="checkbox"
                              checked={newElectionSelfNom}
                              disabled={busy}
                              onChange={(e) => setNewElectionSelfNom(e.target.checked)}
                            />
                            {t('meeting_election_allow_self_nomination')}
                          </label>
                        </div>
                        <div className="rounded-lg border border-gray-100 bg-gray-50/90 px-3 py-3 text-xs text-gray-800 space-y-1">
                          <p className="font-medium text-gray-900">{t('meeting_election_auto_nomination_schedule_title')}</p>
                          <p>
                            <span className="text-gray-600">{t('meeting_election_nomination_opens')}</span>:{' '}
                            {canonNominationFmt(meeting, en)?.opens ?? t('meeting_election_need_valid_scheduled')}
                          </p>
                          <p>
                            <span className="text-gray-600">{t('meeting_election_nomination_closes')}</span>:{' '}
                            {canonNominationFmt(meeting, en)?.closes ?? t('meeting_election_need_valid_scheduled')}
                          </p>
                        </div>
                      </>
                    )}
                    <button type="submit" disabled={busy} className="text-sm px-4 py-2 rounded-lg bg-gray-900 text-white disabled:opacity-50">
                      {en ? 'Add' : '添加'}
                    </button>
                  </form>
                )}
              </div>
        </section>

        {/* Layer 3 — formal owner-vote resolution results (before invitations) */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b pb-2">
            <h2 className="text-lg font-semibold text-gray-900">
              {showCouncilOwnerVoteUi ? t('meeting_resolution_results_title') : en ? 'Resolutions' : '决议'}
            </h2>
            {showCouncilOwnerVoteUi ? (
              <button
                type="button"
                disabled={ovMeta.loading || ovBusy}
                onClick={() => void refreshOwnerVoteMeta()}
                className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw size={16} className={ovMeta.loading ? 'animate-spin shrink-0' : 'shrink-0'} />
                {t('meeting_resolution_refresh_results')}
              </button>
            ) : null}
          </div>
          {showCouncilOwnerVoteUi ? (
            <>
              {ovMeta.loading ? <p className="text-sm text-gray-500">{t('meeting_ov_loading')}</p> : null}
              {!ovMeta.loading && !ovMeta.meeting ? (
                <p className="text-sm text-gray-600">
                  {writtenRemoteV3Meeting
                    ? writtenRemoteV3AutoParticipationCopy(en)
                    : t('meeting_vote_not_enabled')}
                </p>
              ) : null}
              {showVoteWaitingResultsBanner ? (
                <p className="text-sm text-gray-700 mb-3">{t('meeting_vote_waiting_tallies_open')}</p>
              ) : null}
              {!ovMeta.loading && ovMeta.meeting && ovMeta.resolutions.length === 0 && electionBundles.length === 0 ? (
                <p className="text-sm text-gray-600">{t('meeting_vote_no_resolutions')}</p>
              ) : null}
              {!ovMeta.loading && ovMeta.resolutions.length > 0 ? (
                <MeetingOwnerVoteResolutionResults
                  loading={false}
                  ownerVoteMeeting={ovMeta.meeting}
                  resolutions={ovMeta.resolutions}
                  resultRows={ovResolutionResults}
                  eligibleFallback={ovMeta.eligibleCount}
                  t={t}
                  languageEn={en}
                />
              ) : null}
              {!ovMeta.loading && ovMeta.meeting && electionBundles.length > 0 ? (
                <CouncilElectionResultsBlock
                  ownerVoteStatus={ovMeta.meeting.status ?? ''}
                  eligibleFallback={ovMeta.eligibleCount}
                  electionAgendas={electionBundles}
                  ballots={ownerElectionBallots}
                  languageEn={en}
                  t={t}
                  resultsFinalized={(() => {
                    /**
                     * Bug 3: only mark winners as "Elected" once voting is
                     * truly over. V3 has no manual "close" step — the 14-day
                     * canonical close is authoritative. Legacy flows rely on
                     * `owner_vote_meetings.status` flipping to `closed`/
                     * `archived`.
                     */
                    if (meeting && isWrittenRemoteV3Meeting(meeting)) {
                      const v3 = deriveRemoteWrittenV3CanonFromScheduledAt(meeting.scheduled_at);
                      const closeMs = v3?.votingCloseIso ? Date.parse(v3.votingCloseIso) : NaN;
                      if (!Number.isNaN(closeMs) && Date.now() >= closeMs) return true;
                    }
                    const st = (ovMeta.meeting?.status ?? '').trim().toLowerCase();
                    return st === 'closed' || st === 'archived';
                  })()}
                />
              ) : null}
            </>
          ) : bundle.resolutions.length === 0 ? (
            <p className="text-sm text-gray-600">
              {en ? 'No resolutions recorded yet.' : '暂无决议记录。'}
            </p>
          ) : (
            <ul className="space-y-3 text-sm">
              {bundle.resolutions.map((r) => (
                <li key={r.id} className="border-l-4 border-clearstrata-ui-primary pl-3">
                  <p className="text-gray-900">{r.resolution_text}</p>
                  <p className="text-gray-500 mt-1">
                    {en ? 'Outcome' : '结果'}: {r.outcome}
                    {r.followup_required ? (en ? ' · Follow-up' : ' · 需跟进') : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Layer 4 — invitations */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2">
              <Mail size={18} />
              {en ? meetingUiStrings.sectionInvite.en : meetingUiStrings.sectionInvite.zh}
            </h2>
            {bundle.invitations.length === 0 ? (
              <p className="text-sm text-gray-600 mb-4">
                {en
                  ? 'No invitations recorded for this meeting yet. Summary below will update when invites exist.'
                  : '暂无邀请记录。有邀请后下方统计会更新。'}
              </p>
            ) : null}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-sm mb-4">
              <div>
                <p className="text-gray-500">{en ? 'Total' : '邀请数'}</p>
                <p className="text-xl font-semibold">{inv.total}</p>
              </div>
              <div>
                <p className="text-gray-500">{en ? 'Sent' : '已发送'}</p>
                <p className="text-xl font-semibold">{inv.sent}</p>
              </div>
              <div>
                <p className="text-gray-500">{en ? 'Opened' : '已打开'}</p>
                <p className="text-xl font-semibold">{inv.opened}</p>
              </div>
              <div>
                <p className="text-gray-500">{en ? 'Voted' : '已投票'}</p>
                <p className="text-xl font-semibold">{inv.voted}</p>
              </div>
              <div>
                <p className="text-gray-500">{en ? 'Failed' : '失败'}</p>
                <p className="text-xl font-semibold text-red-700">{inv.failed}</p>
              </div>
            </div>

            {bundle.invitations.length > 0 ? (
              <div className="mb-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  {en ? 'Invitation tracking' : '邀请明细'}
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{en ? 'Open rate' : '打开率'}</span>
                      <span>
                        {inv.openedCount}/{inv.total} · {openRatePct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-clearstrata-ui-primaryHover rounded-full transition-all"
                        style={{ width: `${openRatePct}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{en ? 'Vote rate' : '投票率'}</span>
                      <span>
                        {inv.voted}/{inv.total} · {voteRatePct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-clearstrata-ui-primary rounded-full transition-all"
                        style={{ width: `${voteRatePct}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-3 py-2 font-medium">{en ? 'Owner' : '业主'}</th>
                        <th className="px-3 py-2 font-medium">{en ? 'Email' : '邮箱'}</th>
                        <th className="px-3 py-2 font-medium">{en ? 'Status' : '状态'}</th>
                        <th className="px-3 py-2 font-medium whitespace-nowrap">{en ? 'Opened at' : '打开时间'}</th>
                        <th className="px-3 py-2 font-medium">{en ? 'Vote' : '投票结果'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {bundle.invitations.map((row) => {
                        const prof = inviteProfileById[row.recipient_user_id];
                        const ownerName = en
                          ? prof?.full_name_en || prof?.full_name_zh || '—'
                          : prof?.full_name_zh || prof?.full_name_en || '—';
                        const email = row.email ?? prof?.email ?? '—';
                        return (
                          <tr key={row.id} className="bg-white">
                            <td className="px-3 py-2 text-gray-900">{ownerName}</td>
                            <td className="px-3 py-2 text-gray-700 break-all max-w-[200px]">{email}</td>
                            <td className="px-3 py-2 text-gray-800">{inviteTrackingStatusLabel(row)}</td>
                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                              {row.opened_at ? new Date(row.opened_at).toLocaleString(en ? 'en-CA' : 'zh-CN') : '—'}
                            </td>
                            <td className="px-3 py-2 text-gray-800">{inviteVoteResultLabel(row.vote)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {canSendMeetingInvites && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSendInvites}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-clearstrata-ui-primary text-white text-sm hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive disabled:opacity-50"
                >
                  <Users size={16} />
                  {t('meeting_vote_send_meeting_vote_invites')}
                </button>
                {inv.failed > 0 && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleRetryFailedInvites}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    <RefreshCw size={16} />
                    {en ? 'Reset failed → pending' : '失败标为待重发'}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
        </div>
      </div>
    </div>
  );
}
