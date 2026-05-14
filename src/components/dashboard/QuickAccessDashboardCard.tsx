import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { CalendarDays, ClipboardList, FileSearch, ShoppingCart } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export type QuickAccessDashboardCardProps = {
  langEn: boolean;
  /** 与侧栏一致：业委会/物业管理员 → /meetings，其余 → /owner-voting */
  meetingsHref: '/meetings' | '/owner-voting';
};

type QuickTile = {
  id: string;
  to: string;
  labelZh: string;
  labelEn: string;
  Icon: LucideIcon;
  /** 与 Layout 左侧模块卡片 icon 容器同色（仅快捷入口图标区，不累染整卡） */
  iconWrapClass: string;
};

/** 物业经理任务页「业主诉求」tab：`ManagerTasks` 中 NAV_TABS key `owner_request` + searchParams `task_type` */
const MANAGER_TASKS_OWNER_REQUEST_TAB = {
  pathname: '/manager-tasks',
  search: '?task_type=owner_request',
} as const;

const TILES: readonly QuickTile[] = [
  {
    id: 'meetings-voting',
    /* 运行时替换为 meetingsHref（与侧栏会议投票入口一致） */
    to: '__MEETINGS__',
    labelZh: '会议投票',
    labelEn: 'Meetings & Voting',
    Icon: CalendarDays,
    iconWrapClass:
      'bg-violet-600 ring-1 ring-violet-500/30 transition-colors duration-150 group-hover:bg-violet-700 group-hover:ring-violet-400/40',
  },
  {
    id: 'owner-requests',
    to: '__OWNER_REQUEST_TAB__',
    labelZh: '业主诉求',
    labelEn: 'Owner Requests',
    Icon: ClipboardList,
    iconWrapClass:
      'bg-clearstrata-brand-700 ring-1 ring-clearstrata-brand-800/25 transition-colors duration-150 group-hover:bg-clearstrata-brand-800 group-hover:ring-clearstrata-brand-700/35',
  },
  {
    id: 'invoice-search',
    to: '/finance/invoices',
    labelZh: '发票查询',
    labelEn: 'Invoice Search',
    Icon: FileSearch,
    iconWrapClass:
      'bg-clearstrata-brand-600 ring-1 ring-clearstrata-brand-700/25 transition-colors duration-150 group-hover:bg-clearstrata-brand-700 group-hover:ring-clearstrata-brand-600/35',
  },
  {
    id: 'procurement',
    to: '/procurement',
    labelZh: '采购询价',
    labelEn: 'Procurement Quotes',
    Icon: ShoppingCart,
    iconWrapClass:
      'bg-blue-500 ring-1 ring-blue-400/35 transition-colors duration-150 group-hover:bg-blue-600 group-hover:ring-blue-300/45',
  },
] as const;

/**
 * 首页「快捷入口」：四宫格可点击卡片，与重大公告同属治理首页套件。
 */
export function QuickAccessDashboardCard({ langEn, meetingsHref }: QuickAccessDashboardCardProps) {
  const { t } = useLanguage();
  const title = langEn ? 'Quick Access' : '快捷入口';

  return (
    <section
      className="mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-4"
      aria-labelledby="home-quick-access-heading"
      data-widget="quick-access"
    >
      <h2 id="home-quick-access-heading" className="text-base font-bold text-gray-900 sm:text-[17px]">
        {title}
      </h2>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {TILES.map(({ id, to, labelZh, labelEn, Icon, iconWrapClass }) => {
          const toProp =
            to === '__MEETINGS__'
              ? meetingsHref
              : to === '__OWNER_REQUEST_TAB__'
                ? MANAGER_TASKS_OWNER_REQUEST_TAB
                : to;
          const label =
            id === 'meetings-voting'
              ? meetingsHref === '/owner-voting'
                ? t('nav_owner_initiated_sgm')
                : t('nav_meetings_records')
              : langEn
                ? labelEn
                : labelZh;
          return (
            <Link
              key={id}
              to={toProp}
              className={[
                'group flex min-h-[4.5rem] flex-col items-stretch justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm sm:min-h-[5rem] lg:min-h-[5.25rem]',
                'outline-none ring-clearstrata-ui-primary/35 transition-colors',
                'hover:border-clearstrata-ui-softBorder hover:bg-clearstrata-ui-soft/50 hover:shadow-md',
                'focus-visible:ring-2 focus-visible:ring-offset-2',
                'active:scale-[0.99]',
              ].join(' ')}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconWrapClass}`}
              >
                <Icon className="h-5 w-5 text-white" strokeWidth={2} aria-hidden />
              </span>
              <span className="min-w-0 text-left text-[13px] font-semibold leading-snug text-gray-900 group-hover:text-clearstrata-brand-900">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
