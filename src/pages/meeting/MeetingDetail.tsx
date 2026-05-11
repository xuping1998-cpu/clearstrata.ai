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
  updateMeetingAgendaItem,
  updateVote,
  type VoteRule,
  type MeetingAgendaRow,
  type MeetingDetailBundle,
  type MeetingInvitationRow,
  type MeetingVoteOptionRow,
  type MeetingVoteRow,
  type MeetingRow,
  type OwnerVoteMeetingLite,
  type OwnerVoteResolutionResultNormalized,
} from '../../features/meetings/api';
import { supabase } from '../../lib/supabase';
import { shouldDeferAutoPropertyRedirects } from '../../lib/authRecovery';
import { samePropertyId } from '../../lib/propertyIdMatch';
import { canManagePropertyMeetings } from '@/lib/meetingPermissions';
import { labelFormat, labelMeetingType, labelStatus, labelVoteRule, labelVoteStatus, meetingUiStrings } from '../../features/meetings/labels';
import {
  addDaysIso,
  councilMeetingTitleForOwnerVoteBinding,
  findOwnerVoteResolutionForAgenda,
  isOwnerVotingMeeting,
} from '@/features/meetings/ownerVotingCouncil';
import {
  buildElectionNominationRibbon,
  defaultElectionMeta,
  displayAgendaZhWithoutElection,
  embedElectionAgendaMeta,
  extractElectionAgendaMeta,
  finalizeElectionMeta,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '@/features/meetings/electionAgendaModel';
import {
  CouncilElectionResultsBlock,
  type OwnerElectionBallotLite,
} from '@/components/meetings/CouncilElectionResultsBlock';
import { MeetingElectionCandidatesPanel } from '@/components/meetings/MeetingElectionCandidatesPanel';
import {
  councilMeetingVotingWindowFallback,
  councilWrittenRemoteWindows,
  extractGovernanceMeta,
  meetingSgmRequisitionRequiredUnits,
  MEETING_SGM_REQUISITION_PERCENT_DEFAULT,
  stripWrittenRemoteMeta,
  type MeetingInitiationType,
} from '@/features/meetings/meetingFormatModel';
import { OwnerVotingInlineControlBar } from '@/components/meetings/OwnerVotingInlineControlBar';
import { MeetingOwnerVoteResolutionResults } from '@/components/meetings/MeetingOwnerVoteResolutionResults';
import { StatusAlert, StatusBadge } from '@/components/status';

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

function defaultElectionNominationIsoPair(meeting: MeetingRow, ov: OwnerVoteMeetingLite | null): { opens: string; closes: string } {
  const nowIso = new Date().toISOString();
  const disc = councilWrittenRemoteWindows(meeting);
  const vf = councilMeetingVotingWindowFallback(meeting);
  const opens = disc.discussionOpens?.trim() || meeting.scheduled_at?.trim() || nowIso;
  const voOv = ov?.voting_opens_at?.trim() || '';
  const voFb = vf.votingOpens?.trim() || '';
  const closes = voOv || voFb || addDaysIso(nowIso, 7);
  return { opens, closes };
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
  const { user } = useAuth();
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
  const [newElectionNomOpensDl, setNewElectionNomOpensDl] = useState('');
  const [newElectionNomClosesDl, setNewElectionNomClosesDl] = useState('');
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
  const prevNewAgendaKindRef = useRef<AgendaKindUi>('normal');

  const canManageCouncilMeetings = canManagePropertyMeetings(roleInProperty);

  useEffect(() => {
    if (!propertyReady || !meetingId) return;
    if (!location.pathname.startsWith('/meetings/')) return;
    if (canManageCouncilMeetings) return;
    navigate(`/voting/${encodeURIComponent(meetingId)}${location.search}${location.hash}`, { replace: true });
  }, [propertyReady, meetingId, location.pathname, location.search, location.hash, navigate, canManageCouncilMeetings]);

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

  const showCouncilOwnerVoteUi = !!(meeting && currentPropertyId && isOwnerVotingMeeting(meeting));

  const governanceMeta = useMemo(() => {
    if (!meeting?.description_zh) return null;
    return extractGovernanceMeta(meeting.description_zh).meta;
  }, [meeting?.description_zh]);

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

  const electionNomRibbonModel = useMemo(
    () => buildElectionNominationRibbon(electionBundles.map((e) => e.meta)),
    [electionBundles],
  );

  const councilFormalResolutionAgendaCount = useMemo(() => {
    let n = 0;
    for (const a of bundle.agendaItems) {
      if (agendaKindFromRow(a) === 'resolution') n++;
    }
    return n;
  }, [bundle.agendaItems]);

  const handleNavigateOwnerVotingForOwner = useCallback(() => {
    const gate = evaluateOwnerVoteOwnerNavigationGate({
      ov: ovMeta.meeting,
      eligibleCount: ovMeta.eligibleCount,
      resolutionCount: ovMeta.resolutionCount,
      electionAgendaCount: electionBundles.length,
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
    navigate('/owner-voting');
  }, [ovMeta.meeting, ovMeta.eligibleCount, ovMeta.resolutionCount, electionBundles.length, en, t, navigate]);

  const showVoteWaitingResultsBanner =
    showCouncilOwnerVoteUi &&
    !ovMeta.loading &&
    !!ovMeta.meeting &&
    (ovMeta.resolutions.length > 0 || electionBundles.length > 0) &&
    (ovMeta.meeting.status?.trim().toLowerCase() ?? '') === 'open' &&
    !ovResolutionResults.some((r) => (r.total_cast ?? 0) > 0) &&
    ownerElectionBallots.length === 0;

  useEffect(() => {
    const was = prevNewAgendaKindRef.current;
    prevNewAgendaKindRef.current = newAgendaKind;
    if (!meeting || newAgendaKind !== 'election') return;
    if (was === 'election') return;
    const pair = defaultElectionNominationIsoPair(meeting, ovMeta.meeting);
    setNewElectionNomOpensDl(toDatetimeLocalValue(pair.opens));
    setNewElectionNomClosesDl(toDatetimeLocalValue(pair.closes));
  }, [newAgendaKind, meeting, ovMeta.meeting]);

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
        .select('agenda_item_id, selected_candidate_ids')
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
    const base = location.pathname.startsWith('/voting') ? '/voting' : '/meetings';
    if (pid) return `${base}?${new URLSearchParams({ propertyId: pid }).toString()}`;
    return base;
  }, [location.pathname, location.search, searchParams, currentPropertyId, meeting?.property_id]);

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

  async function handleCreateVote(agenda: MeetingAgendaRow) {
    if (!meeting || !user) return;
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
      const pairFallback = defaultElectionNominationIsoPair(meeting, ovMeta.meeting);
      const nomination_opens_at = fromDatetimeLocalValue(newElectionNomOpensDl) ?? pairFallback.opens;
      const nomination_closes_at = fromDatetimeLocalValue(newElectionNomClosesDl) ?? pairFallback.closes;
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
        const { error: resErr } = await supabase.from('owner_vote_resolutions').insert({
          meeting_id: ensured.id,
          title: resTitle,
          description: null,
          threshold: mapVoteRuleToOwnerVoteThreshold(savedVoteRule),
          display_order: nextOrder,
        });
        if (resErr) {
          console.error('[MeetingDetail] owner_vote_resolutions insert', resErr);
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

    let descriptionZh: string | null | undefined = row.description_zh;
    if (nextKind === 'election') {
      const upgradingToElectionFromNonElection = startedKind !== 'election';

      if (upgradingToElectionFromNonElection) {
        const pairFallback = defaultElectionNominationIsoPair(meeting, ovMeta.meeting);
        const nomination_opens_at =
          fromDatetimeLocalValue(agendaEdit.election_nomination_opens_dl) ?? pairFallback.opens;
        const nomination_closes_at =
          fromDatetimeLocalValue(agendaEdit.election_nomination_closes_dl) ?? pairFallback.closes;
        descriptionZh = embedElectionAgendaMeta(
          peeled || null,
          defaultElectionMeta({
            seats: 7,
            max_choices_per_unit: 7,
            allow_self_nomination: true,
            nomination_opens_at,
            nomination_closes_at,
          }),
        );
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

        const nomOpensIso = fromDatetimeLocalValue(agendaEdit.election_nomination_opens_dl);
        const nomClosesIso = fromDatetimeLocalValue(agendaEdit.election_nomination_closes_dl);

        const merged = {
          ...base,
          seats: nextSeats,
          max_choices_per_unit: nextMax,
          allow_self_nomination: agendaEdit.election_allow_self_nomination,
          candidates: [...base.candidates],
          nomination_opens_at: nomOpensIso ?? base.nomination_opens_at,
          nomination_closes_at: nomClosesIso ?? base.nomination_closes_at,
        };
        descriptionZh = embedElectionAgendaMeta(peeled || null, merged);
      }
    } else {
      descriptionZh = peeled.trim() ? peeled : null;
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
          const { error: insErr } = await supabase.from('owner_vote_resolutions').insert({
            meeting_id: ensured.id,
            title: titleForRes,
            description: null,
            threshold: mapVoteRuleToOwnerVoteThreshold(agendaEdit.vote_rule),
            display_order: row.sort_order,
          });
          if (insErr) console.error('[MeetingDetail] owner_vote_resolutions insert (edit)', insErr);
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
    const { error } = await resetFailedInvitations(meeting.id, meeting.property_id);
    if (error) setActionErr(error.message);
    setBusy(false);
    await load();
  }

  async function handleEnableElectronicVoting() {
    if (!meeting || !user?.id || !currentPropertyId) return;
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
    const ov = ovMeta.meeting;
    if (!ov?.id) return;
    const gate = evaluateOwnerVoteOpenGate({
      ov,
      eligibleCount: ovMeta.eligibleCount,
      resolutionCount: ovMeta.resolutionCount,
      electionAgendaCount: electionBundles.length,
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
              <Link
                to={backToListHref}
                className="inline-flex w-fit items-center gap-2 rounded-lg bg-white/20 px-3 py-2 text-sm font-medium text-white ring-1 ring-white/35 hover:bg-white/30 transition-colors"
              >
                <ArrowLeft size={18} />
                {isVotingRoute ? (en ? 'Back to voting list' : '返回投票列表') : t('meeting_back_list')}
              </Link>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/90 mb-2 drop-shadow-sm">
                  {isVotingRoute ? (en ? 'Meeting voting' : '会议投票') : en ? 'Meeting details' : '会议详情'}
                </p>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-white/25 text-white ring-1 ring-white/40 shadow-sm">
                    {labelMeetingType(meeting.meeting_type, en)}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-white/25 text-white ring-1 ring-white/40 shadow-sm">
                    {labelFormat(meeting.meeting_format, en, { descriptionZh: meeting.description_zh })}
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
            {canManageCouncilMeetings && (
              <Link
                to={`/meetings/${meeting.id}/edit?${new URLSearchParams({ propertyId: meeting.property_id }).toString()}`}
                className="shrink-0 self-start rounded-lg bg-white/22 px-4 py-2.5 text-sm font-medium text-white ring-1 ring-white/40 hover:bg-white/34 transition-colors lg:mt-12 shadow-sm"
              >
                {en ? 'Edit meeting' : '编辑会议'}
              </Link>
            )}
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
                  <dt className="text-gray-500">{en ? meetingUiStrings.format.en : meetingUiStrings.format.zh}</dt>
                  <dd>{labelFormat(meeting.meeting_format, en, { descriptionZh: meeting.description_zh })}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">{en ? 'Notice sent' : '通知发出时间'}</dt>
                  <dd>{meeting.notice_sent_at ? new Date(meeting.notice_sent_at).toLocaleString() : '—'}</dd>
                </div>
              </dl>
        </section>

        {/* Layer 2 — agenda & voting */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                {en ? meetingUiStrings.sectionAgenda.en : meetingUiStrings.sectionAgenda.zh}
              </h2>
              {showCouncilOwnerVoteUi ? (
                <OwnerVotingInlineControlBar
                  meeting={meeting}
                  isStaff={canManageCouncilMeetings}
                  userId={user?.id}
                  languageEn={en}
                  t={t}
                  onNavigateOwnerVoting={() => handleNavigateOwnerVotingForOwner()}
                  meta={ovMeta}
                  ovBusy={ovBusy}
                  canEnableBinding={Boolean(councilMeetingTitleForOwnerVoteBinding(meeting).trim())}
                  electionNomRibbon={electionNomRibbonModel}
                  councilFormalResolutionAgendaCount={councilFormalResolutionAgendaCount}
                  electionAgendaCount={electionBundles.length}
                  onEnableElectronicVoting={() => void handleEnableElectronicVoting()}
                  onFreezeSnapshot={() => void handleFreezeOwnerVoteSnapshot()}
                  onOpenVoting={() => void handleOpenOwnerVoteMeeting()}
                  onCloseVoting={() => void handleCloseOwnerVoteMeeting()}
                />
              ) : null}
              <div className="space-y-6">
                {bundle.agendaItems.map((agenda) => {
                  const agendaKindUi = agendaKindFromRow(agenda);
                  const vote = voteByAgendaId.get(agenda.id);
                  const legacyCouncilVoteUi =
                    !showCouncilOwnerVoteUi && agendaKindUi !== 'election' && vote;
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
                        {canManageCouncilMeetings && agendaEdit?.agendaId !== agenda.id ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              const k = agendaKindFromRow(agenda);
                              const peeledMeta = extractElectionAgendaMeta(agenda.description_zh ?? '').meta;
                              const fin = finalizeElectionMeta(peeledMeta ?? defaultElectionMeta());
                              const pairDef =
                                meeting && showCouncilOwnerVoteUi
                                  ? defaultElectionNominationIsoPair(meeting, ovMeta.meeting)
                                  : null;
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
                      {agendaEdit?.agendaId === agenda.id ? (
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
                                  const pairDef = defaultElectionNominationIsoPair(meeting, ovMeta.meeting);
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
                                      toDatetimeLocalValue(fin.nomination_opens_at) ||
                                      toDatetimeLocalValue(pairDef.opens),
                                    election_nomination_closes_dl:
                                      toDatetimeLocalValue(fin.nomination_closes_at) ||
                                      toDatetimeLocalValue(pairDef.closes),
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
                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block text-sm space-y-1">
                                  <span className="font-medium text-gray-800">{t('meeting_election_nomination_opens')}</span>
                                  <input
                                    type="datetime-local"
                                    disabled={busy}
                                    value={agendaEdit.election_nomination_opens_dl}
                                    onChange={(e) =>
                                      setAgendaEdit((prev) =>
                                        prev ? { ...prev, election_nomination_opens_dl: e.target.value } : prev,
                                      )
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                  />
                                </label>
                                <label className="block text-sm space-y-1">
                                  <span className="font-medium text-gray-800">{t('meeting_election_nomination_closes')}</span>
                                  <input
                                    type="datetime-local"
                                    disabled={busy}
                                    value={agendaEdit.election_nomination_closes_dl}
                                    onChange={(e) =>
                                      setAgendaEdit((prev) =>
                                        prev ? { ...prev, election_nomination_closes_dl: e.target.value } : prev,
                                      )
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                  />
                                </label>
                              </div>
                            </>
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
                              onClick={() => setAgendaEdit(null)}
                              className="text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                            >
                              {t('meeting_agenda_cancel')}
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
                            !vote ? (
                              canManageCouncilMeetings ? (
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

                              {canManageCouncilMeetings && vote!.status === 'draft' && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleOpenVote(vote!.id)}
                                  className="text-sm px-3 py-1.5 rounded-lg bg-clearstrata-ui-primary text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive disabled:opacity-50"
                                >
                                  {en ? 'Open voting' : '开放投票'}
                                </button>
                              )}
                              {canManageCouncilMeetings && vote!.status === 'open' && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleCloseVote(vote!.id)}
                                  className="text-sm px-3 py-1.5 rounded-lg bg-clearstrata-brand-700 text-white hover:bg-clearstrata-brand-800 active:bg-clearstrata-brand-900 disabled:opacity-50"
                                >
                                  {en ? 'Close voting' : '关闭投票'}
                                </button>
                              )}

                              {vote!.status === 'open' && (
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
                              )}

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
                              canEdit={canManageCouncilMeetings}
                              electionBallotCount={electionBallotsByAgenda.get(agenda.id) ?? 0}
                              languageEn={en}
                              t={t}
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

                {canManageCouncilMeetings && propertyIdForAgenda && (
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
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block text-sm space-y-1">
                            <span className="font-medium text-gray-800">{t('meeting_election_nomination_opens')}</span>
                            <input
                              type="datetime-local"
                              disabled={busy}
                              value={newElectionNomOpensDl}
                              onChange={(e) => setNewElectionNomOpensDl(e.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                          </label>
                          <label className="block text-sm space-y-1">
                            <span className="font-medium text-gray-800">{t('meeting_election_nomination_closes')}</span>
                            <input
                              type="datetime-local"
                              disabled={busy}
                              value={newElectionNomClosesDl}
                              onChange={(e) => setNewElectionNomClosesDl(e.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                          </label>
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
                <p className="text-sm text-gray-600">{t('meeting_vote_not_enabled')}</p>
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

            {canManageCouncilMeetings && (
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
