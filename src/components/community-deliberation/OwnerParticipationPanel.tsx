import { Link } from 'react-router-dom';
import { meetingsNavHref } from '@/lib/meetingPermissions';
import { governanceMattersHubViewUrl } from '@/lib/community/governanceMatterModel';

export type ParticipationCountState = 'idle' | 'loading' | 'ok' | 'error';

export type OwnerParticipationPanelProps = {
  langEn: boolean;
  propertyId: string;
  commentedMatterCount: number;
  commentsCountState: ParticipationCountState;
  followingCount: number;
  followingCountState: ParticipationCountState;
  roleInProperty: string | null | undefined;
  activeMatterCount?: number;
  votingMatterCount?: number;
};

export function OwnerParticipationPanel({
  langEn,
  propertyId,
  commentedMatterCount,
  commentsCountState,
  followingCount,
  followingCountState,
  roleInProperty,
  activeMatterCount = 0,
  votingMatterCount = 0,
}: OwnerParticipationPanelProps) {
  const en = langEn;
  const votingHref = meetingsNavHref(roleInProperty);
  const commentsHref = governanceMattersHubViewUrl(propertyId, 'comments');
  const followingHref = governanceMattersHubViewUrl(propertyId, 'subscribed');

  return (
    <aside className="rounded-xl border border-sky-200 bg-gradient-to-b from-sky-50/90 to-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-sky-900">
        {en ? 'Your Participation' : '我的治理参与'}
      </p>
      <p className="mt-0.5 text-[11px] text-sky-800/90">
        {en
          ? 'Your participation in community governance.'
          : '您在社区治理中的参与记录'}
      </p>

      <ul className="mt-3 space-y-2">
        <ParticipationLink
          href={commentsHref}
          label={en ? 'My Comments' : '我的评论'}
          detail={countDetail(commentsCountState, commentedMatterCount, en, 'comments')}
        />
        <ParticipationLink
          href={votingHref}
          label={en ? 'My Votes' : '我的投票'}
          detail={en ? 'Meetings & voting' : '会议与投票'}
        />
        <ParticipationLink
          href={followingHref}
          label={en ? 'Following' : '关注事项'}
          detail={countDetail(followingCountState, followingCount, en, 'following')}
        />
      </ul>

      {(activeMatterCount > 0 || votingMatterCount > 0) ? (
        <div className="mt-3 rounded-lg border border-sky-100 bg-white/80 px-2.5 py-2 text-[11px] text-gray-700">
          {activeMatterCount > 0 ? (
            <p>
              {en
                ? `${activeMatterCount} matter${activeMatterCount === 1 ? '' : 's'} may need your attention`
                : `${activeMatterCount} 项事项可能需要您的关注`}
            </p>
          ) : null}
          {votingMatterCount > 0 ? (
            <p className={activeMatterCount > 0 ? 'mt-1' : ''}>
              {en
                ? `${votingMatterCount} vote${votingMatterCount === 1 ? '' : 's'} approaching`
                : `${votingMatterCount} 项投票即将进行`}
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="mt-4 text-[10px] leading-snug text-gray-600">
        {en
          ? 'Governance happens in the same public space where the community deliberates.'
          : '治理发生在社区议事的同一公开空间。'}
      </p>
    </aside>
  );
}

function countDetail(
  state: ParticipationCountState,
  count: number,
  en: boolean,
  kind: 'comments' | 'following',
): { text: string; title?: string } {
  if (state === 'loading') {
    return { text: '…', title: en ? 'Loading…' : '加载中…' };
  }
  if (state === 'error') {
    return {
      text: '!',
      title:
        kind === 'comments'
          ? en
            ? 'Could not load comment count'
            : '无法加载评论数量'
          : en
            ? 'Could not load following count'
            : '无法加载关注数量',
    };
  }
  if (state === 'idle') {
    return { text: en ? '—' : '—' };
  }
  return { text: `${count}` };
}

function ParticipationLink({
  href,
  label,
  detail,
}: {
  href: string;
  label: string;
  detail: { text: string; title?: string };
}) {
  return (
    <li>
      <Link
        to={href}
        className="flex items-center justify-between rounded-md border border-sky-100 bg-white/80 px-2.5 py-2 text-xs hover:bg-sky-50/80"
      >
        <span className="font-semibold text-gray-900">{label}</span>
        <span
          className={`text-gray-600 ${detail.text === '!' ? 'font-bold text-amber-700' : ''}`}
          title={detail.title}
          aria-busy={detail.text === '…' ? true : undefined}
        >
          {detail.text}
        </span>
      </Link>
    </li>
  );
}
