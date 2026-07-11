import { matterStatusToWorkspaceStage, type WorkspaceLifecycleStage } from '@/lib/community/governanceLifecycleModel';
import type { GovernanceMatterStatus } from '@/lib/community/governanceMatterModel';

/** Semantic lifecycle colors — UIP Visual Hierarchy Final Pass. */
export function lifecycleStageBadgeClass(
  status: GovernanceMatterStatus,
): string {
  const stage = matterStatusToWorkspaceStage(status);
  const map: Record<WorkspaceLifecycleStage, string> = {
    draft: 'bg-gray-100 text-gray-700 ring-gray-200',
    discussion: 'bg-emerald-100 text-emerald-900 ring-emerald-200',
    consultation: 'bg-amber-100 text-amber-900 ring-amber-200',
    resolution: 'bg-blue-100 text-blue-900 ring-blue-200',
    meeting: 'bg-violet-100 text-violet-900 ring-violet-200',
    voting: 'bg-orange-100 text-orange-900 ring-orange-200',
    execution: 'bg-teal-100 text-teal-900 ring-teal-200',
    archived: 'bg-gray-100 text-gray-600 ring-gray-200',
  };
  return `inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${map[stage]}`;
}

export function lifecycleFilterActiveClass(
  filter: WorkspaceLifecycleStage | 'all',
): string {
  if (filter === 'all') return 'bg-gray-800 text-white';
  const map: Record<WorkspaceLifecycleStage, string> = {
    draft: 'bg-gray-600 text-white',
    discussion: 'bg-emerald-700 text-white',
    consultation: 'bg-amber-600 text-white',
    resolution: 'bg-blue-700 text-white',
    meeting: 'bg-violet-700 text-white',
    voting: 'bg-orange-600 text-white',
    execution: 'bg-teal-700 text-white',
    archived: 'bg-gray-500 text-white',
  };
  return map[filter];
}

export const POSITIVE_BADGE_CLASS =
  'inline-flex rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-200';

export const ADVISORY_BADGE_CLASS =
  'inline-flex rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-800 ring-1 ring-indigo-200';
