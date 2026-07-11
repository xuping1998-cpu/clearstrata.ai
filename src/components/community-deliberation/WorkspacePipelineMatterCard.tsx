import { buildMatterCardMeta } from '@/lib/community/governanceHubLifecycle';
import {
  ADVISORY_BADGE_CLASS,
  lifecycleStageBadgeClass,
  POSITIVE_BADGE_CLASS,
} from '@/lib/community/governanceLifecycleColors';
import {
  governanceMatterCategoryLabel,
  type GovernanceMatterDashboardRow,
} from '@/lib/community/governanceMatterModel';

export type WorkspacePipelineMatterCardProps = {
  matter: GovernanceMatterDashboardRow;
  langEn: boolean;
  selected: boolean;
  hasCdaReport: boolean;
  onSelect: () => void;
};

function activityLine(matter: GovernanceMatterDashboardRow, langEn: boolean): string | null {
  const en = langEn;
  const meta = buildMatterCardMeta(matter, en);
  if (meta.commentLine) return meta.commentLine;
  if (matter.last_revision_at) {
    return en ? 'Recently updated' : '最近有更新';
  }
  return null;
}

function positiveBadges(
  matter: GovernanceMatterDashboardRow,
  hasCdaReport: boolean,
  langEn: boolean,
): string[] {
  const en = langEn;
  const badges: string[] = [];
  if (hasCdaReport) badges.push(en ? 'CDA Ready' : '议事助手就绪');
  if (matter.resolution_id) badges.push(en ? 'Resolution Draft' : '决议草案');
  if (matter.meeting_id) badges.push(en ? 'Meeting Linked' : '已关联会议');
  if (matter.voting_id) badges.push(en ? 'Voting Open' : '投票进行中');
  return badges;
}

export function WorkspacePipelineMatterCard({
  matter,
  langEn,
  selected,
  hasCdaReport,
  onSelect,
}: WorkspacePipelineMatterCardProps) {
  const en = langEn;
  const meta = buildMatterCardMeta(matter, en);
  const activity = activityLine(matter, en);
  const badges = positiveBadges(matter, hasCdaReport, en);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
        selected
          ? 'border-emerald-400 bg-emerald-50/80 ring-1 ring-emerald-200'
          : 'border-gray-200/90 bg-white hover:border-gray-300'
      }`}
    >
      <p className="line-clamp-2 text-sm font-bold leading-snug text-gray-900">{matter.title}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span className={lifecycleStageBadgeClass(matter.status)}>{meta.stageLabel}</span>
        <span className="text-[10px] text-gray-500">{governanceMatterCategoryLabel(matter.category, en)}</span>
      </div>
      {activity ? <p className="mt-1.5 text-xs text-gray-500">{activity}</p> : null}
      <p className="mt-1.5 text-xs font-medium text-gray-800">
        {en ? 'Next: ' : '下一步：'}
        <span className="font-normal text-gray-700">{meta.nextStep}</span>
      </p>
      {badges.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {badges.map((b) => (
            <span
              key={b}
              className={b.includes('CDA') || b.includes('议事助手') ? ADVISORY_BADGE_CLASS : POSITIVE_BADGE_CLASS}
            >
              {b}
            </span>
          ))}
        </div>
      ) : null}
      <span className="mt-2 inline-block text-[11px] font-semibold text-clearstrata-brand-900">
        {en ? 'View matter →' : '查看事项 →'}
      </span>
    </button>
  );
}
