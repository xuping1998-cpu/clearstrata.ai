import { Link } from 'react-router-dom';
import type { ImportantUpdatesBullet } from '@/components/dashboard/ImportantUpdatesDashboardCard';

/** Re-export feed row renderer pattern from dashboard card sections. */
export type CommunityDiscussionFeedProps = {
  langEn: boolean;
  loading: boolean;
  discussions: ImportantUpdatesBullet[];
  consultations: ImportantUpdatesBullet[];
  notices: ImportantUpdatesBullet[];
};

function FeedRow({ item, langEn }: { item: ImportantUpdatesBullet; langEn: boolean }) {
  const en = langEn;
  const href = item.actionUrl ?? '#';
  const meta: string[] = [];
  if (item.commentCount != null && item.commentCount > 0) {
    meta.push(en ? `${item.commentCount} comments` : `${item.commentCount} 条评论`);
  }
  if (item.remainingDays != null) {
    meta.push(en ? `${item.remainingDays} days left` : `剩余 ${item.remainingDays} 天`);
  }
  if (item.openUntil) meta.push(item.openUntil);

  return (
    <Link
      to={href}
      className="block rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm hover:border-clearstrata-brand-200"
    >
      <p className="text-sm font-semibold text-gray-900">{item.text}</p>
      {meta.length ? <p className="mt-0.5 text-xs text-gray-600">{meta.join(' · ')}</p> : null}
    </Link>
  );
}

function FeedSection({
  title,
  items,
  langEn,
  empty,
}: {
  title: string;
  items: ImportantUpdatesBullet[];
  langEn: boolean;
  empty: string;
}) {
  return (
    <section>
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <FeedRow item={item} langEn={langEn} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CommunityDiscussionFeed({
  langEn,
  loading,
  discussions,
  consultations,
  notices,
}: CommunityDiscussionFeedProps) {
  const en = langEn;

  if (loading) {
    return <p className="text-sm text-gray-500">{en ? 'Loading governance feed…' : '加载治理动态…'}</p>;
  }

  return (
    <div className="space-y-6">
      <FeedSection
        title={en ? 'Discussion' : '讨论中'}
        items={discussions}
        langEn={en}
        empty={
          en
            ? 'No governance matters are currently under discussion.'
            : '暂无正在讨论的治理事项。'
        }
      />
      <FeedSection
        title={en ? 'Public Consultation' : '公开征求意见'}
        items={consultations}
        langEn={en}
        empty={en ? 'No public consultations at this time.' : '暂无公开征求意见事项。'}
      />
      <FeedSection
        title={en ? 'Official Notice' : '正式通知'}
        items={notices}
        langEn={en}
        empty={en ? 'No official notices at this time.' : '暂无正式通知。'}
      />
    </div>
  );
}
