import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, MessagesSquare } from 'lucide-react';

export type ImportantUpdateKind = 'action' | 'notice';

export type DeliberationContentType = 'discussion' | 'consultation' | 'notice';

/** Reused by hooks — Phase 1 maps rows to deliberation content types in the card UI. */
export type ImportantUpdatesBullet = {
  id: string;
  text: string;
  kind?: ImportantUpdateKind;
  actionUrl?: string;
  source?: 'vote' | 'announcement' | 'agm_sgm';
  createdAt?: string;
  priority?: number;
  /** Optional explicit Phase 1 content type; inferred when omitted. */
  contentType?: DeliberationContentType;
  commentCount?: number;
  remainingDays?: number;
  openUntil?: string;
};

export type ImportantUpdatesDashboardCardProps = {
  langEn: boolean;
  bullets?: ImportantUpdatesBullet[];
  /** Phase 2: skip Phase 1 demo rows when real governance matters exist */
  hasRealGovernanceMatters?: boolean;
  /** Link for "View all community matters" */
  mattersListUrl?: string;
};

const DEFAULT_VIEW_URL = '/owner-info?tab=announcements';

const FALLBACK_ZH: ImportantUpdatesBullet[] = [
  {
    id: 'sgm-vote',
    kind: 'action',
    contentType: 'discussion',
    text: 'SGM 年度會議將於 6 月 19 日開放投票',
    actionUrl: '/voting',
  },
  { id: 'elevator', kind: 'notice', contentType: 'notice', text: '電梯維修通知' },
  { id: 'agm', kind: 'notice', contentType: 'notice', text: 'AGM 年度会议将于 6 月 15 日召开' },
];

const FALLBACK_EN: ImportantUpdatesBullet[] = [
  {
    id: 'sgm-vote',
    kind: 'action',
    contentType: 'discussion',
    text: 'SGM annual meeting voting opens June 19',
    actionUrl: '/voting',
  },
  { id: 'elevator', kind: 'notice', contentType: 'notice', text: 'Elevator maintenance notice' },
  { id: 'agm', kind: 'notice', contentType: 'notice', text: 'AGM meeting scheduled for June 15' },
];

function inferContentType(item: ImportantUpdatesBullet): DeliberationContentType {
  if (item.contentType) return item.contentType;
  if (item.kind === 'notice' || item.source === 'announcement') return 'notice';
  if (item.source === 'agm_sgm') {
    const t = item.text;
    if (/notice period|通知期|公示期|public notice|consultation/i.test(t)) return 'consultation';
    return 'discussion';
  }
  if (item.kind === 'action' || item.source === 'vote') return 'discussion';
  return 'notice';
}

function phase1DemoDiscussions(langEn: boolean): ImportantUpdatesBullet[] {
  return [
    {
      id: 'demo-discussion-pm',
      contentType: 'discussion',
      text: langEn ? 'Property Management Renewal' : '物业管理续约',
      commentCount: 128,
      remainingDays: 12,
      actionUrl: '/meetings',
    },
    {
      id: 'demo-consultation-budget',
      contentType: 'consultation',
      text: langEn ? '2027 Budget Proposal' : '2027 年度预算方案',
      openUntil: langEn ? 'Open until Jul 15' : '开放至 7 月 15 日',
      actionUrl: '/meetings',
    },
  ];
}

export function partitionBullets(items: ImportantUpdatesBullet[]) {
  const discussions: ImportantUpdatesBullet[] = [];
  const consultations: ImportantUpdatesBullet[] = [];
  const notices: ImportantUpdatesBullet[] = [];

  for (const item of items) {
    const type = inferContentType(item);
    if (type === 'discussion') discussions.push(item);
    else if (type === 'consultation') consultations.push(item);
    else notices.push(item);
  }

  return { discussions, consultations, notices };
}

