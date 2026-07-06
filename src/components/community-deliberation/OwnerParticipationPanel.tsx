import { Link } from 'react-router-dom';
import { meetingsNavHref } from '@/lib/meetingPermissions';

export type OwnerParticipationPanelProps = {
  langEn: boolean;
  propertyId: string;
  commentCount: number;
  roleInProperty: string | null | undefined;
};

export function OwnerParticipationPanel({
  langEn,
  propertyId,
  commentCount,
  roleInProperty,
}: OwnerParticipationPanelProps) {
  const en = langEn;
  const votingHref = meetingsNavHref(roleInProperty);

  return (
    <aside className="rounded-xl border border-sky-200 bg-gradient-to-b from-sky-50/90 to-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-sky-900">
        {en ? 'My Participation' : '我的参与'}
      </p>
      <p className="mt-0.5 text-[11px] text-sky-800/90">
        {en ? 'Your voice in community governance' : '您在社区治理中的参与'}
      </p>

      <ul className="mt-3 space-y-2">
        <ParticipationLink
          href={`/community-deliberation?${new URLSearchParams({ propertyId }).toString()}`}
          label={en ? 'My Comments' : '我的评论'}
          detail={commentCount > 0 ? `${commentCount}` : en ? '—' : '—'}
        />
        <ParticipationLink
          href={votingHref}
          label={en ? 'My Votes' : '我的投票'}
          detail={en ? 'Meetings & voting' : '会议与投票'}
        />
        <ParticipationLink
          href="/owner-info?tab=announcements"
          label={en ? 'My Subscriptions' : '我的订阅'}
          detail={en ? 'Notices' : '通知'}
        />
        <ParticipationLink
          href={`/community-deliberation?${new URLSearchParams({ propertyId }).toString()}`}
          label={en ? 'Followed Matters' : '关注的事项'}
          detail={en ? 'Active deliberation' : '进行中的议事'}
        />
      </ul>

      <p className="mt-4 text-[10px] leading-snug text-gray-600">
        {en
          ? 'Governance happens in the same public space where the community deliberates.'
          : '治理发生在社区议事的同一公开空间。'}
      </p>
    </aside>
  );
}

function ParticipationLink({ href, label, detail }: { href: string; label: string; detail: string }) {
  return (
    <li>
      <Link
        to={href}
        className="flex items-center justify-between rounded-md border border-sky-100 bg-white/80 px-2.5 py-2 text-xs hover:bg-sky-50/80"
      >
        <span className="font-semibold text-gray-900">{label}</span>
        <span className="text-gray-600">{detail}</span>
      </Link>
    </li>
  );
}
