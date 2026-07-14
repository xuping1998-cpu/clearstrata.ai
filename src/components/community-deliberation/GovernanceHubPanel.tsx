import { Link } from 'react-router-dom';
import { Button, ButtonLink } from '@/components/ui/Button';
import type { GovernanceMatterRow } from '@/lib/community/governanceMatterModel';
import {
  governanceMatterDetailUrl,
  governanceMatterStatusLabel,
} from '@/lib/community/governanceMatterModel';
import {
  matterStatusToWorkspaceStage,
  workspaceStageLabel,
} from '@/lib/community/governanceLifecycleModel';

export type CouncilActionSummary = {
  todaysActions: number;
  activeMatters: number;
  cdaReady: number;
  resolutionPending: number;
  meetingScheduled: number;
  votingClosing: number;
};

export function computeCouncilActionSummary(matters: GovernanceMatterRow[]): CouncilActionSummary {
  const active = matters.filter((m) => m.status !== 'archived');
  const cdaReady = active.filter((m) => m.status === 'discussion' || m.status === 'public_consultation').length;
  const resolutionPending = active.filter((m) => m.status === 'resolution_draft' || m.status === 'council_review').length;
  const meetingScheduled = active.filter((m) => m.status === 'meeting').length;
  const votingClosing = active.filter((m) => m.status === 'voting').length;

  return {
    todaysActions: cdaReady + resolutionPending + meetingScheduled + votingClosing,
    activeMatters: active.length,
    cdaReady,
    resolutionPending,
    meetingScheduled,
    votingClosing,
  };
}

export type GovernanceHubPanelProps = {
  langEn: boolean;
  propertyId: string;
  matters: GovernanceMatterRow[];
  summary: CouncilActionSummary;
};

export function GovernanceHubPanel({ langEn, propertyId, matters, summary }: GovernanceHubPanelProps) {
  const en = langEn;
  const topMatter = matters.find((m) => m.status !== 'archived');

  return (
    <aside className="rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-50/90 to-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-900">
        {en ? 'Governance Panel' : '治理面板'}
      </p>
      <p className="mt-0.5 text-[11px] text-emerald-800/90">
        {en
          ? 'Council Workspace — Constitutional Governance Workflow'
          : '业委会工作台 — 宪章治理流程'}
      </p>

      <div className="mt-3 space-y-2">
        <SummaryRow label={en ? "Today's Actions" : '今日待办'} value={String(summary.todaysActions)} />
        <SummaryRow label={en ? 'Active Matters' : '进行中事项'} value={String(summary.activeMatters)} />
        <SummaryRow label={en ? 'CDA Ready' : '可生成助手报告'} value={String(summary.cdaReady)} />
        <SummaryRow label={en ? 'Resolution Pending' : '决议待办'} value={String(summary.resolutionPending)} />
        <SummaryRow label={en ? 'Meeting Scheduled' : '已排会议'} value={String(summary.meetingScheduled)} />
        <SummaryRow label={en ? 'Voting Closing' : '投票将截止'} value={String(summary.votingClosing)} />
      </div>

      {topMatter ? (
        <div className="mt-3 rounded-lg border border-emerald-100 bg-white/80 px-3 py-2">
          <p className="text-[11px] font-semibold text-gray-600">{en ? 'Lifecycle progress' : '生命周期'}</p>
          <p className="text-sm font-bold text-gray-900">
            {workspaceStageLabel(matterStatusToWorkspaceStage(topMatter.status), en)}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-gray-700">{topMatter.title}</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2">
        <ButtonLink
          to={`/community-deliberation/new?${new URLSearchParams({ propertyId }).toString()}`}
          variant="primary"
          size="sm"
          className="w-full"
        >
          {en ? '+ Publish Governance Matter' : '+ 发布治理事项'}
        </ButtonLink>
        <ButtonLink
          to={`/council/workspace?${new URLSearchParams({
            propertyId,
            ...(topMatter ? { matterId: topMatter.id } : {}),
          }).toString()}`}
          variant="secondary"
          size="sm"
          className="w-full"
        >
          {en ? 'Open Workspace' : '打开工作台'}
        </ButtonLink>
      </div>

      <p className="mt-4 text-[10px] leading-snug text-gray-600">
        {en
          ? 'One community. One governance space. Different responsibilities.'
          : '一个社区。一个治理空间。不同职责。'}
      </p>
    </aside>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-white/70 px-2.5 py-1.5 text-xs">
      <span className="font-medium text-gray-700">{label}</span>
      <span className="font-bold text-emerald-900">{value}</span>
    </div>
  );
}

export function resolutionStageMatters(matters: GovernanceMatterRow[]): GovernanceMatterRow[] {
  return matters.filter((m) =>
    ['resolution_draft', 'council_review', 'meeting', 'voting', 'decision', 'execution'].includes(m.status),
  );
}

export function ResolutionStatusSection({
  matters,
  propertyId,
  langEn,
}: {
  matters: GovernanceMatterRow[];
  propertyId: string;
  langEn: boolean;
}) {
  const en = langEn;
  const rows = resolutionStageMatters(matters);
  if (!rows.length) return null;

  return (
    <section className="mt-6">
      <h3 className="text-sm font-bold text-gray-900">{en ? 'Community Resolution' : '社区决议'}</h3>
      <ul className="mt-2 space-y-2">
        {rows.map((m) => (
          <li key={m.id}>
            <Link
              to={governanceMatterDetailUrl(m.id, propertyId)}
              className="block rounded-lg border border-violet-200 bg-violet-50/50 px-3 py-2 hover:border-violet-300"
            >
              <p className="text-sm font-semibold text-gray-900">{m.title}</p>
              <p className="text-xs text-violet-800">{governanceMatterStatusLabel(m.status, en)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
