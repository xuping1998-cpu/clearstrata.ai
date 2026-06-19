import type { ReactNode } from 'react';
import { evaluateOwnerVoteOpenGate, resolveOwnerVoteDisplayEligible, type MeetingRow, type OwnerVoteMeetingLite } from '@/features/meetings/api';
import {
  councilMeetingVotingWindowFallback,
  councilWrittenRemoteWindows,
  isWrittenRemoteV3Meeting,
  resolveWrittenRemoteV3FormalVoteStatus,
  writtenRemoteV3AutoParticipationCopy,
} from '@/features/meetings/meetingFormatModel';
import {
  agmSgmScheduledNotSetLabel,
  formatElectionNominationUiStatus,
  isStrictAgmOrSgmMeeting,
  type ElectionNominationRibbonModel,
} from '@/features/meetings/electionAgendaModel';
import {
  deriveAgmSgmCanonDisplayWindows,
  deriveCouncilElectionCanonFromScheduledAt,
  deriveRemoteWrittenV3CanonFromScheduledAt,
} from '@/features/meetings/electionTimelineMath';

export type OwnerVoteInlineMetaState = {
  loading: boolean;
  meeting: OwnerVoteMeetingLite | null;
  resolutions: Array<{ id: string; title: string; threshold: string; display_order?: number | null }>;
  resolutionCount: number;
  /** Frozen snapshot eligible units (`owner_vote_voter_snapshot`). */
  eligibleCount: number;
  /** Live eligible units from `property_members` before freeze. */
  eligibleNowCount: number;
};

export type OwnerVotingInlineControlBarProps = {
  meeting: MeetingRow;
  /** Council `meetings.status`: closed / ended / archived — disables staff OV actions and enable. */
  isCouncilMeetingEnded?: boolean;
  isStaff: boolean;
  userId: string | undefined;
  languageEn: boolean;
  t: (key: string) => string;
  onNavigateOwnerVoting: () => void;
  meta: OwnerVoteInlineMetaState;
  ovBusy: boolean;
  canEnableBinding: boolean;
  onEnableElectronicVoting: () => void | Promise<void>;
  onFreezeSnapshot: () => void | Promise<void>;
  onOpenVoting: () => void | Promise<void>;
  onCloseVoting: () => void | Promise<void>;
  electionNomRibbon?: ElectionNominationRibbonModel | null;
  councilFormalResolutionAgendaCount?: number;
  electionAgendaCount?: number;
  /**
   * Viewer is an eligible voter for this meeting (resolved from
   * `owner_vote_voter_snapshot.is_eligible` for `auth.uid()`). Council members
   * who also own a unit must keep voting access — gate the "Go vote" button on
   * snapshot eligibility, not on `isStaff` / role.
   */
  viewerIsEligibleVoter?: boolean;
};

