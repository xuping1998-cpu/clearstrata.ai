import { useMemo, useState } from 'react';
import type { MeetingAgendaRow } from '@/features/meetings/api';
import { updateMeetingAgendaItem } from '@/features/meetings/api';
import type { MeetingRow } from '@/features/meetings/api';
import {
  embedElectionAgendaMeta,
  extractElectionAgendaMeta,
  finalizeElectionMeta,
  displayAgendaZhWithoutElection,
  formatElectionNominationUiStatus,
  getElectionNominationStatus,
  isFormalElectionVotingAllowed,
  councilAgmSgmNominationWindowDisplayIso,
  agmSgmScheduledNotSetLabel,
  type ElectionAgendaMetaV1,
  type ElectionCandidateDraft,
  type ElectionNominationUiStatus,
} from '@/features/meetings/electionAgendaModel';
import { deriveRemoteWrittenV3CanonFromScheduledAt } from '@/features/meetings/electionTimelineMath';
import { isWrittenRemoteV3Meeting } from '@/features/meetings/meetingFormatModel';
import { supabase } from '@/lib/supabase';

export type MeetingElectionCandidatesPanelProps = {
  agenda: MeetingAgendaRow;
  propertyId: string;
  /** Council `meetings.id` — used when staff updates `meeting_agenda_items`. */
  meetingId: string;
  /** Owner Vote `owner_vote_meetings.id`, required for owner nomination / governance RPCs. */
  ownerVoteMeetingId?: string | null;
  /** Snapshot `unit_no` for the viewer (owner). */
  eligibleUnitNo?: string | null;
  currentUserId?: string | null;
  meetingCreatedBy?: string | null;
  governanceInitiationType?: string | null;
  canModerateCandidates?: boolean;
  resultsLocked?: boolean;
  hasSubmittedElectionBallot?: boolean;
  submittedSelectedCandidateIds?: string[];
  ownerVoteMeetingStatus?: string | null;
  canEdit: boolean;
  electionBallotCount: number;
  languageEn: boolean;
  t: (key: string) => string;
  /** Council meeting row (AGM/SGM) — drives nomination phase from auto 7+7+7 schedule. */
  councilElectionMeeting?: MeetingRow | null;
  onUpdated: () => void | Promise<void>;
};

type RpcPayload = { ok?: boolean; error?: string } | null;

