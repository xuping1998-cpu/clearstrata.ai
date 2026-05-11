import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { StatusBadge } from '@/components/status/StatusBadge';
import {
  buildElectionNominationRibbon,
  electionNominationPhase,
  extractElectionAgendaMeta,
  finalizeElectionMeta,
  isFormalElectionVotingAllowed,
  type ElectionAgendaMetaV1,
} from '@/features/meetings/electionAgendaModel';
import { stripCouncilMeetingBinding, resolveCouncilMeetingIdForOwnerVoteDescription } from '@/features/meetings/ownerVotingCouncil';

export type VoteChoice = 'yes' | 'no' | 'abstain';
export type MeetingStatus = 'draft' | 'open' | 'closed' | 'archived';
export type MeetingType = 'agm' | 'sgm';
export type ResolutionThreshold = 'majority' | 'three_quarter' | 'unanimous';

interface OwnerVoteMeetingRow {
  id: string;
  title: string;
  description: string | null;
  meeting_type: string;
  status: string;
  scheduled_at: string | null;
  voting_opens_at: string | null;
  voting_closes_at: string | null;
  snapshot_frozen_at?: string | null;
  /** For list ordering fallback */
  created_at?: string | null;
}

interface SnapshotRowRaw {
  id: string;
  meeting_id: string;
  property_id: string;
  unit_no: string | null;
  is_eligible: boolean;
  owner_vote_meetings: OwnerVoteMeetingRow | OwnerVoteMeetingRow[] | null;
}

export interface ResolutionRow {
  id: string;
  meeting_id: string;
  title: string;
  description: string | null;
  threshold: string;
  display_order: number | null;
}

interface BallotRow {
  id: string;
  meeting_id: string;
  resolution_id: string;
  unit_no: string | null;
  choice: VoteChoice;
  updated_at: string | null;
}

export type VotingPhaseUi = 'not_started' | 'voting_live' | 'closed';

function unwrapMeeting(rel: SnapshotRowRaw['owner_vote_meetings']): OwnerVoteMeetingRow | null {
  if (rel == null) return null;
  if (Array.isArray(rel)) return rel.length ? rel[0] ?? null : null;
  return rel;
}

function meetingTypeLabel(mt: string, zh: boolean): string {
  if (mt === 'agm') return zh ? '业主周年大会 AGM' : 'AGM';
  if (mt === 'sgm') return zh ? '业主特别大会 SGM' : 'SGM';
  return mt.toUpperCase();
}

function thresholdLabel(threshold: string, zh: boolean): string {
  if (threshold === 'majority') return zh ? '普通多数' : 'Majority';
  if (threshold === 'three_quarter') return zh ? '3/4 票' : '3/4 votes';
  if (threshold === 'unanimous') return zh ? '全票通过' : 'Unanimous';
  return threshold;
}

function phaseLabelText(phase: VotingPhaseUi, zh: boolean): string {
  if (phase === 'not_started') return zh ? '未开始' : 'Not started';
  if (phase === 'voting_live') return zh ? '投票中' : 'Open for voting';
  return zh ? '已结束' : 'Ended';
}

function parseRpcError(msg: string, zh: boolean): string | null {
  const m = msg.toLowerCase();
  if (m.includes('voting_closed') || m.includes('voting closed')) {
    return zh ? '投票已截止，无法提交表决。' : 'Voting has closed; your vote cannot be recorded.';
  }
  if (m.includes('voting_not_open') || m.includes('voting not open')) {
    return zh ? '投票尚未开放或已经截止' : 'Voting has not opened or has ended.';
  }
  if (m.includes('not_eligible_to_vote') || m.includes('not eligible')) {
    return zh ? '你不在本次表决资格名单中' : 'You are not on the eligible voters list for this vote.';
  }
  if (m.includes('not_authenticated')) {
    return zh ? '请先登录' : 'Please sign in.';
  }
  if (m.includes('too_many_candidates') || m.includes('invalid_selection')) {
    return zh ? '选择人数超过上限' : 'Too many candidates selected.';
  }
  if (m.includes('invalid_candidate_id')) {
    return zh ? '选择无效（候选人未接受或未登记）' : 'Invalid candidate selection.';
  }
  if (m.includes('nomination_still_open')) {
    return zh ? '提名期尚未截止，正式投票将在提名截止后开放。' : 'Formal voting will open after the nomination period closes.';
  }
  if (m.includes('nomination_not_started')) {
    return zh ? '提名尚未开始。' : 'Nomination has not started.';
  }
  if (m.includes('nomination_closed') || m.includes('self_nomination_not_allowed')) {
    return zh ? '无法再自荐或修改提名。' : 'Self-nomination or nomination updates are no longer available.';
  }
  if (m.includes('duplicate_candidate')) {
    return zh ? '该房号已报名候选人。' : 'This unit already has a candidate.';
  }
  return null;
}

/** Voting window vs DB row: stale `status=open` after close time is still `closed` for UI and RPC */
export function getVotingPhase(
  votingOpensIso: string | null,
  votingClosesIso: string | null,
  statusRaw: string,
  now: Date,
): VotingPhaseUi {
  const opens = votingOpensIso ? new Date(votingOpensIso) : null;
  const closes = votingClosesIso ? new Date(votingClosesIso) : null;
  const oOk = opens != null && !Number.isNaN(opens.getTime());
  const cOk = closes != null && !Number.isNaN(closes.getTime());
  const status = statusRaw.trim().toLowerCase();

  if (!oOk || !cOk) return 'closed';

  const n = now.getTime();
  if (n < opens.getTime()) return 'not_started';
  if (n > closes.getTime()) return 'closed';

  if (status === 'open') return 'voting_live';
  return 'closed';
}

