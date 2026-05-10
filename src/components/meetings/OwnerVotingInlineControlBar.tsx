import type { ReactNode } from 'react';
import type { MeetingRow, OwnerVoteMeetingLite } from '@/features/meetings/api';
import { labelFormat } from '@/features/meetings/labels';
import {
  councilMeetingVotingWindowFallback,
  councilWrittenRemoteWindows,
  isWrittenRemoteUi,
  meetingFormatUiFromRow,
} from '@/features/meetings/meetingFormatModel';
import { parseIsoFlexible, type ElectionNominationRibbonModel } from '@/features/meetings/electionAgendaModel';

export type OwnerVoteInlineMetaState = {
  loading: boolean;
  meeting: OwnerVoteMeetingLite | null;
  resolutions: Array<{ id: string; title: string; threshold: string; display_order?: number | null }>;
  resolutionCount: number;
  eligibleCount: number;
};

export type OwnerVotingInlineControlBarProps = {
  meeting: MeetingRow;
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

/** Per user rules: now vs nomination_opens_at / nomination_closes_at (ribbon aggregates election agendas). */
function nominationWindowStatusLabel(
  now: Date,
  ribbon: ElectionNominationRibbonModel,
  languageEn: boolean,
  translate: (k: string) => string,
): string {
  const opens = ribbon.nominationOpensIso?.trim() ? parseIsoFlexible(ribbon.nominationOpensIso) : null;
  const closes = ribbon.nominationClosesIso?.trim() ? parseIsoFlexible(ribbon.nominationClosesIso) : null;
  const n = now.getTime();

  if (!opens && !closes) {
    return languageEn ? '—' : '—';
  }

  if (closes && n >= closes.getTime()) {
    return translate('meeting_nomination_status_closed');
  }
  if (opens && n < opens.getTime()) {
    return translate('meeting_nomination_status_not_started');
  }
  return translate('meeting_nomination_status_open');
}

export function OwnerVotingInlineControlBar({
  meeting,
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
}: OwnerVotingInlineControlBarProps) {
  const en = languageEn;
  const uiFormat = meetingFormatUiFromRow(meeting);
  const written = isWrittenRemoteUi(uiFormat);
  const disc = councilWrittenRemoteWindows(meeting);
  const fallbackVoting = councilMeetingVotingWindowFallback(meeting);
  const ov = meta.meeting;

  const hasElectionAgenda = electionNomRibbon != null;

  const displayVotingOpens = ov?.voting_opens_at?.trim()
    ? ov.voting_opens_at
    : fallbackVoting.votingOpens ?? null;
  const displayVotingCloses = ov?.voting_closes_at?.trim()
    ? ov.voting_closes_at
    : fallbackVoting.votingCloses ?? null;

  const ovStatusLower = ov?.status?.trim().toLowerCase() ?? '';
  const staffOvActionsReadOnly = ovStatusLower === 'closed' || ovStatusLower === 'archived';
  const showFreeze = isStaff && !!ov && !staffOvActionsReadOnly;
  const showOpen = isStaff && ovStatusLower === 'draft';
  const showClose = isStaff && ovStatusLower === 'open';

  const nominationPhaseLabel =
    hasElectionAgenda && electionNomRibbon
      ? nominationWindowStatusLabel(new Date(), electionNomRibbon, en, t)
      : '';

  function voteStatusLine(): string {
    if (meta.loading) return '…';
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

  const genericFormatLabel = labelFormat(meeting.meeting_format, en, { descriptionZh: meeting.description_zh });
  const formatDisplay = written ? t('meeting_format_written_remote_display') : genericFormatLabel;

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
          <p className="text-gray-900 font-medium">{formatDisplay}</p>,
        )}

        {written && (disc.discussionOpens || disc.discussionCloses)
          ? sectionCard(
              t('meeting_ov_discussion_period_label'),
              <p className="text-gray-900">
                {fmtTs(disc.discussionOpens, en)} <span className="text-gray-400 px-1">–</span> {fmtTs(disc.discussionCloses, en)}
              </p>,
            )
          : null}

        {hasElectionAgenda && electionNomRibbon
          ? sectionCard(
              t('meeting_flow_nomination_period_label'),
              <>
                <p className="text-gray-900">
                  {electionNomRibbon.nominationOpensIso || electionNomRibbon.nominationClosesIso ? (
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
          <p className="text-gray-900">
            {fmtTs(displayVotingOpens, en)} <span className="text-gray-400 px-1">–</span> {fmtTs(displayVotingCloses, en)}
          </p>,
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
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={ovBusy || !userId || !canEnableBinding}
                onClick={() => void onEnableElectronicVoting()}
                className="rounded-lg bg-clearstrata-ui-primary px-4 py-2 text-sm font-medium text-white hover:bg-clearstrata-ui-primaryHover disabled:opacity-50"
              >
                {t('meeting_ov_enable')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 border-t border-gray-200/90 pt-3">
            <p className="text-gray-600">{t('meeting_ov_owner_not_open')}</p>
          </div>
        )
      ) : (
        <div className="space-y-3 border-t border-gray-200/90 pt-3">
          {!isStaff ? <p className="text-gray-600">{t('meeting_ov_owner_notice')}</p> : null}

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
                    disabled={ovBusy}
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
        </div>
      )}
    </div>
  );
}
