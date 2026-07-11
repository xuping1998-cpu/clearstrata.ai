import { buildMatterCardMeta } from '@/lib/community/governanceHubLifecycle';
import type { GovernanceMatterDashboardRow } from '@/lib/community/governanceMatterModel';

export type WorkspacePipelineMatterCardProps = {
  matter: GovernanceMatterDashboardRow;
  propertyId: string;
  langEn: boolean;
  selected: boolean;
  hasCdaReport: boolean;
  onSelect: () => void;
};

export function WorkspacePipelineMatterCard({
  matter,
  propertyId,
  langEn,
  selected,
  hasCdaReport,
  onSelect,
}: WorkspacePipelineMatterCardProps) {
  const en = langEn;
  const meta = buildMatterCardMeta(matter, en);

  const cdaLine = hasCdaReport
    ? en
      ? 'CDA: report available'
      : '议事助手：报告已生成'
    : en
      ? 'CDA: not yet generated'
      : '议事助手：尚未生成';

  const resolutionLine = meta.hasResolution
    ? en
      ? 'Resolution: prepared'
      : '决议：已准备'
    : en
      ? 'Resolution: not yet prepared'
      : '决议：尚未准备';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
        selected
          ? 'border-emerald-400 bg-emerald-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-clearstrata-brand-200'
      }`}
    >
      <p className="line-clamp-2 text-sm font-semibold text-gray-900">{matter.title}</p>
      <p className="mt-0.5 text-xs font-medium text-clearstrata-brand-800">{meta.stageLabel}</p>
      {meta.commentLine ? <p className="mt-1 text-xs text-gray-600">{meta.commentLine}</p> : null}
      <p className="mt-1 text-xs text-gray-700">
        <span className="font-semibold">{en ? 'Next: ' : '下一步：'}</span>
        {meta.nextStep}
      </p>
      <p className="mt-1 text-[11px] text-indigo-800/90">{cdaLine}</p>
      <p className="text-[11px] text-emerald-800/90">{resolutionLine}</p>
      <span className="mt-2 inline-block text-[11px] font-semibold text-clearstrata-brand-900">
        {en ? 'View →' : '查看 →'}
      </span>
    </button>
  );
}