export function isCouncilMeetingEndedStatus(status: string | null | undefined): boolean {
  const s = String(status ?? '').trim().toLowerCase();
  return s === 'closed' || s === 'ended' || s === 'archived';
}

/** Council `meetings.status` overrides owner_vote window when bound; otherwise preserves getVotingPhase. */
export function getEffectiveVotingPhase(
  councilMeetingStatus: string | null | undefined,
  votingOpensIso: string | null,
  votingClosesIso: string | null,
  ownerVoteStatusRaw: string,
  now: Date,
): VotingPhaseUi {
  const cs = String(councilMeetingStatus ?? '').trim().toLowerCase();
  if (cs) {
    if (isCouncilMeetingEndedStatus(cs)) return 'closed';
    if (cs === 'draft') return 'not_started';
  }
  return getVotingPhase(votingOpensIso, votingClosesIso, ownerVoteStatusRaw, now);
}

function normalizeChoice(raw: unknown): VoteChoice | null {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (s === 'yes' || s === 'no' || s === 'abstain') return s;
  return null;
}

export interface ElectionAgendaBrief {
  agendaItemId: string;
  sortOrder: number;
  title: string;
  meta: ElectionAgendaMetaV1;
}

interface MeetingPack {
  snapshotId: string;
  meetingId: string;
  propertyId: string;
  unitNo: string | null;
  meeting: OwnerVoteMeetingRow;
  resolutions: ResolutionRow[];
  ballotsByResolution: Map<string, BallotRow>;
  electionAgendas: ElectionAgendaBrief[];
  electionSelections: Map<string, string[]>;
  /** Resolved council `meetings.id` (for/detail / election agendas); voting UI keys off council status below */
  councilMeetingId: string | null;
  councilMeetingStatus: string | null;
  councilMeetingScheduledAt: string | null;
  councilMeetingCreatedAt: string | null;
}

type CouncilMeetingBatchRow = {
  id: string;
  status: string;
  created_at: string | null;
  scheduled_at: string | null;
};

/** Parse ISO-ish timestamp → ms since epoch; invalid / empty → null */
function parseTimestampMs(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const ms = new Date(s).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function sortTierEffective(effectivePhase: VotingPhaseUi): number {
  if (effectivePhase === 'voting_live') return 0;
  if (effectivePhase === 'not_started') return 1;
  return 2;
}

function newestFirstForTieBreak(p: MeetingPack): [number, number] {
  return [parseTimestampMs(p.councilMeetingCreatedAt) ?? 0, parseTimestampMs(p.meeting.created_at) ?? 0];
}

/** Tier: voting_live → not_started → closed; tie-break: council created_at DESC, OV created_at DESC */
function compareOwnerMeetingPacksBySchedule(a: MeetingPack, b: MeetingPack): number {
  const now = new Date();
  const pa = getEffectiveVotingPhase(
    a.councilMeetingStatus,
    a.meeting.voting_opens_at,
    a.meeting.voting_closes_at,
    a.meeting.status,
    now,
  );
  const pb = getEffectiveVotingPhase(
    b.councilMeetingStatus,
    b.meeting.voting_opens_at,
    b.meeting.voting_closes_at,
    b.meeting.status,
    now,
  );
  const ta = sortTierEffective(pa);
  const tb = sortTierEffective(pb);
  if (ta !== tb) return ta - tb;
  const ka = newestFirstForTieBreak(a);
  const kb = newestFirstForTieBreak(b);
  if (ka[0] !== kb[0]) return kb[0] - ka[0];
  if (ka[1] !== kb[1]) return kb[1] - ka[1];
  return 0;
}

/** Badge / headline：业委会已结束或未开放时使用固定文案 */
function phaseStatusHeadlineLabel(
  effectivePhase: VotingPhaseUi,
  councilMeetingStatus: string | null | undefined,
  zh: boolean,
): string {
  const cs = String(councilMeetingStatus ?? '').trim().toLowerCase();
  if (isCouncilMeetingEndedStatus(cs)) return zh ? '已结束' : 'Ended';
  if (cs === 'draft') return zh ? '尚未开放' : 'Not open';
  return phaseLabelText(effectivePhase, zh);
}

function ownerVoteMeetingShowsViewResults(mt: OwnerVoteMeetingRow, effectivePhase: VotingPhaseUi): boolean {
  if (effectivePhase === 'closed') return true;
  const st = mt.status.trim().toLowerCase();
  if (st === 'closed' || st === 'archived' || st === 'ended') return true;
  return false;
}

function votingPhaseTone(phase: VotingPhaseUi): 'neutral' | 'success' | 'warning' {
  if (phase === 'not_started') return 'neutral';
  if (phase === 'voting_live') return 'success';
  return 'warning';
}

function parseStoredCandidateIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === 'string' && x.trim()) out.push(x.trim());
  }
  return out;
}

type CouncilElectionBlockProps = {
  zh: boolean;
  t: (key: string) => string;
  meetingId: string;
  brief: ElectionAgendaBrief;
  votePhase: VotingPhaseUi;
  ownerMeetingStatus: string;
  eligibleUnitNo: string | null;
  busy: boolean;
  initialSelected: string[];
  onBusy: (v: boolean) => void;
  onToast: (toast: { kind: 'success' | 'error' | 'info'; text: string }) => void;
  onReload: () => Promise<void>;
};