function newCandidateId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function fmtTs(iso: string | undefined | null, languageEn: boolean): string {
  const t = iso?.trim();
  if (!t) return '—';
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(languageEn ? 'en-CA' : 'zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
}

function rpcErrorCode(payload: RpcPayload, thrown?: unknown): string {
  if (payload && typeof payload === 'object' && payload.ok === false) {
    return String(payload.error ?? '').toLowerCase();
  }
  const raw = thrown instanceof Error ? thrown.message : String(thrown ?? '');
  return raw.toLowerCase();
}

function nominationErrorAlert(code: string, en: boolean, t: (key: string) => string): void {
  switch (code) {
    case 'duplicate_candidate':
      alert(en ? 'This candidate or unit has already been nominated.' : '该候选人或房号已被提名');
      break;
    case 'ballots_exist_locked':
      alert(en ? 'Ballots exist; the candidate list is locked.' : '已有投票，候选名单已锁定');
      break;
    case 'nomination_not_open':
    case 'nomination_not_started':
      alert(t('meeting_election_nomination_not_open_owner'));
      break;
    case 'nomination_closed':
      alert(t('meeting_election_self_nomination_closed'));
      break;
    case 'not_eligible_to_vote':
      alert(en ? 'You are not an eligible voter for this meeting.' : '您不是本次会议的合资格投票人');
      break;
    case 'council_meeting_not_found':
      alert(en ? 'Linked council meeting not found. Please contact an administrator.' : '未找到关联会议，请联系管理员');
      break;
    default:
      alert(code || (en ? 'Nomination failed' : '提名失败'));
  }
}

function deleteErrorAlert(code: string, en: boolean): void {
  switch (code) {
    case 'permission_denied':
      alert(en ? 'You do not have permission to delete this nomination.' : '无权删除该提名');
      break;
    case 'ballots_exist_locked':
      alert(en ? 'Ballots exist; the candidate list is locked.' : '已有投票，候选名单已锁定');
      break;
    case 'candidate_not_found':
      alert(en ? 'Candidate not found or already removed.' : '候选人不存在或已被删除');
      break;
    default:
      alert(code || (en ? 'Delete failed' : '删除失败'));
  }
}

function reviewErrorAlert(code: string, en: boolean): void {
  switch (code) {
    case 'permission_denied':
      alert(en ? 'You do not have permission to review this candidate.' : '无权审核该候选人');
      break;
    case 'ballots_exist_locked':
      alert(en ? 'Ballots exist; the candidate list is locked.' : '已有投票，候选名单已锁定');
      break;
    case 'candidate_not_found':
      alert(en ? 'Candidate not found or already removed.' : '候选人不存在或已被删除');
      break;
    default:
      alert(code || (en ? 'Review failed' : '审核失败'));
  }
}

function ballotErrorAlert(code: string, en: boolean, t: (key: string) => string, maxChoices: number): void {
  const lc = code.toLowerCase();
  if (lc.includes('too_many') || lc === 'selected_too_many') {
    alert(
      en
        ? `You may select at most ${maxChoices} candidate(s).`
        : `最多只能选择 ${maxChoices} 名候选人`,
    );
    return;
  }
  if (
    lc.includes('no_candidates') ||
    lc.includes('invalid_candidate') ||
    lc.includes('candidate_not_accepted')
  ) {
    alert(en ? 'One or more selected candidates cannot be voted for.' : '候选人不可投');
    return;
  }
  if (lc.includes('not_eligible')) {
    alert(en ? 'You are not an eligible voter for this meeting.' : '您不是本次会议的合资格投票人');
    return;
  }
  if (
    lc.includes('already_voted') ||
    lc.includes('duplicate_vote') ||
    lc.includes('ballots_exist_locked')
  ) {
    alert(en ? 'You have already submitted your ballot.' : '您已提交过选票');
    return;
  }
  if (
    lc.includes('voting_not_open') ||
    lc.includes('too_early') ||
    lc.includes('nomination_still_open') ||
    lc.includes('nomination_not_started')
  ) {
    alert(en ? 'Voting is not open yet.' : '当前不在投票时间内');
    return;
  }
  if (lc.includes('voting_closed') || lc.includes('past_close')) {
    alert(en ? 'Voting has closed.' : '投票已截止');
    return;
  }
  alert(code || (en ? 'Ballot submission failed' : '提交选票失败'));
}

export function MeetingElectionCandidatesPanel({
  agenda,
  propertyId,
  meetingId,
  ownerVoteMeetingId,
  eligibleUnitNo,
  currentUserId = null,
  canModerateCandidates = false,
  resultsLocked = false,
  hasSubmittedElectionBallot = false,
  submittedSelectedCandidateIds = [],
  ownerVoteMeetingStatus = null,
  canEdit,
  electionBallotCount,
  languageEn,
  t,
  councilElectionMeeting = null,
  onUpdated,
}: MeetingElectionCandidatesPanelProps) {
  const parsed = extractElectionAgendaMeta(agenda.description_zh ?? '');
  const meta0 = parsed.meta;
  const [busy, setBusy] = useState(false);
  const [governanceBusy, setGovernanceBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    unit: '',
    statement: '',
    nominated_by: '',
    accepted: true,
  });
  const [nomBusy, setNomBusy] = useState(false);
  const [showNomForm, setShowNomForm] = useState(false);
  const [nomForm, setNomForm] = useState({ name: '', unit: '', statement: '' });
  const [ballotBusy, setBallotBusy] = useState(false);
  const [selectedBallotIds, setSelectedBallotIds] = useState<string[]>([]);
  const [ballotSelectErr, setBallotSelectErr] = useState<string | null>(null);

  const meta = meta0 ?? null;
  const candidatesSorted = useMemo(() => [...(meta?.candidates ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [meta]);
  const en = languageEn;
  const now = new Date();
  const metaFinal = meta ? finalizeElectionMeta(meta, now) : null;
  const nomStatus: ElectionNominationUiStatus | null =
    metaFinal !== null ? getElectionNominationStatus(now, metaFinal, councilElectionMeeting ?? null) : null;

  const v3RemoteCouncil = !!(councilElectionMeeting && isWrittenRemoteV3Meeting(councilElectionMeeting));
  const governanceRpcEnabled = !!ownerVoteMeetingId?.trim();

  const unitAlreadyHasCandidate = useMemo(() => {
    const u = eligibleUnitNo?.trim().toLowerCase();
    if (!u || !metaFinal) return false;
    return metaFinal.candidates.some((c) => String(c.unit_no ?? '').trim().toLowerCase() === u);
  }, [eligibleUnitNo, metaFinal]);

  const nominationOpenPhase = nomStatus === 'open';
  const staffNominationWritesEnabled = !!canEdit && nominationOpenPhase;

  const canOwnerNominate =
    governanceRpcEnabled &&
    !!eligibleUnitNo?.trim() &&
    !!metaFinal &&
    metaFinal.allow_self_nomination === true &&
    nominationOpenPhase;

  const acceptedCandidates = useMemo(
    () => candidatesSorted.filter((c) => c.accepted === true),
    [candidatesSorted],
  );

  const maxBallotChoices = metaFinal?.max_choices_per_unit ?? 1;

  const formalVotingAllowed =
    !!metaFinal && isFormalElectionVotingAllowed(now, metaFinal, councilElectionMeeting ?? null);

  const legacyOvVotingOpen =
    v3RemoteCouncil || String(ownerVoteMeetingStatus ?? '').trim().toLowerCase() === 'open';

  const canShowBallotForm =
    governanceRpcEnabled &&
    !!eligibleUnitNo?.trim() &&
    formalVotingAllowed &&
    legacyOvVotingOpen &&
    acceptedCandidates.length > 0 &&
    !hasSubmittedElectionBallot;

  const submittedCandidateNames = useMemo(() => {
    if (!submittedSelectedCandidateIds.length || !metaFinal) return [];
    const byId = new Map(metaFinal.candidates.map((c) => [c.id, c]));
    return submittedSelectedCandidateIds
      .map((id) => byId.get(id))
      .filter((c): c is ElectionCandidateDraft => !!c)
      .map((c) => c.name);
  }, [submittedSelectedCandidateIds, metaFinal]);

  function toggleBallotSelection(candidateId: string) {
    setBallotSelectErr(null);
    setSelectedBallotIds((prev) => {
      if (prev.includes(candidateId)) {
        return prev.filter((id) => id !== candidateId);
      }
      if (prev.length >= maxBallotChoices) {
        setBallotSelectErr(t('meeting_election_selected_too_many'));
        return prev;
      }
      return [...prev, candidateId];
    });
  }

  async function submitElectionBallot() {
    if (!ownerVoteMeetingId || selectedBallotIds.length === 0 || hasSubmittedElectionBallot) return;
    setBallotBusy(true);
    setBallotSelectErr(null);
    try {
      const { data, error } = await supabase.rpc('submit_owner_election_ballot', {
        p_meeting_id: ownerVoteMeetingId,
        p_agenda_item_id: agenda.id,
        p_selected_candidate_ids: selectedBallotIds,
      });
      if (error) throw error;
      const payload = data as RpcPayload;
      if (payload && typeof payload === 'object' && payload.ok === false) {
        ballotErrorAlert(String(payload.error ?? ''), en, t, maxBallotChoices);
        return;
      }
      setSelectedBallotIds([]);
      await onUpdated();
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      ballotErrorAlert(raw, en, t, maxBallotChoices);
    } finally {
      setBallotBusy(false);
    }
  }

  async function persist(next: ElectionAgendaMetaV1) {
    if (!meta || !staffNominationWritesEnabled) return;
    const visible = displayAgendaZhWithoutElection(agenda.description_zh);
    const merged = finalizeElectionMeta(next);
    const descZh = embedElectionAgendaMeta(visible, merged);
    setBusy(true);
    try {
      const { error } = await updateMeetingAgendaItem({
        propertyId,
        meetingId,
        agendaItemId: agenda.id,
        titleZh: agenda.title_zh,
        titleEn: agenda.title_en,
        descriptionEn: agenda.description_en,
        descriptionZh: descZh,
        requiresVote: false,
        voteRule: null,
      });
      if (error) {
        const lc = error.message.toLowerCase();
        if (lc.includes('invalid_election_timeline')) alert(t('meeting_election_invalid_timeline'));
        else if (lc.includes('nomination_not_open')) alert(t('meeting_election_persist_nomination_not_open'));
        else if (lc.includes('nomination_closed')) alert(t('meeting_election_persist_nomination_closed'));
        console.error('[MeetingElectionCandidatesPanel]', error.message);
        return;
      }
      await onUpdated();
    } finally {
      setBusy(false);
    }
  }

  async function updateCandidate(patch: ElectionCandidateDraft) {
    if (!meta || !staffNominationWritesEnabled || v3RemoteCouncil) return;
    await persist({
      ...finalizeElectionMeta(meta),
      candidates: meta.candidates.map((c) => (c.id === patch.id ? { ...patch } : c)),
    });
  }

  async function removeCandidate(id: string) {
    if (!meta || !staffNominationWritesEnabled || resultsLocked || v3RemoteCouncil || governanceRpcEnabled) return;
    await persist({
      ...finalizeElectionMeta(meta),
      candidates: meta.candidates.filter((c) => c.id !== id),
    });
  }

  async function upsertCandidate() {
    if (!staffNominationWritesEnabled || !meta) return;
    if (v3RemoteCouncil && editingId) return;
    const name = form.name.trim();
    const unit_no = form.unit.trim();
    if (!name) return;
    const base: ElectionCandidateDraft = {
      id: editingId ?? newCandidateId(),
      name,
      unit_no,
      statement: form.statement.trim(),
      nominated_by: form.nominated_by.trim(),
      accepted: form.accepted,
      created_at: editingId ? meta.candidates.find((x) => x.id === editingId)?.created_at ?? new Date().toISOString() : new Date().toISOString(),
    };
    let nextList: ElectionCandidateDraft[];
    if (editingId) {
      nextList = meta.candidates.map((c) => (c.id === editingId ? base : c));
    } else {
      nextList = [...meta.candidates, base];
    }
    await persist({ ...finalizeElectionMeta(meta), candidates: nextList });
    setForm({ name: '', unit: '', statement: '', nominated_by: '', accepted: true });
    setEditingId(null);
  }

  async function submitNomination() {
    const name = nomForm.name.trim();
    const unit = nomForm.unit.trim();
    if (!ownerVoteMeetingId || !eligibleUnitNo || !name) return;
    setNomBusy(true);
    try {
      const { data, error } = await supabase.rpc('submit_owner_election_nomination', {
        p_meeting_id: ownerVoteMeetingId,
        p_agenda_item_id: agenda.id,
        p_name: name,
        p_statement: nomForm.statement.trim(),
        p_unit_no: unit || null,
      });
      if (error) throw error;
      const payload = data as RpcPayload;
      if (payload && typeof payload === 'object' && payload.ok === false) {
        nominationErrorAlert(String(payload.error ?? '').toLowerCase(), en, t);
        return;
      }
      setNomForm({ name: '', unit: '', statement: '' });
      setShowNomForm(false);
      await onUpdated();
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      const lc = raw.toLowerCase();
      if (
        lc.includes('duplicate_candidate') ||
        lc.includes('ballots_exist') ||
        lc.includes('nomination_not') ||
        lc.includes('nomination_closed') ||
        lc.includes('not_eligible') ||
        lc.includes('council_meeting_not_found')
      ) {
        nominationErrorAlert(lc, en, t);
      } else {
        console.error('[MeetingElectionCandidatesPanel] submit_owner_election_nomination', raw);
      }
    } finally {
      setNomBusy(false);
    }
  }

  async function deleteNomination(candidate: ElectionCandidateDraft) {
    if (!ownerVoteMeetingId || resultsLocked) return;
    setGovernanceBusy(true);
    try {
      const { data, error } = await supabase.rpc('delete_owner_election_nomination', {
        p_meeting_id: ownerVoteMeetingId,
        p_agenda_item_id: agenda.id,
        p_candidate_id: candidate.id,
      });
      if (error) throw error;
      const payload = data as RpcPayload;
      if (payload && typeof payload === 'object' && payload.ok === false) {
        deleteErrorAlert(String(payload.error ?? '').toLowerCase(), en);
        return;
      }
      await onUpdated();
    } catch (e) {
      deleteErrorAlert(rpcErrorCode(null, e), en);
    } finally {
      setGovernanceBusy(false);
    }
  }

  async function toggleCandidateAccepted(candidate: ElectionCandidateDraft) {
    if (!ownerVoteMeetingId || resultsLocked || !canModerateCandidates) return;
    setGovernanceBusy(true);
    try {
      const { data, error } = await supabase.rpc('set_owner_election_candidate_accepted', {
        p_meeting_id: ownerVoteMeetingId,
        p_agenda_item_id: agenda.id,
        p_candidate_id: candidate.id,
        p_accepted: candidate.accepted !== true,
      });
      if (error) throw error;
      const payload = data as RpcPayload;
      if (payload && typeof payload === 'object' && payload.ok === false) {
        reviewErrorAlert(String(payload.error ?? '').toLowerCase(), en);
        return;
      }
      await onUpdated();
    } catch (e) {
      reviewErrorAlert(rpcErrorCode(null, e), en);
    } finally {
      setGovernanceBusy(false);
    }
  }

  function nominatedByLabel(c: ElectionCandidateDraft): string {
    const unit = c.nominated_by_unit?.trim();
    if (unit) return unit;
    const by = c.nominated_by?.trim();
    if (by) return by;
    return '—';
  }

  function unitDisplay(c: ElectionCandidateDraft): string {
    const u = String(c.unit_no ?? '').trim();
    if (u) return u;
    return en ? 'Unit pending confirmation' : '房号待确认';
  }

  function acceptedStatusLabel(c: ElectionCandidateDraft): string {
    if (c.accepted === true) return en ? 'Approved' : '已通过';
    return en ? 'Pending review' : '待审核';
  }

  const nominationStatusLabel =
    nomStatus !== null ? formatElectionNominationUiStatus(nomStatus, { t, languageEn: en }) : '—';

  const nomWindowDisplay =
    councilElectionMeeting && isWrittenRemoteV3Meeting(councilElectionMeeting)
      ? (() => {
          const c = deriveRemoteWrittenV3CanonFromScheduledAt(councilElectionMeeting.scheduled_at);
          return c ? { openIso: c.nominationOpenIso, closeIso: c.nominationCloseIso } : null;
        })()
      : councilAgmSgmNominationWindowDisplayIso(councilElectionMeeting);
  const nomOpenDisplayText = nomWindowDisplay
    ? nomWindowDisplay.openIso
      ? fmtTs(nomWindowDisplay.openIso, en)
      : agmSgmScheduledNotSetLabel(en)
    : fmtTs(metaFinal?.nomination_opens_at, en);
  const nomCloseDisplayText = nomWindowDisplay
    ? nomWindowDisplay.closeIso
      ? fmtTs(nomWindowDisplay.closeIso, en)
      : agmSgmScheduledNotSetLabel(en)
    : fmtTs(metaFinal?.nomination_closes_at, en);

  if (!metaFinal || nomStatus === null) {
    return null;
  }

  const actionBusy = busy || governanceBusy || ballotBusy;

  return (
    <div className="mt-4 space-y-4 border-t border-amber-200/80 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-900">{t('meeting_election_nomination')}</h4>
      </div>

      {nomStatus === 'invalid' ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
          {t('meeting_election_time_overlap_admin_warn')}
        </p>
      ) : null}

      {canEdit && nomStatus === 'before_open' ? (
        <p className="text-sm text-gray-700">{t('meeting_election_staff_nomination_before_open')}</p>
      ) : null}

      {canEdit && nomStatus === 'closed' ? (
        <p className="text-sm text-gray-700">{t('meeting_election_staff_nomination_closed_readonly')}</p>
      ) : null}
      <dl className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg bg-white/70 px-2 py-1.5 ring-1 ring-gray-200 sm:col-span-2 lg:col-span-3">
          <dt className="text-gray-500">{en ? 'Nomination status' : '提名状态'}</dt>
          <dd className="font-medium text-gray-900">{nominationStatusLabel}</dd>
        </div>
        <div className="rounded-lg bg-white/70 px-2 py-1.5 ring-1 ring-gray-200">
          <dt className="text-gray-500">{t('meeting_election_nomination_opens')}</dt>
          <dd className="font-medium text-gray-900">{nomOpenDisplayText}</dd>
        </div>
        <div className="rounded-lg bg-white/70 px-2 py-1.5 ring-1 ring-gray-200">
          <dt className="text-gray-500">{t('meeting_election_nomination_closes')}</dt>
          <dd className="font-medium text-gray-900">{nomCloseDisplayText}</dd>
        </div>
        <div className="rounded-lg bg-white/70 px-2 py-1.5 ring-1 ring-gray-200">
          <dt className="text-gray-500">{t('meeting_election_candidates')}</dt>
          <dd className="font-medium text-gray-900">{metaFinal?.candidates.length ?? 0}</dd>
        </div>
        <div className="rounded-lg bg-white/70 px-2 py-1.5 ring-1 ring-gray-200">
          <dt className="text-gray-500">{t('meeting_election_seats')}</dt>
          <dd className="font-medium text-gray-900">{metaFinal?.seats ?? 0}</dd>
        </div>
        <div className="rounded-lg bg-white/70 px-2 py-1.5 ring-1 ring-gray-200">
          <dt className="text-gray-500">{t('meeting_election_max_choices')}</dt>
          <dd className="font-medium text-gray-900">{metaFinal?.max_choices_per_unit ?? 0}</dd>
        </div>
      </dl>

      {electionBallotCount > 0 ? (
        <p className="text-xs text-amber-800">
          {en ? `${electionBallotCount} unit(s) have submitted election ballots.` : `已有 ${electionBallotCount} 户提交了选举选票。`}
        </p>
      ) : null}

      {resultsLocked ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {en ? 'Ballots exist; the candidate list is locked.' : '已有投票记录，候选名单已锁定。'}
        </p>
      ) : null}

      <div>
        <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">{t('meeting_election_candidates')}</h5>
        {candidatesSorted.length === 0 ? (
          <p className="text-sm text-gray-600">{en ? 'No candidates listed yet.' : '暂无候选人。'}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {candidatesSorted.map((c) => {
              const isOwnNomination = !!currentUserId && c.nominated_by_user_id === currentUserId;
              const canDeleteCandidate =
                !resultsLocked &&
                governanceRpcEnabled &&
                (isOwnNomination || canModerateCandidates);
              const showGovernanceReview = canModerateCandidates && !resultsLocked && governanceRpcEnabled;
              const showStaffPersistActions =
                staffNominationWritesEnabled && !v3RemoteCouncil && !governanceRpcEnabled;
              const deleteLabel =
                isOwnNomination && !canModerateCandidates
                  ? en
                    ? 'Withdraw'
                    : '撤回'
                  : en
                    ? 'Delete'
                    : '删除';

              return (
                <li key={c.id} className="rounded-lg bg-white px-3 py-2 ring-1 ring-gray-100">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{c.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {t('meeting_election_candidate_unit')}: {unitDisplay(c)}
                      </p>
                      {c.statement ? <p className="mt-1 whitespace-pre-wrap text-xs text-gray-600">{c.statement}</p> : null}
                      <p className="mt-1 text-xs text-gray-500">
                        {t('meeting_election_nominated_by')}: {nominatedByLabel(c)}
                      </p>
                      <p className="mt-1 text-xs text-gray-700">
                        {en ? 'Review status' : '审核状态'}:{' '}
                        <span className={`font-semibold ${c.accepted === true ? 'text-gray-900' : 'text-amber-800'}`}>
                          {acceptedStatusLabel(c)}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:justify-end">
                      {showGovernanceReview ? (
                        <button
                          type="button"
                          disabled={actionBusy}
                          className="text-xs font-medium text-clearstrata-ui-primary hover:underline disabled:opacity-40"
                          onClick={() => void toggleCandidateAccepted(c).catch(console.error)}
                        >
                          {c.accepted === true ? (en ? 'Revoke approval' : '取消通过') : en ? 'Approve' : '通过'}
                        </button>
                      ) : null}
                      {canDeleteCandidate ? (
                        <button
                          type="button"
                          disabled={actionBusy}
                          className="text-xs font-medium text-red-700 hover:underline disabled:opacity-40 disabled:hover:no-underline"
                          onClick={() => void deleteNomination(c).catch(console.error)}
                        >
                          {deleteLabel}
                        </button>
                      ) : null}
                      {showStaffPersistActions ? (
                        <>
                          <label className="flex items-center gap-1 text-xs text-gray-800">
                            <input
                              type="checkbox"
                              checked={Boolean(c.accepted)}
                              disabled={busy}
                              onChange={(ev) =>
                                void updateCandidate({ ...c, accepted: ev.target.checked }).catch(console.error)
                              }
                            />
                            {t('meeting_election_accepted')}
                          </label>
                          <button
                            type="button"
                            disabled={busy}
                            className="text-xs font-medium text-clearstrata-ui-primary hover:underline"
                            onClick={() => {
                              setEditingId(c.id);
                              setForm({
                                name: c.name,
                                unit: String(c.unit_no ?? ''),
                                statement: String(c.statement ?? ''),
                                nominated_by: String(c.nominated_by ?? ''),
                                accepted: c.accepted,
                              });
                            }}
                          >
                            {t('meeting_agenda_edit')}
                          </button>
                          <button
                            type="button"
                            disabled={busy || resultsLocked}
                            className="text-xs font-medium text-red-700 hover:underline disabled:opacity-40 disabled:hover:no-underline"
                            onClick={() => void removeCandidate(c.id).catch(console.error)}
                          >
                            {en ? 'Delete' : '删除'}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {canOwnerNominate ? (
        <div className="rounded-lg bg-white/70 px-3 py-3 ring-1 ring-amber-100">
          {!showNomForm ? (
            <button
              type="button"
              disabled={nomBusy}
              onClick={() => {
                setNomForm({ name: '', unit: '', statement: '' });
                setShowNomForm(true);
              }}
              className="text-sm font-semibold text-clearstrata-ui-primary hover:underline disabled:opacity-50"
            >
              {en ? 'Nominate candidate' : '提名候选人'}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-800">{en ? 'Nominate candidate' : '提名候选人'}</p>
              <input
                placeholder={t('meeting_election_candidate_name')}
                value={nomForm.name}
                disabled={nomBusy}
                onChange={(e) => setNomForm((s) => ({ ...s, name: e.target.value }))}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
              />
              <label className="block text-xs text-gray-600">
                {t('meeting_election_candidate_unit')}{' '}
                <span className="text-[10px] font-normal text-gray-400">({en ? 'optional' : '可选'})</span>
                <input
                  value={nomForm.unit}
                  disabled={nomBusy}
                  onChange={(e) => setNomForm((s) => ({ ...s, unit: e.target.value }))}
                  placeholder={en ? "e.g. 109 — leave blank if you don't know" : '例如 109 — 不清楚可留空'}
                  className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                />
              </label>
              <textarea
                placeholder={t('meeting_election_candidate_statement')}
                value={nomForm.statement}
                disabled={nomBusy}
                onChange={(e) => setNomForm((s) => ({ ...s, statement: e.target.value }))}
                className="min-h-[72px] w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={nomBusy || !nomForm.name.trim()}
                  onClick={() => void submitNomination()}
                  className="rounded-lg bg-clearstrata-ui-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-clearstrata-ui-primaryHover disabled:opacity-50"
                >
                  {en ? 'Nominate' : '提名'}
                </button>
                <button
                  type="button"
                  disabled={nomBusy}
                  onClick={() => {
                    setShowNomForm(false);
                    setNomForm({ name: '', unit: '', statement: '' });
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                >
                  {t('meeting_agenda_cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {hasSubmittedElectionBallot ? (
        <div className="rounded-lg border border-clearstrata-state-success-border bg-clearstrata-state-success-surface/40 px-3 py-3 space-y-2">
          <p className="text-sm font-semibold text-gray-900">
            {en ? 'You have submitted your ballot' : '您已提交选票'}
          </p>
          {submittedCandidateNames.length > 0 ? (
            <ul className="list-disc pl-5 text-sm text-gray-800">
              {submittedCandidateNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          ) : submittedSelectedCandidateIds.length > 0 ? (
            <p className="text-xs text-gray-600">{submittedSelectedCandidateIds.join(', ')}</p>
          ) : null}
        </div>
      ) : null}

      {canShowBallotForm ? (
        <div className="rounded-lg border border-blue-200/80 bg-blue-50/30 px-3 py-3 space-y-3">
          <h5 className="text-sm font-semibold text-gray-900">{en ? 'Cast election ballot' : '选举投票'}</h5>
          <p className="text-xs text-gray-600">
            {en
              ? `Select up to ${maxBallotChoices} approved candidate(s) for your unit.`
              : `请为您所在单位选择最多 ${maxBallotChoices} 名已通过审核的候选人。`}
          </p>
          <ul className="space-y-2">
            {acceptedCandidates.map((c) => {
              const checked = selectedBallotIds.includes(c.id);
              const atMax = selectedBallotIds.length >= maxBallotChoices;
              return (
                <li key={c.id} className="rounded-lg bg-white px-3 py-2 ring-1 ring-gray-100">
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={checked}
                      disabled={ballotBusy || (!checked && atMax)}
                      onChange={() => toggleBallotSelection(c.id)}
                    />
                    <span className="min-w-0">
                      <span className="font-medium text-gray-900">{c.name}</span>
                      <span className="ml-1 text-xs text-gray-500">· {unitDisplay(c)}</span>
                      {c.statement ? (
                        <span className="mt-0.5 block text-xs text-gray-600">{c.statement}</span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {ballotSelectErr ? <p className="text-xs text-amber-800">{ballotSelectErr}</p> : null}
          <button
            type="button"
            disabled={ballotBusy || selectedBallotIds.length === 0}
            onClick={() => void submitElectionBallot()}
            className="rounded-lg bg-clearstrata-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover disabled:opacity-50"
          >
            {t('meeting_election_submit_ballot')}
          </button>
        </div>
      ) : null}

      {!canEdit && meta.allow_self_nomination && nomStatus === 'before_open' ? (
        <p className="text-xs text-gray-600">{t('meeting_election_nomination_not_open_owner')}</p>
      ) : null}

      {!canEdit && meta.allow_self_nomination && nomStatus === 'closed' ? (
        <p className="text-xs text-gray-600">{t('meeting_election_self_nomination_closed')}</p>
      ) : null}

      {!canEdit && meta.allow_self_nomination && nominationOpenPhase && unitAlreadyHasCandidate ? (
        <p className="text-xs text-gray-500">
          {en
            ? 'Another candidate from your unit is already listed. You may still nominate; duplicate identical nominations will be rejected.'
            : '本单位已有其他候选人。您仍可提名，重复提名将被拒绝。'}
        </p>
      ) : null}

      {staffNominationWritesEnabled ? (
        <div className="rounded-lg bg-amber-50/40 px-3 py-3 ring-1 ring-amber-200/60 space-y-2">
          <p className="text-xs font-medium text-gray-800">{t('meeting_election_add_candidate')}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              placeholder={t('meeting_election_candidate_name')}
              value={form.name}
              disabled={busy}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              className="rounded border border-gray-300 px-2 py-1.5 text-xs"
            />
            <input
              placeholder={t('meeting_election_candidate_unit')}
              value={form.unit}
              disabled={busy}
              onChange={(e) => setForm((s) => ({ ...s, unit: e.target.value }))}
              className="rounded border border-gray-300 px-2 py-1.5 text-xs"
            />
            <input
              placeholder={t('meeting_election_nominated_by')}
              value={form.nominated_by}
              disabled={busy}
              onChange={(e) => setForm((s) => ({ ...s, nominated_by: e.target.value }))}
              className="rounded border border-gray-300 px-2 py-1.5 text-xs sm:col-span-2"
            />
            <textarea
              placeholder={t('meeting_election_candidate_statement')}
              value={form.statement}
              disabled={busy}
              onChange={(e) => setForm((s) => ({ ...s, statement: e.target.value }))}
              className="min-h-[72px] rounded border border-gray-300 px-2 py-1.5 text-xs sm:col-span-2"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-800">
            <input
              type="checkbox"
              checked={form.accepted}
              disabled={busy}
              onChange={(ev) => setForm((s) => ({ ...s, accepted: ev.target.checked }))}
            />
            {t('meeting_election_accepted')}
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !form.name.trim()}
              onClick={() => void upsertCandidate().catch(console.error)}
              className="rounded-lg bg-clearstrata-ui-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-clearstrata-ui-primaryHover disabled:opacity-50"
            >
              {editingId ? t('meeting_agenda_save') : t('meeting_election_add_candidate')}
            </button>
            {editingId ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setEditingId(null);
                  setForm({ name: '', unit: '', statement: '', nominated_by: '', accepted: true });
                }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
              >
                {t('meeting_agenda_cancel')}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
