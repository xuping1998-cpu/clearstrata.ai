import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive,
  Calendar,
  FileText,
  MessageSquare,
  Settings,
  Users,
  Vote,
} from 'lucide-react';
import { HUB_LIFECYCLE_STAGES } from '@/lib/community/governanceHubLifecycle';
import type { GovernanceMatterCommentRow, GovernanceMatterRevisionRow, GovernanceMatterRow } from '@/lib/community/governanceMatterModel';
import type { GovernanceMatterCdaReportRow } from '@/lib/community/cdaReportModel';
import type { CommunityResolutionRow } from '@/lib/community/communityResolutionModel';
import {
  buildGovernanceTimelineEvents,
  computeGovernanceStageDurations,
  filterTimelineEvents,
  matterToCurrentTimelinePhase,
  phaseLabel,
  timelineProgressFill,
  type GovernanceTimelineEvent,
  type GovernanceTimelineFilter,
  type GovernanceTimelinePhase,
} from '@/lib/community/governanceTimelineModel';

const FILTER_CHIPS: { id: GovernanceTimelineFilter; en: string; zh: string }[] = [
  { id: 'all', en: 'All', zh: '全部' },
  { id: 'workflow', en: 'Workflow', zh: '流程' },
  { id: 'documents', en: 'Documents', zh: '文件' },
  { id: 'comments', en: 'Comments', zh: '评论' },
  { id: 'votes', en: 'Votes', zh: '投票' },
  { id: 'system', en: 'System', zh: '系统' },
];

const PHASE_ICONS: Record<GovernanceTimelinePhase, typeof MessageSquare> = {
  discussion: MessageSquare,
  consultation: Users,
  resolution: FileText,
  meeting: Calendar,
  voting: Vote,
  archive: Archive,
};

function eventIcon(event: GovernanceTimelineEvent) {
  if (event.filterCategory === 'comments') return MessageSquare;
  if (event.filterCategory === 'votes') return Vote;
  if (event.filterCategory === 'documents') return FileText;
  if (event.actorRole === 'system') return Settings;
  return PHASE_ICONS[event.phase];
}

export type GovernanceMatterTimelineTabProps = {
  en: boolean;
  matter: GovernanceMatterRow;
  propertyId: string;
  canCouncil: boolean;
  revisions: GovernanceMatterRevisionRow[];
  comments: GovernanceMatterCommentRow[];
  cdaReport: GovernanceMatterCdaReportRow | null;
  linkedResolution: CommunityResolutionRow | null;
};

export function GovernanceMatterTimelineTab({
  en,
  matter,
  propertyId,
  canCouncil,
  revisions,
  comments,
  cdaReport,
  linkedResolution,
}: GovernanceMatterTimelineTabProps) {
  const [filter, setFilter] = useState<GovernanceTimelineFilter>('all');

  const allEvents = useMemo(
    () =>
      buildGovernanceTimelineEvents({
        matter,
        propertyId,
        revisions,
        comments,
        cdaReport,
        linkedResolution,
      }),
    [matter, propertyId, revisions, comments, cdaReport, linkedResolution],
  );

  const events = useMemo(() => filterTimelineEvents(allEvents, filter, canCouncil), [allEvents, filter, canCouncil]);

  const stageDurations = useMemo(() => computeGovernanceStageDurations(revisions, matter), [revisions, matter]);

  const currentPhase = matterToCurrentTimelinePhase(matter);
  const progress = timelineProgressFill(matter);

  return (
    <div className="space-y-5">
      <CurrentStageIndicator en={en} currentPhase={currentPhase} filled={progress.filled} total={progress.total} />

      <ConstitutionPhaseStrip en={en} currentPhase={currentPhase} />

      <StageDurationPanel en={en} durations={stageDurations} />

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
          {en ? 'Filter timeline' : '筛选时间线'}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {FILTER_CHIPS.map((chip) => {
            const selected = filter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFilter(chip.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  selected
                    ? 'bg-clearstrata-ui-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {en ? chip.en : chip.zh}
              </button>
            );
          })}
        </div>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-gray-500">
          {en ? 'No timeline events match this filter.' : '没有符合筛选条件的时间线事件。'}
        </p>
      ) : (
        <ol className="relative space-y-0 border-l-2 border-clearstrata-brand-200 pl-6 md:pl-8">
          {events.map((event) => (
            <TimelineEventCard key={event.id} en={en} event={event} />
          ))}
        </ol>
      )}
    </div>
  );
}

