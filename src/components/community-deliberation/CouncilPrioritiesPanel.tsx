import { Link } from 'react-router-dom';
import { computeCouncilPriorityActions } from '@/lib/community/governanceHubLifecycle';
import type { GovernanceMatterDashboardRow } from '@/lib/community/governanceMatterModel';

export type CouncilPrioritiesPanelProps = {
  langEn: boolean;
  propertyId: string;
  matters: GovernanceMatterDashboardRow[];
};

export function CouncilPrioritiesPanel({ langEn, propertyId, matters }: CouncilPrioritiesPanelProps) {
  const en = langEn;
  const priorities = computeCouncilPriorityActions(matters);

  if (!priorities.length) {
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
        {en ? 'No council actions required right now.' : '当前无需业委会待办。'}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {priorities.map((item) => (
        <li key={item.id}>
          {item.matterId ? (
            <Link
              to={`/council/workspace?${new URLSearchParams({ propertyId, matterId: item.matterId }).toString()}`}
              className="block rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 hover:border-emerald-300"
            >
              <p className="text-xs font-semibold text-emerald-950">{en ? item.labelEn : item.labelZh}</p>
              {item.matterTitle ? (
                <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-700">{item.matterTitle}</p>
              ) : null}
            </Link>
          ) : (
            <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-700">
              {en ? item.labelEn : item.labelZh}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
