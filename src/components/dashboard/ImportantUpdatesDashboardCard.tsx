import { Link } from 'react-router-dom';
import { Megaphone } from 'lucide-react';

/** 占位：后续可由 props / hook 替换为真实公告、待办、通知数据源 */
export type ImportantUpdatesBullet = {
  /** 稳定键，便于列表 Diff / analytics */
  id: string;
  text: string;
};

export type ImportantUpdatesDashboardCardProps = {
  /** true = 英文主界面 */
  langEn: boolean;
  /** 可选：接入真实数据时传入；缺省则用静态占位 */
  bullets?: ImportantUpdatesBullet[];
};

const FALLBACK_ZH: ImportantUpdatesBullet[] = [
  { id: 'agm', text: 'AGM年度会议将于6月15日召开' },
  { id: 'elevator', text: '电梯维修：周三 9am–3pm' },
  { id: 'vote', text: '你有 1 项待投票事项' },
  { id: 'notices', text: '2 条未读社区通知' },
];

const FALLBACK_EN: ImportantUpdatesBullet[] = [
  { id: 'agm', text: 'AGM meeting scheduled for June 15' },
  { id: 'elevator', text: 'Elevator maintenance: Wednesday 9am–3pm' },
  { id: 'vote', text: 'You have 1 pending vote' },
  { id: 'notices', text: '2 unread community notices' },
];

/**
 * 首页「透明社区治理」首屏模块：重大公告 / 待办 / 最新通知占位。
 */
export function ImportantUpdatesDashboardCard({ langEn, bullets }: ImportantUpdatesDashboardCardProps) {
  const title = langEn ? 'Important Updates' : '重大公告';
  const subtitle = langEn
    ? 'Community notices, tasks and latest updates'
    : '社区重要公告、待办事项与最新通知';
  const cta = langEn ? 'View all' : '查看全部';
  const list = bullets ?? (langEn ? FALLBACK_EN : FALLBACK_ZH);

  return (
    <section
      className="mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-4"
      aria-labelledby="home-important-updates-heading"
      data-widget="important-updates"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-clearstrata-ui-soft ring-1 ring-clearstrata-ui-softBorder">
              <Megaphone className="h-4 w-4 text-clearstrata-brand-800" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 id="home-important-updates-heading" className="text-base font-bold leading-tight text-gray-900 sm:text-[17px]">
                {title}
              </h2>
              <p className="mt-px text-[13px] leading-snug text-gray-600 sm:text-sm">{subtitle}</p>
            </div>
          </div>
        </div>
        <Link
          to="/owner-info?tab=announcements#owner-announcements"
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-clearstrata-ui-softBorder bg-white px-3 py-1.5 text-xs font-semibold text-clearstrata-brand-900 shadow-sm hover:bg-clearstrata-brand-50 active:bg-clearstrata-brand-100/80 sm:text-[13px]"
        >
          {cta}
        </Link>
      </div>

      <ul className="mt-3 space-y-1.5 border-t border-gray-100 pt-2.5 text-[13px] leading-snug text-gray-800 sm:text-sm">
        {list.map((row) => (
          <li key={row.id} className="flex gap-2.5 leading-snug">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-clearstrata-ui-primary" aria-hidden />
            <span>{row.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