export function mergeDeliberationBullets(
  matterBullets: ImportantUpdatesBullet[],
  noticeBullets: ImportantUpdatesBullet[],
  langEn: boolean,
  hasRealGovernanceMatters: boolean,
): ImportantUpdatesBullet[] {
  const { discussions, consultations } = partitionBullets(matterBullets);
  const notices = partitionBullets(noticeBullets).notices;

  if (hasRealGovernanceMatters) {
    return [...discussions, ...consultations, ...notices];
  }

  const demos = phase1DemoDiscussions(langEn);
  return [
    ...(discussions.length ? discussions : demos.filter((d) => d.contentType === 'discussion')),
    ...(consultations.length ? consultations : demos.filter((d) => d.contentType === 'consultation')),
    ...notices,
  ];
}

type StatusDotProps = { variant: DeliberationContentType };

function StatusDot({ variant }: StatusDotProps) {
  const color =
    variant === 'discussion'
      ? 'bg-emerald-500'
      : variant === 'consultation'
        ? 'bg-amber-400'
        : 'bg-clearstrata-ui-primary';
  return <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${color}`} aria-hidden />;
}

type DeliberationRowProps = {
  item: ImportantUpdatesBullet;
  langEn: boolean;
};

function DeliberationRow({ item, langEn }: DeliberationRowProps) {
  const type = inferContentType(item);
  const url = item.actionUrl ?? DEFAULT_VIEW_URL;

  const statusLabel =
    type === 'discussion'
      ? langEn
        ? 'Discussion'
        : '讨论中'
      : type === 'consultation'
        ? langEn
          ? 'Public Consultation'
          : '公开征求意见'
        : langEn
          ? 'Official Notice'
          : '正式通知';

  const metaParts: string[] = [statusLabel];
  if (type === 'discussion' && item.commentCount != null) {
    metaParts.push(langEn ? `${item.commentCount} Comments` : `${item.commentCount} 条评论`);
  }
  if (type === 'discussion' && item.remainingDays != null) {
    metaParts.push(langEn ? `${item.remainingDays} Days Remaining` : `剩余 ${item.remainingDays} 天`);
  }
  if (type === 'consultation' && item.openUntil) {
    metaParts.push(item.openUntil);
  }

  const ctaLabel =
    type === 'discussion'
      ? langEn
        ? 'Join Discussion'
        : '参与讨论'
      : type === 'consultation'
        ? langEn
          ? 'View Consultation'
          : '查看意见'
        : langEn
          ? 'View'
          : '查看';

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5 sm:px-3.5 sm:py-3">
      <div className="flex items-start gap-2.5">
        <StatusDot variant={type} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-snug text-gray-900 sm:text-sm">{item.text}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-gray-600 sm:text-xs">{metaParts.join(' · ')}</p>
          <Link
            to={url}
            className="mt-2 inline-flex items-center justify-center rounded-lg border border-clearstrata-ui-softBorder bg-white px-2.5 py-1 text-[11px] font-semibold text-clearstrata-brand-900 shadow-sm hover:bg-clearstrata-brand-50 active:bg-clearstrata-brand-100/80 sm:text-xs"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}

type SectionBlockProps = {
  title: string;
  items: ImportantUpdatesBullet[];
  langEn: boolean;
};

function SectionBlock({ title, items, langEn }: SectionBlockProps) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      <div className="space-y-2">
        {items.map((row) => (
          <DeliberationRow key={row.id} item={row} langEn={langEn} />
        ))}
      </div>
    </div>
  );
}

/**
 * Project One Phase 1 — Community Deliberation landing (replaces Important Updates top card).
 * Data: reuses Important Updates bullets; no schema or API changes.
 */
export function CommunityDeliberationDashboardCard({
  langEn,
  bullets,
  hasRealGovernanceMatters = false,
  mattersListUrl,
}: ImportantUpdatesDashboardCardProps) {
  const [expanded, setExpanded] = useState(false);

  const titleZh = '治理中心';
  const titleEn = 'Governance Hub';
  const motto = langEn
    ? 'Good governance begins with listening.'
    : '良好的治理，始于认真倾听。';
  const subtitle = langEn
    ? 'Community Deliberation — one public space for every role.'
    : '社区议事厅 — 同一治理空间，不同职责。';
  const emptyText = langEn ? 'No community matters to show right now' : '目前没有社区议事事项';
  const expandLabel = langEn ? (expanded ? 'Collapse' : 'Expand') : expanded ? '收起' : '展开';
  const viewAllLabel = langEn ? 'Open Governance Hub' : '进入治理中心';

  const discussionSectionTitle = langEn ? 'In discussion' : '讨论中';
  const consultationSectionTitle = langEn ? 'Public consultation' : '公开征求意见';
  const noticeSectionTitle = langEn ? 'Official notices' : '正式通知';

  const rawList = Array.isArray(bullets) ? bullets : langEn ? FALLBACK_EN : FALLBACK_ZH;
  const matterRows = rawList.filter((b) => b.id.startsWith('governance-matter-'));
  const noticeRows = rawList.filter((b) => !b.id.startsWith('governance-matter-') && inferContentType(b) === 'notice');
  const list = useMemo(
    () => mergeDeliberationBullets(matterRows, noticeRows, langEn, hasRealGovernanceMatters),
    [matterRows, noticeRows, langEn, hasRealGovernanceMatters],
  );
  const viewAllUrl = mattersListUrl ?? DEFAULT_VIEW_URL;
  const { discussions, consultations, notices } = useMemo(() => partitionBullets(list), [list]);

  const previewRows = useMemo(() => {
    const rows: ImportantUpdatesBullet[] = [];
    if (discussions[0]) rows.push(discussions[0]);
    if (consultations[0]) rows.push(consultations[0]);
    if (notices[0]) rows.push(notices[0]);
    return rows.slice(0, 3);
  }, [discussions, consultations, notices]);

  const hasContent = list.length > 0;

  return (
    <section
      className="mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5"
      aria-labelledby="home-community-deliberation-heading"
      data-widget="community-deliberation"
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-clearstrata-ui-soft ring-1 ring-clearstrata-ui-softBorder">
          <MessagesSquare className="h-4 w-4 text-clearstrata-brand-800" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2
                id="home-community-deliberation-heading"
                className="text-base font-bold leading-tight text-gray-900 sm:text-[17px]"
              >
                {langEn ? titleEn : titleZh}
                <span className="mt-0.5 block text-[13px] font-semibold text-clearstrata-brand-800 sm:text-sm">
                  {langEn ? titleZh : titleEn}
                </span>
              </h2>
              <p className="mt-1 text-[13px] font-medium leading-snug text-gray-800 sm:text-sm">{motto}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-gray-600 sm:text-[13px]">{subtitle}</p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <Link
                to={viewAllUrl}
                className="inline-flex items-center justify-center rounded-lg bg-clearstrata-ui-primary px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryHover sm:px-3 sm:text-[13px]"
              >
                {viewAllLabel}
              </Link>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls="home-community-deliberation-panel"
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 active:bg-gray-100"
                aria-label={expandLabel}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>
            </div>
          </div>

          <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
            {!hasContent ? (
              <p className="text-[13px] leading-snug text-gray-500 sm:text-sm">{emptyText}</p>
            ) : expanded ? null : (
              previewRows.map((row) => <DeliberationRow key={row.id} item={row} langEn={langEn} />)
            )}
          </div>

          {expanded && hasContent ? (
            <div
              id="home-community-deliberation-panel"
              className="mt-3 space-y-4 border-t border-gray-100 pt-3"
            >
              <SectionBlock title={discussionSectionTitle} items={discussions} langEn={langEn} />
              <SectionBlock title={consultationSectionTitle} items={consultations} langEn={langEn} />
              <SectionBlock title={noticeSectionTitle} items={notices} langEn={langEn} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** @deprecated Use CommunityDeliberationDashboardCard — kept for Phase 1 import stability. */
export const ImportantUpdatesDashboardCard = CommunityDeliberationDashboardCard;
