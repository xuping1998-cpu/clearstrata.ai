import { Link } from 'react-router-dom';
import { ButtonLink } from '@/components/ui/Button';
import type { GovernanceMatterRow } from '@/lib/community/governanceMatterModel';
import {
  governanceMatterDetailUrl,
  governanceMatterStatusLabel,
} from '@/lib/community/governanceMatterModel';

export type CouncilActionSummary = {
  todaysActions: number;
  activeMatters: number;
  cdaReady: number;
  resolutionPending: number;
  meetingScheduled: number;
  votingClosing: number;
};

/** @deprecated Hub no longer displays council metrics — use Governance Cockpit intelligence. */
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
  /** Optional — preselect Current Matter when opening the Cockpit */
  cockpitMatterId?: string | null;
};

/**
 * Council handoff on Governance Hub (RC-010 GUXA).
 * Does not surface internal metrics or action queue — those belong in Governance Cockpit.
 */
export function GovernanceHubPanel({ langEn, propertyId, cockpitMatterId = null }: GovernanceHubPanelProps) {
  const en = langEn;

  const cockpitParams = new URLSearchParams({ propertyId });
  if (cockpitMatterId) cockpitParams.set('matterId', cockpitMatterId);

  return (
    <aside className="rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-50/90 to-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-900">
        {en ? 'Council workflow' : '业委会工作'}
      </p>
      <p className="mt-0.5 text-[11px] text-emerald-800/90">
        {en
          ? 'Advance matters in the Governance Cockpit — not on the public Hub feed.'
          : '在治理驾驶舱推进事项 — 不在公共治理中心动态中操作。'}
      </p>

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
          to={`/council/workspace?${cockpitParams.toString()}`}
          variant="secondary"
          size="sm"
          className="w-full"
        >
          {en ? 'Open Governance Cockpit' : '打开治理驾驶舱'}
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