function OwnerCouncilElectionBlock({
  zh,
  t,
  meetingId,
  brief,
  votePhase,
  ownerMeetingStatus,
  eligibleUnitNo,
  busy,
  initialSelected,
  onBusy,
  onToast,
  onReload,
}: CouncilElectionBlockProps) {
  const now = new Date();
  const [picked, setPicked] = useState<Set<string>>(() => new Set(initialSelected));
  const [selfNomOpen, setSelfNomOpen] = useState(false);
  const [selfNomBusy, setSelfNomBusy] = useState(false);
  const [selfForm, setSelfForm] = useState({ name: '', statement: '' });

  const meta = finalizeElectionMeta(brief.meta, now);
  const maxPick = Math.min(Math.max(1, meta.max_choices_per_unit), Math.max(1, meta.seats));
  const nomPhase = electionNominationPhase(now, meta);
  const nominationBlocking = nomPhase === 'before_open' || nomPhase === 'collecting';
  const nominationComplete = isFormalElectionVotingAllowed(now, meta);
  const ovSt = ownerMeetingStatus.trim().toLowerCase();
  const ovDbEnded = ovSt === 'closed' || ovSt === 'archived' || ovSt === 'ended';
  /** Council-ended effective phase closes election voting even if OV row stale */
  const councilOrOvEnded = ovDbEnded || votePhase === 'closed';
  const showBallotSubmit = nominationComplete && votePhase === 'voting_live' && !councilOrOvEnded;

  /** Time window ended (or DB archived / council binding ended): banner */
  const votingPeriodEndedBanner = councilOrOvEnded;

  const sortedAll = [...meta.candidates].sort((a, b) => a.name.localeCompare(b.name, zh ? 'zh' : 'en'));
  const sortedAccepted = meta.candidates
    .filter((c) => c.accepted)
    .sort((a, b) => a.name.localeCompare(b.name, zh ? 'zh' : 'en'));
  const list = nominationBlocking ? sortedAll : sortedAccepted;

  const unitLc = eligibleUnitNo?.trim().toLowerCase() ?? '';
  const dupUnit = !!(unitLc && sortedAll.some((c) => String(c.unit_no ?? '').trim().toLowerCase() === unitLc));

  async function submit() {
    onBusy(true);
    try {
      const { data, error } = await supabase.rpc('submit_owner_election_ballot', {
        p_meeting_id: meetingId,
        p_agenda_item_id: brief.agendaItemId,
        p_selected_candidate_ids: [...picked],
      });
      if (error) {
        onToast({ kind: 'error', text: parseRpcError(error.message, zh) ?? error.message });
        return;
      }
      const payload = data as { ok?: boolean; error?: string } | null;
      if (payload && typeof payload === 'object' && payload.ok === false) {
        const hint = parseRpcError(String(payload.error ?? ''), zh);
        onToast({
          kind: 'error',
          text: hint ?? (zh ? `提交失败（${payload.error ?? ''}）` : `Submit failed (${payload.error ?? ''}).`),
        });
        return;
      }
      onToast({ kind: 'success', text: zh ? '选票已提交' : 'Ballot submitted.' });
      await onReload();
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      onToast({ kind: 'error', text: parseRpcError(raw, zh) ?? raw });
    } finally {
      onBusy(false);
    }
  }

  async function submitSelfNomination() {
    const nm = selfForm.name.trim();
    if (!nm || !eligibleUnitNo?.trim()) return;
    setSelfNomBusy(true);
    try {
      const { data, error } = await supabase.rpc('submit_owner_election_nomination', {
        p_meeting_id: meetingId,
        p_agenda_item_id: brief.agendaItemId,
        p_name: nm,
        p_statement: selfForm.statement.trim(),
      });
      if (error) {
        onToast({ kind: 'error', text: parseRpcError(error.message, zh) ?? error.message });
        return;
      }
      const payload = data as { ok?: boolean; error?: string } | null;
      if (payload && typeof payload === 'object' && payload.ok === false) {
        onToast({
          kind: 'error',
          text: parseRpcError(String(payload.error ?? ''), zh) ?? String(payload.error),
        });
        return;
      }
      onToast({ kind: 'success', text: zh ? '自荐已提交' : 'Self-nomination saved.' });
      setSelfNomOpen(false);
      setSelfForm({ name: '', statement: '' });
      await onReload();
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      onToast({ kind: 'error', text: parseRpcError(raw, zh) ?? raw });
    } finally {
      setSelfNomBusy(false);
    }
  }

  const canSelfNomForm =
    meta.allow_self_nomination && !councilOrOvEnded && nomPhase === 'collecting' && !!eligibleUnitNo?.trim() && !dupUnit;

  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/20 p-4 space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/80">{t('meeting_election_title')}</p>
        <h4 className="mt-1 text-base font-semibold text-gray-900">{brief.title.trim() || '—'}</h4>
      </div>
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-gray-500">{t('meeting_election_seats')}</dt>
          <dd className="font-medium text-gray-900">{meta.seats}</dd>
        </div>
        <div>
          <dt className="text-gray-500">{t('meeting_election_max_choices')}</dt>
          <dd className="font-medium text-gray-900">{maxPick}</dd>
        </div>
      </dl>

      {nominationBlocking ? (
        <p className="rounded-lg bg-white/60 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200/80">
          {t('meeting_election_vote_after_nomination')}
        </p>
      ) : null}
      {!nominationBlocking && votePhase === 'not_started' && !councilOrOvEnded ? (
        <p className="text-xs text-gray-600">{zh ? '表决尚未处于可投票时间段。' : 'Voting is not open in this period.'}</p>
      ) : null}
      {votingPeriodEndedBanner ? (
        <p className="text-xs font-medium text-gray-800">{zh ? '业主表决已结束。' : 'Owner voting has ended.'}</p>
      ) : null}

      <ul className="space-y-2">
        {list.length === 0 ? (
          <li className="text-sm text-gray-600">
            {nominationBlocking
              ? zh
                ? '暂无候选人。物业管理员可添加或由业主自荐报名。'
                : 'No candidates yet. Managers may add nominees, or owners may nominate themselves when allowed.'
              : zh
                ? '暂无已接受提名的候选人。'
                : 'No accepted candidates listed.'}
          </li>
        ) : (
          list.map((c) => {
            const checked = picked.has(c.id);
            const atCap = picked.size >= maxPick && !checked;
            return (
              <li key={c.id}>
                <label
                  className={`flex items-start gap-2 rounded-lg border border-transparent px-1 py-1 ${
                    showBallotSubmit ? 'cursor-pointer hover:border-amber-200/80' : 'cursor-default opacity-95'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checked}
                    disabled={!showBallotSubmit || busy || atCap || !c.accepted}
                    onChange={(ev) => {
                      if (!showBallotSubmit) return;
                      const on = ev.target.checked;
                      setPicked((prev) => {
                        const next = new Set(prev);
                        if (!on) {
                          next.delete(c.id);
                          return next;
                        }
                        if (next.size >= maxPick) {
                          onToast({
                            kind: 'error',
                            text: t('meeting_election_selected_too_many'),
                          });
                          return prev;
                        }
                        next.add(c.id);
                        return next;
                      });
                    }}
                  />
                  <span className="min-w-0 text-sm text-gray-900">
                    <span className="font-medium">{c.name}</span>
                    {c.unit_no ? (
                      <span className="ml-1 text-xs text-gray-500">({String(c.unit_no)})</span>
                    ) : null}
                    {nominationBlocking && typeof c.accepted === 'boolean' ? (
                      <span className="ml-2 text-[11px] text-gray-500">
                        [{c.accepted ? t('meeting_election_accepted') : zh ? '未接受' : 'Not accepted'}]
                      </span>
                    ) : null}
                    {c.statement ? (
                      <span className="mt-0.5 block whitespace-pre-wrap text-xs text-gray-600">{c.statement}</span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })
        )}
      </ul>

      {meta.allow_self_nomination && !councilOrOvEnded && nomPhase === 'before_open' ? (
        <p className="text-xs text-gray-600">{zh ? '提名尚未开放。' : 'Nomination has not opened yet.'}</p>
      ) : null}

      {meta.allow_self_nomination && !councilOrOvEnded && nomPhase === 'ended' ? (
        <p className="text-xs text-gray-600">{t('meeting_election_self_nomination_closed')}</p>
      ) : null}

      {dupUnit && meta.allow_self_nomination ? (
        <p className="text-xs text-gray-600">{t('meeting_election_duplicate_candidate')}</p>
      ) : null}

      {canSelfNomForm ? (
        <div className="rounded-lg border border-amber-100 bg-white/50 px-3 py-2">
          {!selfNomOpen ? (
            <button
              type="button"
              disabled={selfNomBusy}
              className="text-sm font-semibold text-clearstrata-ui-primary hover:underline disabled:opacity-50"
              onClick={() => {
                setSelfForm({ name: '', statement: '' });
                setSelfNomOpen(true);
              }}
            >
              {t('meeting_election_self_nominate')}
            </button>
          ) : (
            <div className="space-y-2 pt-1">
              <input
                placeholder={t('meeting_election_candidate_name')}
                value={selfForm.name}
                disabled={selfNomBusy}
                onChange={(e) => setSelfForm((s) => ({ ...s, name: e.target.value }))}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
              />
              <label className="block text-[11px] text-gray-600">
                {t('meeting_election_candidate_unit')}
                <input
                  value={eligibleUnitNo ?? ''}
                  readOnly
                  className="mt-0.5 w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs"
                />
              </label>
              <textarea
                placeholder={t('meeting_election_candidate_statement')}
                value={selfForm.statement}
                disabled={selfNomBusy}
                onChange={(e) => setSelfForm((s) => ({ ...s, statement: e.target.value }))}
                className="min-h-[64px] w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={selfNomBusy || !selfForm.name.trim()}
                  className="rounded-lg bg-clearstrata-ui-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-clearstrata-ui-primaryHover disabled:opacity-50"
                  onClick={() => void submitSelfNomination()}
                >
                  {t('meeting_agenda_save')}
                </button>
                <button
                  type="button"
                  disabled={selfNomBusy}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                  onClick={() => {
                    setSelfNomOpen(false);
                    setSelfForm({ name: '', statement: '' });
                  }}
                >
                  {t('meeting_agenda_cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {showBallotSubmit ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="inline-flex items-center justify-center rounded-lg bg-clearstrata-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover disabled:opacity-50"
        >
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          {t('meeting_election_submit_ballot')}
        </button>
      ) : null}
    </div>
  );
}

export function OwnerVotingPage() {
  const { user, loading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const zh = language !== 'en';

  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [meetingPacks, setMeetingPacks] = useState<MeetingPack[]>([]);

  const [toast, setToast] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [electionSubmitKey, setElectionSubmitKey] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const reload = useCallback(async () => {
    if (!user?.id) {
      setMeetingPacks([]);
      setLoadState('done');
      return;
    }

    setLoadState('loading');
    setLoadError(null);
    try {
      const { data: snapRows, error: snapErr } = await supabase
        .from('owner_vote_voter_snapshot')
        .select(
          `
          id,
          meeting_id,
          property_id,
          unit_no,
          is_eligible,
          owner_vote_meetings (
            id,
            title,
            description,
            meeting_type,
            status,
            scheduled_at,
            voting_opens_at,
            voting_closes_at,
            snapshot_frozen_at,
            created_at
          )
        `,
        )
        .eq('user_id', user.id)
        .eq('is_eligible', true);

      if (snapErr) throw snapErr;

      const rawSnapshots = ((snapRows ?? []) as SnapshotRowRaw[]).filter((r) => {
        const mt = unwrapMeeting(r.owner_vote_meetings);
        if (!mt) return false;
        const st = mt.status.trim().toLowerCase();
        return ['open', 'closed', 'archived', 'ended'].includes(st);
      });

      const meetingIds = [...new Set(rawSnapshots.map((r) => r.meeting_id).filter(Boolean))];
      if (meetingIds.length === 0) {
        setMeetingPacks([]);
        setLoadState('done');
        return;
      }

      const [resRes, ballotRes, ebRes] = await Promise.all([
        supabase
          .from('owner_vote_resolutions')
          .select('id, meeting_id, title, description, threshold, display_order')
          .in('meeting_id', meetingIds)
          .order('display_order', { ascending: true }),
        supabase
          .from('owner_vote_ballots')
          .select('id, meeting_id, resolution_id, unit_no, choice, updated_at')
          .eq('voter_user_id', user.id)
          .in('meeting_id', meetingIds),
        supabase
          .from('owner_election_ballots')
          .select('meeting_id, agenda_item_id, selected_candidate_ids')
          .eq('voter_user_id', user.id)
          .in('meeting_id', meetingIds),
      ]);

      if (resRes.error) throw resRes.error;
      if (ballotRes.error) throw ballotRes.error;
      if (ebRes.error) throw ebRes.error;

      const electionBallotsByMeeting = new Map<string, Map<string, string[]>>();
      for (const row of ((ebRes.data ?? []) as Array<Record<string, unknown>>).filter(Boolean)) {
        const mid = String(row.meeting_id ?? '');
        const aid = String(row.agenda_item_id ?? '');
        if (!mid || !aid) continue;
        const ids = parseStoredCandidateIds(row.selected_candidate_ids);
        if (!electionBallotsByMeeting.has(mid)) electionBallotsByMeeting.set(mid, new Map());
        electionBallotsByMeeting.get(mid)!.set(aid, ids);
      }

      const resolutionList = ((resRes.data ?? []) as unknown[]).map((row): ResolutionRow => {
        const x = row as Record<string, unknown>;
        const displayOrderRaw = x.display_order;
        const display_order =
          typeof displayOrderRaw === 'number'
            ? displayOrderRaw
            : displayOrderRaw != null && String(displayOrderRaw).trim() !== ''
              ? Number(displayOrderRaw)
              : null;
        return {
          id: String(x.id ?? ''),
          meeting_id: String(x.meeting_id ?? ''),
          title: String(x.title ?? ''),
          description: x.description != null ? String(x.description) : null,
          threshold: String(x.threshold ?? ''),
          display_order:
            display_order !== null && Number.isFinite(display_order) ? Math.floor(display_order) : null,
        };
      });

      const ballotList = ((ballotRes.data ?? []) as unknown[])
        .map((row): BallotRow | null => {
          const x = row as Record<string, unknown>;
          const ch = normalizeChoice(x.choice);
          if (!ch) return null;
          return {
            id: String(x.id ?? ''),
            meeting_id: String(x.meeting_id ?? ''),
            resolution_id: String(x.resolution_id ?? ''),
            unit_no: x.unit_no != null ? String(x.unit_no) : null,
            choice: ch,
            updated_at: x.updated_at != null ? String(x.updated_at) : null,
          };
        })
        .filter((b): b is BallotRow => b != null);

      const ballotsByMeetingRes = new Map<string, Map<string, BallotRow>>();
      for (const b of ballotList) {
        if (!ballotsByMeetingRes.has(b.meeting_id)) ballotsByMeetingRes.set(b.meeting_id, new Map());
        ballotsByMeetingRes.get(b.meeting_id)!.set(b.resolution_id, b);
      }

      const byMeetingRes = new Map<string, ResolutionRow[]>();
      for (const res of resolutionList) {
        if (!byMeetingRes.has(res.meeting_id)) byMeetingRes.set(res.meeting_id, []);
        byMeetingRes.get(res.meeting_id)!.push(res);
      }

      const councilIdBySnapshotId = new Map<string, string | null>();
      const snapshotsWithMeeting = rawSnapshots.flatMap((s) => {
        const mt = unwrapMeeting(s.owner_vote_meetings);
        return mt ? [{ s, mt }] : [];
      });
      await Promise.all(
        snapshotsWithMeeting.map(async ({ s, mt }) => {
          const cid = await resolveCouncilMeetingIdForOwnerVoteDescription(
            supabase,
            String(s.property_id ?? '').trim(),
            mt.title,
            mt.description,
          );
          councilIdBySnapshotId.set(String(s.id), cid?.trim() || null);
        }),
      );

      const distinctCouncilIds = [
        ...new Set(
          [...councilIdBySnapshotId.values()].filter((x): x is string => typeof x === 'string' && x.trim() !== ''),
        ),
      ].map((x) => x.trim());

      const councilRowByCouncilId = new Map<string, CouncilMeetingBatchRow>();
      if (distinctCouncilIds.length > 0) {
        const { data: councilBatch, error: councilBatchErr } = await supabase
          .from('meetings')
          .select('id,status,created_at,scheduled_at')
          .in('id', distinctCouncilIds);
        if (councilBatchErr) {
          console.warn('[owner-voting] council meetings batch', councilBatchErr.message);
        } else {
          for (const row of (councilBatch ?? []) as CouncilMeetingBatchRow[]) {
            councilRowByCouncilId.set(String(row.id).trim(), row);
          }
        }
      }

      const packsIncomplete: MeetingPack[] = rawSnapshots.flatMap((s) => {
        const mt = unwrapMeeting(s.owner_vote_meetings);
        if (!mt) return [];
        const res = [...(byMeetingRes.get(s.meeting_id) ?? [])];
        res.sort((a, b) => {
          const da = a.display_order ?? Number.MAX_SAFE_INTEGER;
          const db = b.display_order ?? Number.MAX_SAFE_INTEGER;
          if (da !== db) return da - db;
          return a.title.localeCompare(b.title, zh ? 'zh' : 'en');
        });
        const sel = electionBallotsByMeeting.get(s.meeting_id);
        const cidResolved = councilIdBySnapshotId.get(String(s.id)) ?? null;
        const key = cidResolved?.trim() ?? '';
        const crow = key ? councilRowByCouncilId.get(key) ?? null : null;

        return [
          {
            snapshotId: s.id,
            meetingId: s.meeting_id,
            propertyId: s.property_id,
            unitNo: s.unit_no,
            meeting: mt,
            resolutions: res,
            ballotsByResolution: new Map(ballotsByMeetingRes.get(s.meeting_id) ?? []),
            electionAgendas: [],
            electionSelections: sel ? new Map(sel) : new Map<string, string[]>(),
            councilMeetingId: cidResolved,
            councilMeetingStatus: crow?.status != null && String(crow.status).trim() !== '' ? String(crow.status).trim() : null,
            councilMeetingScheduledAt: crow?.scheduled_at ?? null,
            councilMeetingCreatedAt: crow?.created_at ?? null,
          },
        ];
      });

      packsIncomplete.sort(compareOwnerMeetingPacksBySchedule);

      const packs: MeetingPack[] = await Promise.all(
        packsIncomplete.map(async (p) => {
          let electionAgendas: ElectionAgendaBrief[] = [];
          try {
            const cid = p.councilMeetingId?.trim() ?? '';
            if (cid) {
              const ag = await supabase
                .from('meeting_agenda_items')
                .select('id, title_zh, title_en, description_zh, sort_order')
                .eq('meeting_id', cid)
                .eq('property_id', p.propertyId);
              if (ag.error) {
                console.warn('[owner-voting] meeting_agenda_items for election', ag.error.message);
              } else {
                const rows =
                  ((ag.data ?? []) as unknown as Array<{
                    id: string;
                    title_zh: string | null;
                    title_en: string | null;
                    description_zh: string | null;
                    sort_order: number | null;
                  }>) ?? [];
                for (const row of rows) {
                  const m = extractElectionAgendaMeta(row.description_zh ?? '').meta;
                  if (m?.agenda_type !== 'council_election') continue;
                  electionAgendas.push({
                    agendaItemId: row.id,
                    sortOrder: row.sort_order != null && Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 9999,
                    title: row.title_zh?.trim() || row.title_en?.trim() || '',
                    meta: finalizeElectionMeta(m),
                  });
                }
                electionAgendas.sort((a, b) => a.sortOrder - b.sortOrder);
              }
            }
          } catch (e) {
            console.warn('[owner-voting] election agenda resolve', e);
          }
          return { ...p, electionAgendas };
        }),
      );

      packs.sort(compareOwnerMeetingPacksBySchedule);

      setMeetingPacks(packs);
      setLoadState('done');
    } catch (e: unknown) {
      console.error('[owner-voting]', e);
      const msg = e instanceof Error ? e.message : String(e);
      setLoadError(msg);
      setLoadState('error');
      setMeetingPacks([]);
    }
  }, [user?.id, zh]);

  useEffect(() => {
    if (authLoading) return;
    void reload();
  }, [authLoading, reload]);

  const submitVote = useCallback(
    async (resolutionId: string, choice: VoteChoice) => {
      if (!user?.id) {
        setToast({ kind: 'error', text: zh ? '请先登录' : 'Please sign in.' });
        return;
      }
      setSubmittingId(resolutionId);
      try {
        const { error } = await supabase.rpc('submit_owner_vote', {
          p_resolution_id: resolutionId,
          p_choice: choice,
        });
        if (error) {
          const mapped = parseRpcError(error.message, zh);
          setToast({
            kind: 'error',
            text: mapped ?? error.message,
          });
          return;
        }
        setToast({ kind: 'success', text: zh ? '投票已记录' : 'Vote recorded.' });
        await reload();
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : String(e);
        setToast({ kind: 'error', text: parseRpcError(raw, zh) ?? raw });
      } finally {
        setSubmittingId(null);
      }
    },
    [user?.id, zh, reload],
  );

  const now = new Date();
  const headline = zh ? '业主电子表决' : 'Owner electronic voting';
  const subline = zh
    ? '在规定时间内直接完成 SGM / AGM 决议表决。系统按一户一票记录，并自动归档审计记录。'
    : 'Cast your SGM / AGM resolution votes within the voting window. One vote per unit; audit trails are retained.';

  if (authLoading || loadState === 'loading' || loadState === 'idle') {
    return (
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-3 px-4 py-12 text-gray-600">
        <Loader2 className="h-10 w-10 animate-spin text-clearstrata-ui-primary" aria-hidden />
        <p className="text-sm">{zh ? '加载中…' : 'Loading…'}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-center">
        <p className="text-gray-700">{zh ? '请先登录后查看业主表决。' : 'Please sign in to view owner voting.'}</p>
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="mx-auto max-w-5xl space-y-3 px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900">{headline}</h1>
        <p className="text-sm text-red-700">{loadError ?? (zh ? '加载失败' : 'Failed to load')}</p>
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          {zh ? '重试' : 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      {toast ? (
        <div
          className={`fixed bottom-6 left-1/2 z-[60] max-w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border px-4 py-3 text-sm shadow-lg ${
            toast.kind === 'success'
              ? 'border-clearstrata-state-success-border bg-clearstrata-state-success-surface text-clearstrata-state-success-text'
              : toast.kind === 'info'
                ? 'border-gray-300 bg-gray-900 text-white'
                : 'border-clearstrata-state-danger-border bg-clearstrata-state-danger-surface text-clearstrata-state-danger-text'
          }`}
          role="status"
        >
          {toast.text}
        </div>
      ) : null}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{headline}</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600 sm:text-base">{subline}</p>
        <p className="mt-3">
          <Link to="/meetings" className="text-sm font-medium text-clearstrata-ui-primary hover:underline">
            {`« ${t('meeting_back_list')}`}
          </Link>
        </p>
      </div>

      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-gray-900">{zh ? '发起特别大会联署' : 'SGM petition (reserved)'}</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          {zh
            ? '当业委会不作为时，业主可依法发起 SGM 联署；达到法定门槛后可升级为正式特别大会。'
            : 'When the strata council cannot act, owners may pursue a lawful SGM petition; once statutory thresholds are met it may become a formal special general meeting.'}
        </p>
        <button
          type="button"
          className="mt-4 rounded-lg bg-clearstrata-ui-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive disabled:opacity-60"
          onClick={() => setToast({ kind: 'info', text: zh ? '联署发起功能即将开放。' : 'Petition launch is opening soon.' })}
        >
          {zh ? '发起联署' : 'Start petition'}
        </button>
      </div>

      {meetingPacks.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-600 shadow-sm">
          {zh ? '当前没有需要你参与的业主表决。' : 'There is no owner vote that requires your participation right now.'}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {meetingPacks.map((pack) => {
            const mt = pack.meeting;
            const ms = mt.status.trim();

            const effectivePhase = getEffectiveVotingPhase(
              pack.councilMeetingStatus,
              mt.voting_opens_at,
              mt.voting_closes_at,
              ms,
              now,
            );
            const votesEnabled = effectivePhase === 'voting_live';
            const councilStNorm = String(pack.councilMeetingStatus ?? '').trim().toLowerCase();
            const isCouncilDraft = councilStNorm === 'draft';

            const electionNomRibbonPack = pack.electionAgendas.length
              ? buildElectionNominationRibbon(pack.electionAgendas.map((e) => finalizeElectionMeta(e.meta, now)))
              : null;

            const dateOpts: Intl.DateTimeFormatOptions =
              zh
                ? { dateStyle: 'short', timeStyle: 'short' }
                : { dateStyle: 'medium', timeStyle: 'short' };

            const fmtTs = (iso: string | null) => {
              if (!iso) return zh ? '—' : '—';
              const d = new Date(iso);
              if (Number.isNaN(d.getTime())) return zh ? '—' : '—';
              return d.toLocaleString(zh ? 'zh-CN' : 'en-CA', dateOpts);
            };

            return (
              <article key={pack.snapshotId} className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="mb-2 inline-flex items-center rounded-lg bg-clearstrata-ui-soft px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-clearstrata-brand-900 ring-1 ring-clearstrata-ui-softBorder">
                        {meetingTypeLabel(mt.meeting_type, zh)}
                      </span>
                      <h2 className="mt-2 text-lg font-bold text-gray-900 sm:text-xl">{mt.title}</h2>
                      {(() => {
                        const vis = stripCouncilMeetingBinding(mt.description ?? '');
                        return vis.trim() ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{vis}</p>
                        ) : null;
                      })()}
                      <p className="mt-3 text-sm text-gray-700">
                        <span className="font-medium text-gray-900">{zh ? '你的房号：' : 'Your unit:'}</span>{' '}
                        {pack.unitNo?.trim() || (zh ? '—' : '—')}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">{zh ? '每户一票 · 以系统记录为准' : 'One vote per unit · as recorded system-side'}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <StatusBadge tone={votingPhaseTone(effectivePhase)} size="sm">
                        {phaseStatusHeadlineLabel(effectivePhase, pack.councilMeetingStatus, zh)}
                      </StatusBadge>
                    </div>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <dt className="text-xs text-gray-500">{zh ? '投票开放' : 'Voting opens'}</dt>
                      <dd className="font-medium text-gray-900">{fmtTs(mt.voting_opens_at)}</dd>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <dt className="text-xs text-gray-500">{zh ? '投票截止' : 'Voting closes'}</dt>
                      <dd className="font-medium text-gray-900">{fmtTs(mt.voting_closes_at)}</dd>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <dt className="text-xs text-gray-500">{zh ? '表决状态' : 'Owner vote status'}</dt>
                      <dd className="font-medium text-gray-900">{mt.status.trim() || '—'}</dd>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <dt className="text-xs text-gray-500">{zh ? '名单冻结时间' : 'Snapshot frozen'}</dt>
                      <dd className="font-medium text-gray-900">{fmtTs(mt.snapshot_frozen_at ?? null)}</dd>
                    </div>
                    {electionNomRibbonPack ? (
                      <>
                        <div className="rounded-lg bg-amber-50/60 px-3 py-2 ring-1 ring-amber-100 sm:col-span-2">
                          <dt className="text-xs text-gray-600">{t('meeting_election_nomination')}</dt>
                          <dd className="font-medium text-gray-900">
                            {electionNomRibbonPack.anyNominationOpen
                              ? t('meeting_election_nomination_open')
                              : t('meeting_election_nomination_closed')}
                          </dd>
                        </div>
                        <div className="rounded-lg bg-amber-50/60 px-3 py-2 ring-1 ring-amber-100 sm:col-span-2">
                          <dt className="text-xs text-gray-600">{t('meeting_election_nomination_closes')}</dt>
                          <dd className="font-medium text-gray-900">{fmtTs(electionNomRibbonPack.nominationClosesIso)}</dd>
                        </div>
                        <div className="rounded-lg bg-amber-50/60 px-3 py-2 ring-1 ring-amber-100 sm:col-span-2">
                          <dt className="text-xs text-gray-600">{t('meeting_election_candidates')}</dt>
                          <dd className="font-medium text-gray-900">{electionNomRibbonPack.totalCandidates}</dd>
                        </div>
                      </>
                    ) : null}
                  </dl>
                  {effectivePhase === 'not_started' ? (
                    <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-gray-800">
                      {isCouncilDraft ? (
                        zh ? (
                          '业委会大会尚未放行业主表决。'
                        ) : (
                          'The council meeting has not opened owner voting yet.'
                        )
                      ) : zh ? (
                        <>
                          投票尚未开放，将于 <span className="font-semibold">{fmtTs(mt.voting_opens_at)}</span> 开放。
                        </>
                      ) : (
                        <>
                          Voting is not open yet. Opens at{' '}
                          <span className="font-semibold">{fmtTs(mt.voting_opens_at)}</span>.
                        </>
                      )}
                    </p>
                  ) : null}
                </div>

                <div className="px-5 pb-5 sm:px-6">
                  <div className="divide-y divide-gray-100">
                    {pack.resolutions.length === 0 && pack.electionAgendas.length === 0 ? (
                      <p className="py-8 text-center text-sm text-gray-500">
                        {zh ? '暂无表决或选举议程。' : 'No resolutions or elections for this meeting.'}
                      </p>
                    ) : null}
                    {pack.resolutions.length > 0
                      ? pack.resolutions.map((res) => {
                      const ballot = pack.ballotsByResolution.get(res.id);
                      const submitting = submittingId === res.id;
                      const choiceBtn =
                        `inline-flex min-h-[42px] flex-1 items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-0`;

                      return (
                        <div key={res.id} className="py-5 first:pt-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <h3 className="text-base font-semibold text-gray-900">{res.title}</h3>
                            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                              {thresholdLabel(res.threshold, zh)}
                            </span>
                          </div>
                          {res.description ? (
                            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{res.description}</p>
                          ) : null}
                          {votesEnabled ? (
                          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => void submitVote(res.id, 'yes')}
                              className={`${choiceBtn} border-clearstrata-ui-primary bg-clearstrata-ui-soft text-clearstrata-brand-900 ring-1 ring-clearstrata-ui-softBorder ${
                                ballot?.choice === 'yes'
                                  ? 'bg-clearstrata-ui-primary text-white ring-clearstrata-ui-primaryHover'
                                  : 'hover:bg-clearstrata-brand-50'
                              }`}
                            >
                              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              {t('meeting_vote_yes')}
                            </button>
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => void submitVote(res.id, 'no')}
                              className={`${choiceBtn} border-red-300 text-red-800 hover:bg-red-50 ${
                                ballot?.choice === 'no'
                                  ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
                                  : ''
                              }`}
                            >
                              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              {t('meeting_vote_no')}
                            </button>
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => void submitVote(res.id, 'abstain')}
                              className={`${choiceBtn} border-gray-300 text-gray-800 hover:bg-gray-50 ${
                                ballot?.choice === 'abstain'
                                  ? 'border-gray-600 bg-gray-700 text-white hover:bg-gray-800'
                                  : ''
                              }`}
                            >
                              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              {t('meeting_vote_abstain')}
                            </button>
                          </div>
                          ) : null}
                          {ballot?.updated_at ? (
                            <p className="mt-2 text-[11px] text-gray-500">
                              {zh ? '最近一次提交：' : 'Last submitted: '}
                              {new Date(ballot.updated_at).toLocaleString(zh ? 'zh-CN' : 'en-CA', dateOpts)}
                            </p>
                          ) : null}
                        </div>
                      );
                    })
                      : null}
                  </div>
                  {pack.electionAgendas.length > 0 ? (
                    <div className={`space-y-4 ${pack.resolutions.length > 0 ? 'mt-6 border-t border-gray-100 pt-6' : 'pt-4'}`}>
                      {pack.electionAgendas.map((ea) => {
                        const k = `${pack.meetingId}:${ea.agendaItemId}`;
                        const initial = pack.electionSelections.get(ea.agendaItemId) ?? [];
                        return (
                          <OwnerCouncilElectionBlock
                            key={`${ea.agendaItemId}:${initial.join('|')}`}
                            zh={zh}
                            t={t}
                            meetingId={pack.meetingId}
                            brief={ea}
                            votePhase={effectivePhase}
                            ownerMeetingStatus={ms}
                            eligibleUnitNo={pack.unitNo}
                            busy={electionSubmitKey === k}
                            initialSelected={initial}
                            onBusy={(v) => setElectionSubmitKey(v ? k : null)}
                            onToast={setToast}
                            onReload={reload}
                          />
                        );
                      })}
                    </div>
                  ) : null}
                </div>
                <div className="border-t border-gray-100 px-5 py-4 sm:px-6">
                  <Link
                    to={`/voting/${encodeURIComponent((pack.councilMeetingId ?? pack.meetingId).trim())}?${new URLSearchParams({
                      propertyId: String(pack.propertyId),
                    }).toString()}`}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-clearstrata-ui-primary px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive sm:w-auto sm:min-w-[11rem]"
                  >
                    {ownerVoteMeetingShowsViewResults(mt, effectivePhase)
                      ? zh
                        ? '查看结果'
                        : 'View results'
                      : zh
                        ? '进入会议投票'
                        : 'Enter meeting voting'}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
