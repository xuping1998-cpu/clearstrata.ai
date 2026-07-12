import { Link } from 'react-router-dom';
import { GovernanceMatterCard } from '@/components/community-deliberation/GovernanceMatterCard';
import {
  HUB_LIFECYCLE_STAGES,
  hubLifecycleEmptyLabel,
  hubLifecycleStageLabel,
  partitionMattersByHubStage,
  type HubLifecycleStage,
} from '@/lib/community/governanceHubLifecycle';
import type { ImportantUpdatesBullet } from '@/components/dashboard/ImportantUpdatesDashboardCard';
import type { GovernanceMatterDashboardRow } from '@/lib/community/governanceMatterModel';

export type GovernanceLifecycleFeedProps = {
  langEn: boolean;
  loading: boolean;
  matters: GovernanceMatterDashboardRow[];
  notices: ImportantUpdatesBullet[];
  propertyId: string;
  canCouncil?: boolean;
  /** Personal filtered views (comments/following) — show draft matters in their own section. */
  personalFilterView?: boolean;
};

function NoticeRow({ item, langEn }: { item: ImportantUpdatesBullet; langEn: boolean }) {
  const en = langEn;
  const href = item.actionUrl ?? '#';
  return (
    <Link
      to={href}
      className="block rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm hover:border-clearstrata-brand-200"
    >
      <p className="font-semibold text-gray-900">{item.text}</p>
      <p className="mt-0.5 text-xs text-gray-600">{en ? 'Official Notice' : '正式通知'}</p>
    </Link>
  );
}

function LifecycleSection({
  stage,
  matters,
  langEn,
  propertyId,
  canCouncil,
}: {
  stage: HubLifecycleStage;
  matters: GovernanceMatterDashboardRow[];
  langEn: boolean;
  propertyId: string;
  canCouncil?: boolean;
}) {
  const en = langEn;
  const title = hubLifecycleStageLabel(stage, en);
  const count = matters.length;

  return (
    <section>
      <h3 className="text-sm font-bold text-gray-900">
        {title} ({count})
      </h3>
      {count === 0 ? (
        <p className="mt-2 text-sm text-gray-500">{hubLifecycleEmptyLabel(stage, en)}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {matters.map((matter) => (
            <li key={matter.id}>
              <GovernanceMatterCard
                matter={matter}
                propertyId={propertyId}
                langEn={en}
                canCouncil={canCouncil}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function GovernanceLifecycleFeed({
  langEn,
  loading,
  matters,
  notices,
  propertyId,
  canCouncil = false,
  personalFilterView = false,
}: GovernanceLifecycleFeedProps) {
  const en = langEn;

  if (loading) {
    return <p className="text-sm text-gray-500">{en ? 'Loading governance feed…' : '加载治理动态…'}</p>;
  }

  const draftMatters = personalFilterView ? matters.filter((m) => m.status === 'draft') : [];
  const buckets = partitionMattersByHubStage(matters);

  return (
    <div className="space-y-6">
      {personalFilterView && draftMatters.length > 0 ? (
        <section>
          <h3 className="text-sm font-bold text-gray-900">
            {en ? 'Draft' : '草稿'} ({draftMatters.length})
          </h3>
          <ul className="mt-2 space-y-2">
            {draftMatters.map((matter) => (
              <li key={matter.id}>
                <GovernanceMatterCard
                  matter={matter}
                  propertyId={propertyId}
                  langEn={en}
                  canCouncil={canCouncil}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {HUB_LIFECYCLE_STAGES.map((stage) => (
        <LifecycleSection
          key={stage}
          stage={stage}
          matters={buckets[stage]}
          langEn={en}
          propertyId={propertyId}
          canCouncil={canCouncil}
        />
      ))}

      {!personalFilterView ? (
      <section>
        <h3 className="text-sm font-bold text-gray-900">
          {en ? 'Official Notice' : '正式通知'} ({notices.length})
        </h3>
        {notices.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            {en ? 'No official notices at this time.' : '暂无正式通知。'}
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {notices.map((item) => (
              <li key={item.id}>
                <NoticeRow item={item} langEn={en} />
              </li>
            ))}
          </ul>
        )}
      </section>
      ) : null}
    </div>
  );
}
