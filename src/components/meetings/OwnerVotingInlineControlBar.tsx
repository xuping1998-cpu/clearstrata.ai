import type { MeetingRow, OwnerVoteMeetingLite } from '@/features/meetings/api';
import { labelFormat } from '@/features/meetings/labels';
import {
  councilMeetingVotingWindowFallback,
  councilWrittenRemoteWindows,
  isWrittenRemoteUi,
  meetingFormatUiFromRow,
} from '@/features/meetings/meetingFormatModel';

export type OwnerVoteInlineMetaState = {
  loading: boolean;
  meeting: OwnerVoteMeetingLite | null;
  resolutions: Array<{ id: string; title: string; threshold: string }>;
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
};

function fmtTs(iso: string | null | undefined, en: boolean): string {
  if (!iso?.trim()) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(en ? 'en-CA' : 'zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
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
}: OwnerVotingInlineControlBarProps) {
  const en = languageEn;
  const uiFormat = meetingFormatUiFromRow(meeting);
  const written = isWrittenRemoteUi(uiFormat);
  const disc = councilWrittenRemoteWindows(meeting);
  const fallbackVoting = councilMeetingVotingWindowFallback(meeting);
  const ov = meta.meeting;

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

  function voteStatusLine(): string {
    if (meta.loading) return '…';
    if (!ov) return t('meeting_ov_not_enabled');
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

  const formatLabel = labelFormat(meeting.meeting_format, en, { descriptionZh: meeting.description_zh });

  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">{t('meeting_ev_status_title')}</h3>

      <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-2 sm:text-sm">
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 sm:col-span-2">
          <dt className="shrink-0 text-gray-500">{t('meeting_ov_meeting_format_row')}</dt>
          <dd className="font-medium text-gray-900">{formatLabel}</dd>
        </div>

        {written && (disc.discussionOpens || disc.discussionCloses) ? (
          <>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 sm:col-span-2">
              <dt className="shrink-0 text-gray-500">{t('meeting_ov_discussion_opens')}</dt>
              <dd className="text-gray-900">{fmtTs(disc.discussionOpens, en)}</dd>
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 sm:col-span-2">
              <dt className="shrink-0 text-gray-500">{t('meeting_ov_discussion_closes')}</dt>
              <dd className="text-gray-900">{fmtTs(disc.discussionCloses, en)}</dd>
            </div>
          </>
        ) : null}

        <div className="flex flex-wrap gap-x-2 gap-y-0.5 sm:col-span-2">
          <dt className="shrink-0 text-gray-500">{t('meeting_ov_vote_opens')}</dt>
          <dd className="text-gray-900">{fmtTs(displayVotingOpens, en)}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 sm:col-span-2">
          <dt className="shrink-0 text-gray-500">{t('meeting_ov_vote_closes')}</dt>
          <dd className="text-gray-900">{fmtTs(displayVotingCloses, en)}</dd>
        </div>

        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
          <dt className="shrink-0 text-gray-500">{t('voting_status')}</dt>
          <dd className="font-medium text-gray-900">{voteStatusLine()}</dd>
        </div>

        {ov ? (
          <>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              <dt className="shrink-0 text-gray-500">{t('meeting_ev_snapshot_label')}</dt>
              <dd className="font-medium text-gray-900">
                {ov.snapshot_frozen_at ? t('meeting_ov_frozen') : t('meeting_ov_not_frozen')}
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              <dt className="shrink-0 text-gray-500">{t('meeting_ov_eligible_units')}</dt>
              <dd className="font-medium text-gray-900">{meta.loading ? '—' : meta.eligibleCount}</dd>
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              <dt className="shrink-0 text-gray-500">{t('meeting_ov_resolution_count')}</dt>
              <dd className="font-medium text-gray-900">{meta.loading ? '—' : meta.resolutionCount}</dd>
            </div>
          </>
        ) : null}
      </dl>

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
