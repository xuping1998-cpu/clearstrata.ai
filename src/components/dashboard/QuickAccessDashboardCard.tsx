import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { CalendarDays, ClipboardList, FileSearch, ShoppingCart } from 'lucide-react';

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
  },
  {
    id: 'owner-requests',
    to: '__OWNER_REQUEST_TAB__',
    labelZh: '业主诉求',
    labelEn: 'Owner Requests',
    Icon: ClipboardList,
  },
  {
    id: 'invoice-search',
    to: '/finance/invoices',
    labelZh: '发票查询',
    labelEn: 'Invoice Search',
    Icon: FileSearch,
  },
  {
    id: 'procurement',
    to: '/procurement',
    labelZh: '采购询价',
    labelEn: 'Procurement Quotes',
    Icon: ShoppingCart,
  },
] as const;

/**
 * 首页「快捷入口」：四宫格可点击卡片，与重大公告同属治理首页套件。
 */
export function QuickAccessDashboardCard({ langEn, meetingsHref }: QuickAccessDashboardCardProps) {
  const title = langEn ? 'Quick Access' : '快捷入口';

  return (
    <section
      className="mb-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby="home-quick-access-heading"
      data-widget="quick-access"
    >
      <h2 id="home-quick-access-heading" className="text-lg font-bold text-gray-900 sm:text-xl">
        {title}
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {TILES.map(({ id, to, labelZh, labelEn, Icon }) => {
          const toProp =
            to === '__MEETINGS__'
              ? meetingsHref
              : to === '__OWNER_REQUEST_TAB__'
                ? MANAGER_TASKS_OWNER_REQUEST_TAB
                : to;
          const label = langEn ? labelEn : labelZh;
          return (
            <Link
              key={id}
              to={toProp}
              className={[
                'group flex min-h-[5.25rem] flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm',
                'outline-none ring-clearstrata-ui-primary/35 transition-colors',
                'hover:border-clearstrata-ui-softBorder hover:bg-clearstrata-ui-soft/50 hover:shadow-md',
                'focus-visible:ring-2 focus-visible:ring-offset-2',
                'active:scale-[0.99]',
              ].join(' ')}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-clearstrata-ui-soft ring-1 ring-clearstrata-ui-softBorder">
                <Icon className="h-5 w-5 text-clearstrata-brand-800" aria-hidden />
              </span>
              <span className="mt-3 block text-sm font-semibold leading-snug text-gray-900 group-hover:text-clearstrata-brand-900">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
