import { buildMatterCardMeta } from '@/lib/community/governanceHubLifecycle';
import {
  lifecyclePresentation,
  workspaceStageToLifecycleToken,
} from '@/lib/community/governanceLifecyclePresentation';
import { matterStatusToWorkspaceStage } from '@/lib/community/governanceLifecycleModel';
import {
  governanceMatterDetailUrl,
  type GovernanceMatterDashboardRow,
} from '@/lib/community/governanceMatterModel';
import { Button, ButtonLink, lifecycleOutlineButtonClass } from '@/components/ui/Button';

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
  const stageToken = workspaceStageToLifecycleToken(matterStatusToWorkspaceStage(matter.status));
  const stagePresentation = lifecyclePresentation(stageToken);

  return (
    <article className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm hover:border-clearstrata-brand-200">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{matter.title}</p>
          <p className={`mt-0.5 text-xs font-medium ${stagePresentation.textClass}`}>{meta.stageLabel}</p>
          {!compact ? (
            <p className="mt-0.5 text-[11px] text-gray-500">{meta.categoryLabel}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-1">
          {meta.hasResolution ? (
            <LifecycleBadge label={en ? 'Resolution' : '决议'} token="resolution" />
          ) : null}
          {meta.hasMeeting ? <LifecycleBadge label={en ? 'Meeting' : '会议'} token="meeting" /> : null}
          {meta.hasVoting ? <LifecycleBadge label={en ? 'Voting' : '投票'} token="voting" /> : null}
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
        <ButtonLink to={detailUrl} variant="outline" size="sm">
          {en ? 'View matter' : '查看事项'}
        </ButtonLink>
        {canCouncil ? (
          <>
            {onCouncilRevise ? (
              <Button type="button" variant="outline" size="sm" onClick={onCouncilRevise}>
                {en ? 'Revise' : '修订'}
              </Button>
            ) : null}
            {onGenerateCda ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={lifecycleOutlineButtonClass('cda')}
                onClick={onGenerateCda}
              >
                {en ? 'Generate CDA Report' : '生成 CDA 报告'}
              </Button>
            ) : null}
            {onPrepareResolution && !meta.hasResolution ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={lifecycleOutlineButtonClass('resolution')}
                onClick={onPrepareResolution}
              >
                {en ? 'Prepare Community Resolution' : '准备社区决议'}
              </Button>
            ) : null}
          </>
        ) : null}
      </div>
    </article>
  );
}

function LifecycleBadge({ label, token }: { label: string; token: 'resolution' | 'meeting' | 'voting' }) {
  const p = lifecyclePresentation(token);
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${p.backgroundClass} ${p.textClass}`}
    >
      {label}
    </span>
  );
}