function fmtTs(iso: string | null | undefined, en: boolean): string {
  if (!iso?.trim()) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(en ? 'en-CA' : 'zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatVoterRollFreezeCountdown(
  plannedIso: string | null | undefined,
  now: Date,
  en: boolean,
): string | null {
  const iso = plannedIso?.trim();
  if (!iso) return null;
  const targetMs = new Date(iso).getTime();
  const nowMs = now.getTime();
  if (Number.isNaN(targetMs) || targetMs <= nowMs) return null;
  const totalHours = Math.floor((targetMs - nowMs) / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (en) {
    const dayPart = days === 1 ? '1 day' : `${days} days`;
    const hourPart = hours === 1 ? '1 hour' : `${hours} hours`;
    return `${dayPart} ${hourPart}`;
  }
  return `${days}天 ${hours}小时`;
}

function sectionCard(label: ReactNode, children: ReactNode) {
  return (
    <div className="rounded-md border border-gray-100 bg-white px-3 py-2 shadow-sm space-y-1">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div>{children}</div>
    </div>
  );
}

export function OwnerVotingInlineControlBar({
  meeting,
  isCouncilMeetingEnded = false,
  isStaff,
  userId,
  languageEn,
  t,
  onNavigateOwnerVoting,
  meta,
  ovBusy,
  canEnableBinding,
  onEnableElectronicVoting,
  onFreezeSnapshot,
  onOpenVoting,
  onCloseVoting,
  electionNomRibbon = null,
  councilFormalResolutionAgendaCount = 0,
  electionAgendaCount = 0,
  viewerIsEligibleVoter = false,
}: OwnerVotingInlineControlBarProps) {
  const en = languageEn;
  const now = new Date();
  const hideStaffOvManualLifecycle = isWrittenRemoteV3Meeting(meeting);
  const isV3 = hideStaffOvManualLifecycle;
  const v3AutoParticipationCopy = writtenRemoteV3AutoParticipationCopy(en);
  const v3Canon = isV3 ? deriveRemoteWrittenV3CanonFromScheduledAt(meeting.scheduled_at) : null;
  const noticePeriodLabel = en ? 'Public Notice / Discussion Period' : '公示 / 讨论期';
  const ov = meta.meeting;
  const agmSgmStrict = isStrictAgmOrSgmMeeting(meeting);
  const legacyAgmDisp = agmSgmStrict && !isV3
    ? deriveAgmSgmCanonDisplayWindows(meeting.scheduled_at, electionAgendaCount > 0)
    : null;
  const agmDisp =
    isV3 && v3Canon
      ? {
          publicNoticeOpenIso: v3Canon.publicNoticeOpenIso,
          publicNoticeCloseIso: v3Canon.publicNoticeCloseIso,
          nominationOpenIso: v3Canon.nominationOpenIso,
          nominationCloseIso: v3Canon.nominationCloseIso,
          votingOpenIso: v3Canon.votingOpenIso,
          votingCloseIso: v3Canon.votingCloseIso,
        }
      : legacyAgmDisp;
  const flowNotSet = agmSgmScheduledNotSetLabel(en);

  let displayPublicNoticeOpens: string | null = null;
  let displayPublicNoticeCloses: string | null = null;
  if (agmSgmStrict) {
    if (agmDisp) {
      displayPublicNoticeOpens = agmDisp.publicNoticeOpenIso;
      displayPublicNoticeCloses = agmDisp.publicNoticeCloseIso;
    }
  } else {
    const disc = councilWrittenRemoteWindows(meeting);
    const discOpen = disc.publicNoticeOpens?.trim() ? disc.publicNoticeOpens : '';
    const discClose = disc.publicNoticeCloses?.trim() ? disc.publicNoticeCloses : '';
    displayPublicNoticeOpens = discOpen || null;
    displayPublicNoticeCloses = discClose || null;
    if (!discOpen && !discClose && meeting.scheduled_at?.trim()) {
      if (isWrittenRemoteV3Meeting(meeting)) {
        const v3 = deriveRemoteWrittenV3CanonFromScheduledAt(meeting.scheduled_at);
        if (v3) {
          displayPublicNoticeOpens = v3.publicNoticeOpenIso;
          displayPublicNoticeCloses = v3.publicNoticeCloseIso;
        }
      } else {
        const canon = deriveCouncilElectionCanonFromScheduledAt(meeting.scheduled_at);
        if (canon) {
          displayPublicNoticeOpens = canon.publicNoticeOpenIso;
          displayPublicNoticeCloses = canon.publicNoticeCloseIso;
        }
      }
    }
  }

  const fallbackVoting = councilMeetingVotingWindowFallback(meeting);
  const hasElectionAgenda = electionNomRibbon != null;

  /** Inline election ballot lives on the meeting detail page; skip list navigation. */
  const hideNavigateGoVote = electionAgendaCount > 0;

  let displayVotingOpens: string | null = null;
  let displayVotingCloses: string | null = null;
  if (agmSgmStrict) {
    if (agmDisp) {
      displayVotingOpens = agmDisp.votingOpenIso;
      displayVotingCloses = agmDisp.votingCloseIso;
    }
  } else {
    displayVotingOpens = ov?.voting_opens_at?.trim() ? ov.voting_opens_at : fallbackVoting.votingOpens ?? null;
    displayVotingCloses = ov?.voting_closes_at?.trim() ? ov.voting_closes_at : fallbackVoting.votingCloses ?? null;
  }

  const displayNominationOpens =
    isV3 && v3Canon
      ? v3Canon.nominationOpenIso
      : electionNomRibbon?.nominationOpensIso ?? null;
  const displayNominationCloses =
    isV3 && v3Canon
      ? v3Canon.nominationCloseIso
      : electionNomRibbon?.nominationClosesIso ?? null;

  const showNoticeSection = agmSgmStrict || !!(displayPublicNoticeOpens || displayPublicNoticeCloses);

  const ovStatusLower = ov?.status?.trim().toLowerCase() ?? '';
  const staffOvActionsReadOnly = ovStatusLower === 'closed' || ovStatusLower === 'archived';
  const showFreeze =
    !hideStaffOvManualLifecycle && !isCouncilMeetingEnded && isStaff && !!ov && !staffOvActionsReadOnly;
  const showOpen = !hideStaffOvManualLifecycle && !isCouncilMeetingEnded && isStaff && ovStatusLower === 'draft';
  const showClose = !hideStaffOvManualLifecycle && !isCouncilMeetingEnded && isStaff && ovStatusLower === 'open';

  const snapshotOk = !!(ov?.snapshot_frozen_at?.trim());
  const displayEligibleCount =
    ov && !meta.loading
      ? resolveOwnerVoteDisplayEligible({
          snapshotFrozenAt: ov.snapshot_frozen_at,
          eligibleCount: meta.eligibleCount,
          eligibleNowCount: meta.eligibleNowCount,
        })
      : null;
  const eligibleOk = snapshotOk ? meta.eligibleCount > 0 : meta.eligibleNowCount > 0;
  const showManualFreezeNow =
    isStaff && !!ov && !snapshotOk && !isCouncilMeetingEnded && !staffOvActionsReadOnly;
  const plannedFreezeDisplayIso = ov?.snapshot_freeze_at?.trim() || meeting.scheduled_at?.trim() || null;
  const voterRollFreezeCountdown = formatVoterRollFreezeCountdown(plannedFreezeDisplayIso, now, en);
  const showVoterRollFreezeCountdown = !snapshotOk && voterRollFreezeCountdown != null;

  const electionTimelineBlocksVoting = Boolean(
    electionNomRibbon?.nominationUiStatus === 'invalid',
  );

  const openGateDraft =
    showOpen && ov
      ? evaluateOwnerVoteOpenGate({
          ov,
          eligibleCount: meta.eligibleCount,
          resolutionCount: meta.resolutionCount,
          electionAgendaCount,
          electionTimelineBlocksVoting,
        })
      : { ok: true as const };

  const showFreezePrereqHint = showOpen && isStaff && !!ov && (!snapshotOk || !eligibleOk);
  const openVoteButtonDisabledStaff = !!(showOpen && isStaff && (ovBusy || !openGateDraft.ok));

  const nominationPhaseLabel =
    hasElectionAgenda && electionNomRibbon
      ? formatElectionNominationUiStatus(electionNomRibbon.nominationUiStatus, { t, languageEn: en })
      : '';

  function voteStatusLine(): string {
    if (meta.loading) return '…';
    if (isCouncilMeetingEnded) return t('meeting_status_closed');
    if (!ov) return t('vote_not_enabled');
    if (hideStaffOvManualLifecycle) {
      const v3Status = resolveWrittenRemoteV3FormalVoteStatus(meeting, ov, now);
      if (v3Status === 'draft') return t('vote_draft');
      if (v3Status === 'waiting_freeze') return t('vote_waiting_freeze');
      if (v3Status === 'open') return t('vote_open');
      if (v3Status === 'closed') return t('meeting_status_closed');
    }
    switch (ovStatusLower) {
      case 'draft':
        return t('vote_draft');
      case 'open':
        return t('vote_open');
      case 'closed':
        return t('vote_closed');
      case 'archived':
        return t('vote_archived');
      default:
        return ov.status?.trim() || '—';
    }
  }

  const resolutionsShown =
    ov && !meta.loading ? meta.resolutionCount : Math.max(0, Number(councilFormalResolutionAgendaCount) || 0);
  /** totalCandidates = Σ candidates.length across election agenda metas (buildElectionNominationRibbon). */
  const candidatesShown = hasElectionAgenda ? (electionNomRibbon?.totalCandidates ?? 0) : 0;
  const eligDisplay = displayEligibleCount != null ? String(displayEligibleCount) : '—';

  const summaryLineKey = hasElectionAgenda
    ? snapshotOk
      ? 'meeting_flow_summary_line_full'
      : 'meeting_flow_summary_line_full_now'
    : snapshotOk
      ? 'meeting_flow_summary_line_plain'
      : 'meeting_flow_summary_line_plain_now';

  const summaryBody = t(summaryLineKey)
    .replace('{res}', String(resolutionsShown))
    .replace('{cand}', String(candidatesShown))
    .replace('{elig}', eligDisplay);

  const summaryHeading = hasElectionAgenda ? t('meeting_flow_summary_heading_full') : t('meeting_flow_summary_heading_plain');

  const v3MeetingPeriodLabel = hasElectionAgenda
    ? t('meeting_v3_meeting_period_with_nomination')
    : t('meeting_v3_meeting_period_discussion_only');
  const v3ParticipationOpenIso = v3Canon?.publicNoticeOpenIso ?? displayPublicNoticeOpens;
  const v3ParticipationCloseIso = v3Canon?.publicNoticeCloseIso ?? displayPublicNoticeCloses;
  const v3FormalVotingCloseIso =
    v3Canon?.votingCloseIso ?? displayVotingCloses ?? ov?.voting_closes_at ?? null;
  const v3FormalVotingClosesFmt = fmtTs(v3FormalVotingCloseIso, en);
  const v3FormalVotingOpen = snapshotOk && ovStatusLower === 'open';
  const v3FormalVotingBody = (
    v3FormalVotingOpen ? t('meeting_v3_formal_voting_body_open') : t('meeting_v3_formal_voting_body_pending')
  ).replace('{closes}', v3FormalVotingClosesFmt);

  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm space-y-4">
      <h3 className="text-base font-semibold text-gray-900">{t('meeting_ev_status_title')}</h3>

      <div className="space-y-3">
        {isV3 ? (
          <>
            {sectionCard(
              v3MeetingPeriodLabel,
              !v3ParticipationOpenIso && !v3ParticipationCloseIso ? (
                <p className="text-gray-500">{flowNotSet}</p>
              ) : (
                <p className="text-gray-900">
                  {fmtTs(v3ParticipationOpenIso, en)} <span className="text-gray-400 px-1">–</span>{' '}
                  {fmtTs(v3ParticipationCloseIso, en)}
                </p>
              ),
            )}
            {sectionCard(
              t('meeting_v3_formal_voting_label'),
              <p className="text-gray-900">{v3FormalVotingBody}</p>,
            )}
          </>
        ) : (
          <>
            {showNoticeSection
              ? sectionCard(
                  noticePeriodLabel,
                  agmSgmStrict && !agmDisp ? (
                    <p className="text-gray-500">{flowNotSet}</p>
                  ) : (
                    <p className="text-gray-900">
                      {fmtTs(displayPublicNoticeOpens, en)} <span className="text-gray-400 px-1">–</span>{' '}
                      {fmtTs(displayPublicNoticeCloses, en)}
                    </p>
                  ),
                )
              : null}

            {hasElectionAgenda && electionNomRibbon
              ? sectionCard(
                  t('meeting_flow_nomination_period_label'),
                  <>
                    <p className="text-gray-900">
                      {agmSgmStrict && !agmDisp ? (
                        <span className="text-gray-500">{flowNotSet}</span>
                      ) : displayNominationOpens || displayNominationCloses ? (
                        <>
                          {fmtTs(displayNominationOpens, en)}{' '}
                          <span className="text-gray-400 px-1">–</span>{' '}
                          {fmtTs(displayNominationCloses, en)}
                        </>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 font-medium">{nominationPhaseLabel}</p>
                  </>,
                )
              : null}

            {sectionCard(
              t('meeting_ov_voting_period_combined_label'),
              agmSgmStrict && !agmDisp ? (
                <p className="text-gray-500">{flowNotSet}</p>
              ) : (
                <p className="text-gray-900">
                  {fmtTs(displayVotingOpens, en)} <span className="text-gray-400 px-1">–</span>{' '}
                  {fmtTs(displayVotingCloses, en)}
                </p>
              ),
            )}
          </>
        )}

        {sectionCard(
          t('voting_status'),
          <p className="font-medium text-gray-900">{voteStatusLine()}</p>,
        )}

        {ov && !meta.loading
          ? sectionCard(
              snapshotOk ? t('meeting_ov_eligible_frozen') : t('meeting_ov_eligible_now'),
              <p className="font-medium text-gray-900">{displayEligibleCount ?? '—'}</p>,
            )
          : null}

        {ov
          ? sectionCard(
              t('meeting_ev_snapshot_label'),
              <p className="font-medium text-gray-900">
                {snapshotOk ? t('meeting_ov_frozen') : t('meeting_ov_not_frozen')}
              </p>,
            )
          : null}

        {ov
          ? sectionCard(
              snapshotOk ? t('meeting_ov_voter_roll_frozen_at') : t('meeting_ov_voter_roll_planned_freeze'),
              <>
                <p className="font-medium text-gray-900">
                  {fmtTs(snapshotOk ? ov.snapshot_frozen_at : plannedFreezeDisplayIso, en)}
                </p>
                {snapshotOk ? (
                  <div
                    className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-950 space-y-1.5"
                    role="status"
                  >
                    <p>{t('meeting_ov_voter_roll_post_freeze_p1')}</p>
                    <p>{t('meeting_ov_voter_roll_post_freeze_p2')}</p>
                    <p>{t('meeting_ov_voter_roll_post_freeze_p3')}</p>
                  </div>
                ) : (
                  <div
                    className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 space-y-1.5"
                    role="alert"
                  >
                    {showVoterRollFreezeCountdown ? (
                      <p className="font-semibold">
                        {t('meeting_ov_voter_roll_freeze_countdown_prefix')} {voterRollFreezeCountdown}
                      </p>
                    ) : null}
                    <p className="font-semibold">{t('meeting_ov_voter_roll_pre_freeze_note_title')}</p>
                    <p>{t('meeting_ov_voter_roll_pre_freeze_p1')}</p>
                    <p>{t('meeting_ov_voter_roll_pre_freeze_p2')}</p>
                    <p>{t('meeting_ov_voter_roll_pre_freeze_p3')}</p>
                    <p>{t('meeting_ov_voter_roll_pre_freeze_p4')}</p>
                  </div>
                )}
              </>,
            )
          : null}

        <div className="rounded-md border border-clearstrata-brand-100 bg-clearstrata-brand-50/35 px-3 py-2 shadow-inner space-y-1">
          <div className="text-xs font-medium text-gray-600">{summaryHeading}</div>
          <p className="text-gray-900 font-medium">{summaryBody}</p>
        </div>
      </div>

      {meta.loading ? (
        <p className="text-xs text-gray-500">{t('meeting_ov_loading')}</p>
      ) : !ov ? (
        hideStaffOvManualLifecycle ? (
          <div className="space-y-3 border-t border-gray-200/90 pt-3">
            {isCouncilMeetingEnded ? (
              <p className="text-sm text-amber-800 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                {en
                  ? 'This meeting has ended. The voting workflow is closed.'
                  : '会议已结束，投票流程已关闭。'}
              </p>
            ) : (
              <p className="text-sm text-gray-800 rounded-md border border-blue-100 bg-blue-50/70 px-3 py-2">
                {v3AutoParticipationCopy}
              </p>
            )}
          </div>
        ) : isStaff ? (
          <div className="space-y-3 border-t border-gray-200/90 pt-3">
            {isCouncilMeetingEnded ? (
              <p className="text-sm text-amber-800 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                {en
                  ? 'This meeting has ended. The voting workflow is closed.'
                  : '会议已结束，投票流程已关闭。'}
              </p>
            ) : (
              <div className="space-y-3">
                {electionTimelineBlocksVoting ? (
                  <p className="text-sm rounded-md border border-red-300 bg-red-50 px-3 py-2 font-semibold text-red-800">
                    {t('meeting_election_time_overlap_admin_warn')}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={ovBusy || !userId || !canEnableBinding || electionTimelineBlocksVoting}
                    onClick={() => void onEnableElectronicVoting()}
                    className="rounded-lg bg-clearstrata-ui-primary px-4 py-2 text-sm font-medium text-white hover:bg-clearstrata-ui-primaryHover disabled:opacity-50"
                  >
                    {t('meeting_ov_enable')}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 border-t border-gray-200/90 pt-3">
            {isCouncilMeetingEnded ? (
              <p className="text-sm text-amber-800 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                {en
                  ? 'This meeting has ended. The voting workflow is closed.'
                  : '会议已结束，投票流程已关闭。'}
              </p>
            ) : null}
            <p className="text-gray-600">{t('meeting_ov_owner_not_open')}</p>
          </div>
        )
      ) : (
        <div className="space-y-3 border-t border-gray-200/90 pt-3">
          {isCouncilMeetingEnded ? (
            <p className="text-sm text-amber-800 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              {en
                ? 'This meeting has ended. The voting workflow is closed.'
                : '会议已结束，投票流程已关闭。'}
            </p>
          ) : hideStaffOvManualLifecycle ? (
            <>
              <p className="text-sm text-gray-800 rounded-md border border-blue-100 bg-blue-50/70 px-3 py-2">
                {v3AutoParticipationCopy}
              </p>
              {showManualFreezeNow ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={ovBusy}
                    onClick={() => void onFreezeSnapshot()}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {t('meeting_ov_freeze_roll_now')}
                  </button>
                </div>
              ) : null}
              {!hideNavigateGoVote && (!isStaff || viewerIsEligibleVoter) ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onNavigateOwnerVoting}
                    className="rounded-lg bg-clearstrata-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover"
                  >
                    {t('meeting_ov_go_vote')}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              {!isStaff ? <p className="text-gray-600">{t('meeting_ov_owner_notice')}</p> : null}

              {showFreezePrereqHint ? (
                <p className="text-sm text-amber-800 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                  {t('meeting_ov_flow_hint_freeze_snap')}
                </p>
              ) : null}

              {electionTimelineBlocksVoting ? (
                <p className="text-sm rounded-md border border-red-300 bg-red-50 px-3 py-2 font-semibold text-red-800">
                  {t('meeting_election_time_overlap_admin_warn')}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {isStaff ? (
                  <>
                    {showFreeze ? (
                      <button
                        type="button"
                        disabled={ovBusy}
                        onClick={() => void onFreezeSnapshot()}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {t('meeting_ov_freeze_roll_now')}
                      </button>
                    ) : null}
                    {showOpen ? (
                      <button
                        type="button"
                        disabled={openVoteButtonDisabledStaff}
                        onClick={() => void onOpenVoting()}
                        className="rounded-lg bg-clearstrata-ui-primary px-3 py-2 text-sm font-medium text-white hover:bg-clearstrata-ui-primaryHover disabled:opacity-50"
                      >
                        {t('meeting_ov_open')}
                      </button>
                    ) : null}
                    {showClose ? (
                      <button
                        type="button"
                        disabled={ovBusy}
                        onClick={() => void onCloseVoting()}
                        className="rounded-lg bg-clearstrata-brand-700 px-3 py-2 text-sm font-medium text-white hover:bg-clearstrata-brand-800 disabled:opacity-50"
                      >
                        {t('meeting_ov_close')}
                      </button>
                    ) : null}
                  </>
                ) : null}
                {!hideNavigateGoVote && (!isStaff || viewerIsEligibleVoter) ? (
                  <button
                    type="button"
                    onClick={onNavigateOwnerVoting}
                    className="rounded-lg bg-clearstrata-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover"
                  >
                    {t('meeting_ov_go_vote')}
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
