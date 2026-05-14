import type { ReactNode } from 'react';
import { evaluateOwnerVoteOpenGate, type MeetingRow, type OwnerVoteMeetingLite } from '@/features/meetings/api';
import { labelMeetingFormatUiDisplay } from '@/features/meetings/labels';
import {
  councilMeetingVotingWindowFallback,
  councilWrittenRemoteWindows,
} from '@/features/meetings/meetingFormatModel';
import {
  agmSgmScheduledNotSetLabel,
  formatElectionNominationUiStatus,
  isStrictAgmOrSgmMeeting,
  type ElectionNominationRibbonModel,
} from '@/features/meetings/electionAgendaModel';
import { deriveCouncilElectionCanonFromScheduledAt } from '@/features/meetings/electionTimelineMath';

export type OwnerVoteInlineMetaState = {
  loading: boolean;
  meeting: OwnerVoteMeetingLite | null;
  resolutions: Array<{ id: string; title: string; threshold: string; display_order?: number | null }>;
  resolutionCount: number;
  eligibleCount: number;
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
};

function fmtTs(iso: string | null | undefined, en: boolean): string {
  if (!iso?.trim()) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(en ? 'en-CA' : 'zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
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
}: OwnerVotingInlineControlBarProps) {
  const en = languageEn;
  const formatUiDisp = labelMeetingFormatUiDisplay(meeting, en);
  const noticePeriodLabel = en ? 'Public Notice / Discussion Period' : '公示 / 讨论期';
  const ov = meta.meeting;
  const agmSgmStrict = isStrictAgmOrSgmMeeting(meeting);
  const flowCanon = agmSgmStrict ? deriveCouncilElectionCanonFromScheduledAt(meeting.scheduled_at) : null;
  const flowNotSet = agmSgmScheduledNotSetLabel(en);

  let displayPublicNoticeOpens: string | null = null;
  let displayPublicNoticeCloses: string | null = null;
  if (agmSgmStrict) {
    if (flowCanon) {
      displayPublicNoticeOpens = flowCanon.publicNoticeOpenIso;
      displayPublicNoticeCloses = flowCanon.publicNoticeCloseIso;
    }
  } else {
    const disc = councilWrittenRemoteWindows(meeting);
    const discOpen = disc.publicNoticeOpens?.trim() ? disc.publicNoticeOpens : '';
    const discClose = disc.publicNoticeCloses?.trim() ? disc.publicNoticeCloses : '';
    displayPublicNoticeOpens = discOpen || null;
    displayPublicNoticeCloses = discClose || null;
    if (!discOpen && !discClose && meeting.scheduled_at?.trim()) {
      const canon = deriveCouncilElectionCanonFromScheduledAt(meeting.scheduled_at);
      if (canon) {
        displayPublicNoticeOpens = canon.publicNoticeOpenIso;
        displayPublicNoticeCloses = canon.publicNoticeCloseIso;
      }
    }
  }

  const fallbackVoting = councilMeetingVotingWindowFallback(meeting);
  const hasElectionAgenda = electionNomRibbon != null;

  let displayVotingOpens: string | null = null;
  let displayVotingCloses: string | null = null;
  if (agmSgmStrict) {
    if (flowCanon) {
      displayVotingOpens = flowCanon.votingOpenIso;
      displayVotingCloses = flowCanon.votingCloseIso;
    }
  } else {
    displayVotingOpens = ov?.voting_opens_at?.trim() ? ov.voting_opens_at : fallbackVoting.votingOpens ?? null;
    displayVotingCloses = ov?.voting_closes_at?.trim() ? ov.voting_closes_at : fallbackVoting.votingCloses ?? null;
  }

  const showNoticeSection = agmSgmStrict || !!(displayPublicNoticeOpens || displayPublicNoticeCloses);

  const ovStatusLower = ov?.status?.trim().toLowerCase() ?? '';
  const staffOvActionsReadOnly = ovStatusLower === 'closed' || ovStatusLower === 'archived';
  const showFreeze =
    !isCouncilMeetingEnded && isStaff && !!ov && !staffOvActionsReadOnly;
  const showOpen = !isCouncilMeetingEnded && isStaff && ovStatusLower === 'draft';
  const showClose = !isCouncilMeetingEnded && isStaff && ovStatusLower === 'open';

  const snapshotOk = !!(ov?.snapshot_frozen_at?.trim());
  const eligibleOk = meta.eligibleCount > 0;

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
  const eligibleShown = ov && !meta.loading ? meta.eligibleCount : null;
  const eligDisplay = eligibleShown != null ? String(eligibleShown) : '—';

  const summaryBody = hasElectionAgenda
    ? t('meeting_flow_summary_line_full')
        .replace('{res}', String(resolutionsShown))
        .replace('{cand}', String(candidatesShown))
        .replace('{elig}', eligDisplay)
    : t('meeting_flow_summary_line_plain').replace('{res}', String(resolutionsShown)).replace('{elig}', eligDisplay);

  const summaryHeading = hasElectionAgenda ? t('meeting_flow_summary_heading_full') : t('meeting_flow_summary_heading_plain');

  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm space-y-4">
      <h3 className="text-base font-semibold text-gray-900">{t('meeting_ev_status_title')}</h3>

      <div className="space-y-3">
        {sectionCard(
          t('meeting_ov_meeting_format_row'),
          <>
            <p className="text-gray-900 font-medium">{formatUiDisp.primary}</p>
            {formatUiDisp.secondary ? (
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">{formatUiDisp.secondary}</p>
            ) : null}
          </>,
        )}

        {showNoticeSection
          ? sectionCard(
              noticePeriodLabel,
              agmSgmStrict && !flowCanon ? (
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
                  {agmSgmStrict && !flowCanon ? (
                    <span className="text-gray-500">{flowNotSet}</span>
                  ) : electionNomRibbon.nominationOpensIso || electionNomRibbon.nominationClosesIso ? (
                    <>
                      {fmtTs(electionNomRibbon.nominationOpensIso ?? null, en)}{' '}
                      <span className="text-gray-400 px-1">–</span>{' '}
                      {fmtTs(electionNomRibbon.nominationClosesIso ?? null, en)}
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
          agmSgmStrict && !flowCanon ? (
            <p className="text-gray-500">{flowNotSet}</p>
          ) : (
            <p className="text-gray-900">
              {fmtTs(displayVotingOpens, en)} <span className="text-gray-400 px-1">–</span> {fmtTs(displayVotingCloses, en)}
            </p>
          ),
        )}

        {sectionCard(
          t('voting_status'),
          <p className="font-medium text-gray-900">{voteStatusLine()}</p>,
        )}

        <div className="rounded-md border border-clearstrata-brand-100 bg-clearstrata-brand-50/35 px-3 py-2 shadow-inner space-y-1">
          <div className="text-xs font-medium text-gray-600">{summaryHeading}</div>
          <p className="text-gray-900 font-medium">{summaryBody}</p>
          {ov ? (
            <p className="text-xs text-gray-600">
              {t('meeting_ev_snapshot_label')}:{' '}
              <span className="font-medium text-gray-800">
                {ov.snapshot_frozen_at ? t('meeting_ov_frozen') : t('meeting_ov_not_frozen')}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      {meta.loading ? (
        <p className="text-xs text-gray-500">{t('meeting_ov_loading')}</p>
      ) : !ov ? (
        isStaff ? (
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
                        {t('meeting_ov_freeze')}
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
                ) : (
                  <button
                    type="button"
                    onClick={onNavigateOwnerVoting}
                    className="rounded-lg bg-clearstrata-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover"
                  >
                    {t('meeting_ov_go_vote')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
