import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Megaphone } from 'lucide-react';

export type ImportantUpdateKind = 'action' | 'notice';

/** 占位：后续可由 props / hook 替换为真实公告、待办、通知数据源 */
export type ImportantUpdatesBullet = {
  /** 稳定键，便于列表 Diff / analytics */
  id: string;
  text: string;
  /** 需要处理 vs 最新通知；缺省视为 notice */
  kind?: ImportantUpdateKind;
  /** 立即查看跳转；缺省走公告 tab */
  actionUrl?: string;
  source?: 'vote' | 'announcement' | 'agm_sgm';
  createdAt?: string;
  priority?: number;
};

export type ImportantUpdatesDashboardCardProps = {
  /** true = 英文主界面 */
  langEn: boolean;
  /** 可选：接入真实数据时传入；缺省则用静态占位 */
  bullets?: ImportantUpdatesBullet[];
};

const FALLBACK_ZH: ImportantUpdatesBullet[] = [
  {
    id: 'sgm-vote',
    kind: 'action',
    text: 'SGM 年度會議將於 6 月 19 日開放投票',
    actionUrl: '/voting',
  },
  { id: 'elevator', kind: 'notice', text: '電梯維修通知' },
  { id: 'agm', kind: 'notice', text: 'AGM 年度会议将于 6 月 15 日召开' },
];

const FALLBACK_EN: ImportantUpdatesBullet[] = [
  {
    id: 'sgm-vote',
    kind: 'action',
    text: 'SGM annual meeting voting opens June 19',
    actionUrl: '/voting',
  },
  { id: 'elevator', kind: 'notice', text: 'Elevator maintenance notice' },
  { id: 'agm', kind: 'notice', text: 'AGM meeting scheduled for June 15' },
];

const DEFAULT_VIEW_URL = '/owner-info?tab=announcements';

function splitByKind(items: ImportantUpdatesBullet[]) {
  const actions: ImportantUpdatesBullet[] = [];
  const notices: ImportantUpdatesBullet[] = [];
  for (const item of items) {
    if (item.kind === 'action') actions.push(item);
    else notices.push(item);
  }
  return { actions, notices };
}

function actionBadgeLabel(count: number, langEn: boolean) {
  if (langEn) return count === 1 ? '1 action item' : `${count} action items`;
  return `需處理 ${count} 項`;
}

function noticeBadgeLabel(langEn: boolean) {
  return langEn ? 'Latest notice' : '最新通知';
}

type UpdateBadgeProps = {
  variant: 'action' | 'notice';
  label: string;
};

function UpdateBadge({ variant, label }: UpdateBadgeProps) {
  const className =
    variant === 'action'
      ? 'rounded-full border border-orange-400 bg-orange-50/60 px-2 py-0.5 text-[11px] font-semibold leading-none text-orange-700 sm:text-xs'
      : 'rounded-full bg-clearstrata-brand-50 px-2 py-0.5 text-[11px] font-semibold leading-none text-clearstrata-brand-800 ring-1 ring-clearstrata-brand-200 sm:text-xs';

  return (
    <span className={`inline-flex shrink-0 items-center ${className}`}>
      {label}
    </span>
  );
}

type PreviewLineProps = {
  item: ImportantUpdatesBullet;
  actionCount: number;
  langEn: boolean;
};

function PreviewLine({ item, actionCount, langEn }: PreviewLineProps) {
  const isAction = item.kind === 'action';
  const badgeLabel = isAction ? actionBadgeLabel(actionCount, langEn) : noticeBadgeLabel(langEn);

  return (
    <div className="flex min-w-0 items-start gap-2 text-[13px] leading-snug text-gray-800 sm:text-sm">
      <UpdateBadge variant={isAction ? 'action' : 'notice'} label={badgeLabel} />
      <span className="min-w-0 flex-1 pt-px">{item.text}</span>
    </div>
  );
}

type GroupedListProps = {
  title: string;
  items: ImportantUpdatesBullet[];
};

function GroupedList({ title, items }: GroupedListProps) {
  if (items.length === 0) return null;

  return (
    <div>
      <h3 className="mb-1.5 text-xs font-semibold text-gray-700">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((row) => (
          <li key={row.id} className="flex min-w-0 items-start gap-2.5 text-[13px] leading-snug text-gray-800 sm:text-sm">
            <span
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                row.kind === 'action' ? 'bg-orange-400' : 'bg-clearstrata-ui-primary'
              }`}
              aria-hidden
            />
            <span className="min-w-0 flex-1">{row.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * 首页「透明社区治理」首屏模块：重要事項 / Important Updates 摺叠卡片。
 */
export function ImportantUpdatesDashboardCard({ langEn, bullets }: ImportantUpdatesDashboardCardProps) {
  const [expanded, setExpanded] = useState(false);

  const title = langEn ? 'Important Updates' : '重要事項';
  const subtitle = langEn
    ? 'Community updates, action items and latest notices'
    : '社區重要公告、待辦事項與最新通知';
  const cta = langEn ? 'View now' : '立即查看';
  const emptyText = langEn ? 'No new important updates right now' : '目前沒有新的重要事項';
  const actionGroupTitle = langEn ? 'Action required' : '需要處理';
  const noticeGroupTitle = langEn ? 'Latest notices' : '最新通知';
  const expandLabel = langEn ? (expanded ? 'Collapse updates' : 'Expand updates') : expanded ? '收起' : '展開';

  const list = Array.isArray(bullets) ? bullets : langEn ? FALLBACK_EN : FALLBACK_ZH;
  const { actions, notices } = useMemo(() => splitByKind(list), [list]);

  const previewItem = actions[0] ?? notices[0] ?? null;
  const ctaUrl = previewItem?.actionUrl ?? DEFAULT_VIEW_URL;
  const hasContent = list.length > 0;

  return (
    <section
      className="mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5"
      aria-labelledby="home-important-updates-heading"
      data-widget="important-updates"
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-clearstrata-ui-soft ring-1 ring-clearstrata-ui-softBorder">
          <Megaphone className="h-4 w-4 text-clearstrata-brand-800" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2
                id="home-important-updates-heading"
                className="text-base font-bold leading-tight text-gray-900 sm:text-[17px]"
              >
                {title}
              </h2>
              <p className="mt-0.5 text-[13px] leading-snug text-gray-600 sm:text-sm">{subtitle}</p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <Link
                to={ctaUrl}
                className="inline-flex items-center justify-center rounded-lg border border-clearstrata-ui-softBorder bg-white px-2.5 py-1.5 text-xs font-semibold text-clearstrata-brand-900 shadow-sm hover:bg-clearstrata-brand-50 active:bg-clearstrata-brand-100/80 sm:px-3 sm:text-[13px]"
              >
                {cta}
              </Link>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls="home-important-updates-panel"
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

          <div className="mt-3 border-t border-gray-100 pt-3">
            {!hasContent ? (
              <p className="text-[13px] leading-snug text-gray-500 sm:text-sm">{emptyText}</p>
            ) : previewItem ? (
              <PreviewLine item={previewItem} actionCount={actions.length} langEn={langEn} />
            ) : null}
          </div>

          {expanded && hasContent ? (
            <div
              id="home-important-updates-panel"
              className="mt-3 space-y-4 border-t border-gray-100 pt-3 text-[13px] sm:text-sm"
            >
              <GroupedList title={actionGroupTitle} items={actions} />
              <GroupedList title={noticeGroupTitle} items={notices} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