function CurrentStageIndicator({
  en,
  currentPhase,
  filled,
  total,
}: {
  en: boolean;
  currentPhase: GovernanceTimelinePhase;
  filled: number;
  total: number;
}) {
  const segments = Array.from({ length: total }, (_, i) => i < filled);
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
        {en ? 'Current stage' : '当前阶段'}
      </p>
      <p className="mt-1 text-base font-bold text-gray-900">{phaseLabel(currentPhase, en)}</p>
      <div className="mt-3 flex gap-1" aria-hidden>
        {segments.map((on, i) => (
          <span
            key={i}
            className={`h-2 flex-1 rounded-sm ${on ? 'bg-emerald-600' : 'bg-emerald-200'}`}
          />
        ))}
      </div>
    </div>
  );
}

function ConstitutionPhaseStrip({ en, currentPhase }: { en: boolean; currentPhase: GovernanceTimelinePhase }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
        {en ? 'Governance phase' : '治理阶段'}
      </p>
      <ol className="mt-3 flex flex-wrap items-center gap-1 text-xs font-semibold">
        {HUB_LIFECYCLE_STAGES.map((phase, index) => {
          const isCurrent = phase === currentPhase;
          return (
            <li key={phase} className="flex items-center gap-1">
              <span
                className={`rounded-full px-2.5 py-1 ${
                  isCurrent
                    ? 'bg-clearstrata-ui-primary text-white'
                    : 'bg-white text-gray-600 ring-1 ring-gray-200'
                }`}
              >
                {phaseLabel(phase, en)}
              </span>
              {index < HUB_LIFECYCLE_STAGES.length - 1 ? (
                <span className="text-gray-300" aria-hidden>
                  ↓
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StageDurationPanel({
  en,
  durations,
}: {
  en: boolean;
  durations: ReturnType<typeof computeGovernanceStageDurations>;
}) {
  const withActivity = durations.filter((d) => d.startedAt || d.isCurrent);
  if (!withActivity.length) return null;

  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
        {en ? 'Stage durations' : '阶段时长'}
      </p>
      <ul className="mt-3 space-y-2">
        {withActivity.map((d) => (
          <li key={d.phase} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className={`font-semibold ${d.isCurrent ? 'text-clearstrata-brand-900' : 'text-gray-800'}`}>
              {en ? d.labelEn : d.labelZh}
              {d.isCurrent ? (en ? ' (current)' : '（当前）') : ''}
            </span>
            <span className="text-xs text-gray-600">
              {d.durationLabelEn && d.durationLabelZh
                ? en
                  ? d.durationLabelEn
                  : d.durationLabelZh
                : en
                  ? 'In progress'
                  : '进行中'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TimelineEventCard({ en, event }: { en: boolean; event: GovernanceTimelineEvent }) {
  const Icon = eventIcon(event);
  const title = en ? event.titleEn : event.titleZh;
  const description = en ? event.descriptionEn : event.descriptionZh;
  const reason = en ? event.reasonEn : event.reasonZh;
  const actor = en ? event.actorLabelEn : event.actorLabelZh;
  const status = en ? event.statusEn : event.statusZh;
  const phase = phaseLabel(event.phase, en);

  return (
    <li className="relative pb-5 last:pb-0 md:pb-6">
      <span
        className="absolute -left-[1.9375rem] top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-clearstrata-ui-primary text-white ring-2 ring-clearstrata-brand-100 md:-left-[2.125rem]"
        aria-hidden
      >
        <Icon className="h-3 w-3" strokeWidth={2.5} />
      </span>

      <article className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm md:p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900">{title}</h3>
            <p className="mt-0.5 text-[11px] font-medium text-gray-500">
              {new Date(event.at).toLocaleString()} · {actor}
            </p>
          </div>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-700">
            {status}
          </span>
        </div>

        <p className="mt-2 text-xs font-semibold text-clearstrata-brand-800">{phase}</p>
        <p className="mt-1 text-sm text-gray-700">{description}</p>

        {reason ? (
          <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
              {en ? 'Reason' : '原因'}
            </p>
            <p className="mt-0.5 text-xs text-gray-700">{reason}</p>
          </div>
        ) : null}

        {event.documents.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {event.documents.map((doc) => (
              <li key={doc.id}>
                <Link
                  to={doc.url}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-clearstrata-brand-900 hover:bg-gray-50"
                >
                  <FileText className="h-3 w-3" aria-hidden />
                  {en ? doc.labelEn : doc.labelZh}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="mt-2 text-[10px] text-gray-400">
          {en ? 'Event' : '事件'}: {event.eventType} · ID: {event.entityId.slice(0, 8)}
        </p>
      </article>
    </li>
  );
}
