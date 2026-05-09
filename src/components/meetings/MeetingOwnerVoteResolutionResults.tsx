import { useMemo } from 'react';
import type { OwnerVoteMeetingLite, OwnerVoteResolutionResultNormalized } from '@/features/meetings/api';
import { StatusBadge } from '@/components/status';

type CouncilResolutionRow = { id: string; title: string; threshold: string };

function thresholdLabel(th: string, t: (key: string) => string): string {
  const k = String(th ?? '').trim();
  if (k === 'majority') return t('meeting_res_threshold_value_majority');
  if (k === 'three_quarter') return t('meeting_res_threshold_value_three_quarter');
  if (k === 'unanimous') return t('meeting_res_threshold_value_unanimous');
  return k || '—';
}

function outcomeToneAndLabel(
  ovStatusRaw: string,
  passed: boolean | null,
  t: (key: string) => string,
): { tone: 'success' | 'danger' | 'warning' | 'neutral'; label: string } {
  const s = ovStatusRaw.trim().toLowerCase();
  if (s === 'draft') {
    return { tone: 'neutral', label: t('meeting_vote_not_started') };
  }
  if (s === 'open') {
    if (passed === true) return { tone: 'warning', label: t('meeting_vote_temporarily_passed') };
    if (passed === false) return { tone: 'warning', label: t('meeting_vote_pending') };
    return { tone: 'neutral', label: t('meeting_ov_outcome_pending') };
  }
  if (s === 'closed' || s === 'archived') {
    if (passed === true) return { tone: 'success', label: t('meeting_vote_passed') };
    if (passed === false) return { tone: 'danger', label: t('meeting_vote_failed') };
    return { tone: 'neutral', label: t('meeting_ov_outcome_pending') };
  }
  return { tone: 'neutral', label: '—' };
}

export type MeetingOwnerVoteResolutionResultsProps = {
  loading: boolean;
  ownerVoteMeeting: OwnerVoteMeetingLite | null;
  resolutions: CouncilResolutionRow[];
  resultRows: OwnerVoteResolutionResultNormalized[];
  eligibleFallback: number;
  t: (key: string) => string;
  languageEn: boolean;
};

export function MeetingOwnerVoteResolutionResults({
  loading,
  ownerVoteMeeting,
  resolutions,
  resultRows,
  eligibleFallback,
  t,
  languageEn,
}: MeetingOwnerVoteResolutionResultsProps) {
  const en = languageEn;
  const byId = useMemo(() => {
    const m = new Map<string, OwnerVoteResolutionResultNormalized>();
    for (const r of resultRows) {
      m.set(r.resolution_id, r);
    }
    return m;
  }, [resultRows]);

  const ovStatus = ownerVoteMeeting?.status ?? '';

  if (loading) {
    return <p className="text-sm text-gray-500">{t('meeting_ov_loading')}</p>;
  }

  if (!ownerVoteMeeting) {
    return <p className="text-sm text-gray-600">{t('meeting_vote_not_enabled')}</p>;
  }

  if (resolutions.length === 0) {
    return <p className="text-sm text-gray-600">{t('meeting_vote_no_resolutions')}</p>;
  }

  return (
    <ul className="space-y-4">
      {resolutions.map((res, idx) => {
        const tally = byId.get(res.id);
        const yes = tally?.yes_count ?? 0;
        const no = tally?.no_count ?? 0;
        const abstain = tally?.abstain_count ?? 0;
        const cast = tally?.total_cast ?? 0;
        const eligible =
          tally && typeof tally.eligible_count === 'number' && tally.eligible_count > 0
            ? tally.eligible_count
            : eligibleFallback;
        const participation = eligible > 0 ? (cast / eligible) * 100 : 0;
        const passed = tally?.passed ?? null;
        const { tone, label } = outcomeToneAndLabel(ovStatus, passed, t);

        return (
          <li
            key={res.id}
            className="rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-4 space-y-3"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {en ? `Resolution ${idx + 1}` : `决议 ${idx + 1}`}
              </p>
              <h3 className="text-base font-semibold text-gray-900 mt-1">
                {res.title.trim() || (en ? 'Untitled' : '未命名')}
              </h3>
            </div>
            <dl className="text-sm">
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-gray-500 shrink-0">{t('meeting_resolution_threshold')}:</dt>
                <dd className="font-medium text-gray-900">{thresholdLabel(res.threshold, t)}</dd>
              </div>
            </dl>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm border-t border-gray-100 pt-3">
              <div>
                <p className="text-gray-500 text-xs">{t('meeting_vote_yes')}</p>
                <p className="font-semibold text-gray-900">{yes}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">{t('meeting_vote_no')}</p>
                <p className="font-semibold text-gray-900">{no}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">{t('meeting_vote_abstain')}</p>
                <p className="font-semibold text-gray-900">{abstain}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">{t('meeting_vote_cast')}</p>
                <p className="font-semibold text-gray-900">{cast}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">{t('meeting_vote_eligible')}</p>
                <p className="font-semibold text-gray-900">{eligible}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <p className="text-sm text-gray-700">
                <span className="text-gray-500">{t('meeting_vote_participation')}:</span>{' '}
                <span className="font-semibold">{participation.toFixed(1)}%</span>
              </p>
              <StatusBadge tone={tone} size="sm">
                {label}
              </StatusBadge>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
