import { Link } from 'react-router-dom';
import { buildMatterCardMeta } from '@/lib/community/governanceHubLifecycle';
import {
  governanceMatterDetailUrl,
  type GovernanceMatterDashboardRow,
} from '@/lib/community/governanceMatterModel';

export type GovernanceMatterCardProps = {
  matter: GovernanceMatterDashboardRow;
  propertyId: string;
  langEn: boolean;
  canCouncil?: boolean;
  onCouncilRevise?: () => void;
  onGenerateCda?: () => void;
  onPrepareResolution?: () => void;
  compact?: boolean;
};

export function GovernanceMatterCard({
  matter,
  propertyId,
  langEn,
  canCouncil = false,
  onCouncilRevise,
  onGenerateCda,
  onPrepareResolution,
  compact = false,
}: GovernanceMatterCardProps) {
  const en = langEn;
  const meta = buildMatterCardMeta(matter, en);
  const detailUrl = governanceMatterDetailUrl(matter.id, propertyId);

  return (
    <article className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm hover:border-clearstrata-brand-200">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{matter.title}</p>
          <p className="mt-0.5 text-xs font-medium text-clearstrata-brand-800">{meta.stageLabel}</p>
          {!compact ? (
            <p className="mt-0.5 text-[11px] text-gray-500">{meta.categoryLabel}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-1">
          {meta.hasResolution ? (
            <Badge label={en ? 'Resolution' : '决议'} tone="emerald" />
          ) : null}
          {meta.hasMeeting ? <Badge label={en ? 'Meeting' : '会议'} tone="violet" /> : null}
          {meta.hasVoting ? <Badge label={en ? 'Voting' : '投票'} tone="amber" /> : null}
        </div>
      </div>

      {meta.commentLine ? <p className="mt-1.5 text-xs text-gray-600">{meta.commentLine}</p> : null}

      <p className="mt-1.5 text-xs text-gray-700">
        <span className="font-semibold text-gray-800">{en ? 'Next: ' : '下一步：'}</span>
        {meta.nextStep}
      </p>

      {!compact ? (
        <p className="mt-1 text-[10px] text-gray-500">
          {en ? 'Updated' : '更新'}: {meta.lastUpdated}
        </p>
      ) : null}

      <div className="mt-2.5 flex flex-wrap gap-2">
        <Link
          to={detailUrl}
          className="inline-flex items-center rounded-lg border border-clearstrata-ui-softBorder bg-white px-2.5 py-1 text-[11px] font-semibold text-clearstrata-brand-900 hover:bg-clearstrata-brand-50 sm:text-xs"
        >
          {en ? 'View matter' : '查看事项'}
        </Link>
        {canCouncil ? (
          <>
            {onCouncilRevise ? (
              <button
                type="button"
                onClick={onCouncilRevise}
                className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 sm:text-xs"
              >
                {en ? 'Revise' : '修订'}
              </button>
            ) : null}
            {onGenerateCda ? (
              <button
                type="button"
                onClick={onGenerateCda}
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-900 hover:bg-indigo-100 sm:text-xs"
              >
                {en ? 'Generate CDA' : '生成 CDA'}
              </button>
            ) : null}
            {onPrepareResolution && !meta.hasResolution ? (
              <button
                type="button"
                onClick={onPrepareResolution}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100 sm:text-xs"
              >
                {en ? 'Prepare Resolution' : '准备决议'}
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </article>
  );
}

function Badge({ label, tone }: { label: string; tone: 'emerald' | 'violet' | 'amber' }) {
  const cls =
    tone === 'emerald'
      ? 'bg-emerald-100 text-emerald-800'
      : tone === 'violet'
        ? 'bg-violet-100 text-violet-800'
        : 'bg-amber-100 text-amber-800';
  return <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>;
}
