import { Link } from 'react-router-dom';
import type { DashboardKpi } from '../../types/dashboard';

function valueClass(key: DashboardKpi['key']) {
  switch (key) {
    case 'high_risk_alerts':
      return 'text-red-600';
    case 'monthly_abnormal_invoices':
      return 'text-amber-600';
    default:
      return 'text-gray-900';
  }
}

function kpiCornerHint(item: DashboardKpi, en: boolean): string {
  if (item.key === 'high_risk_alerts') {
    return en ? 'Summary' : '风险汇总';
  }
  return item.hint ?? '';
}

function cardShellCompact(className: string) {
  return [
    'rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 sm:px-4 sm:py-3',
    'transition hover:border-emerald-300/80 hover:shadow-sm',
    className,
  ].join(' ');
}

export type DashboardKpiBarProps = {
  items: DashboardKpi[];
  viewLabel: string;
  onKpiClick?: (key: DashboardKpi['key']) => void;
  /** Home mega-card: one row of four on xl, tighter padding. */
  compact?: boolean;
  /** For short corner label on risk KPI. */
  en?: boolean;
};

function isDashboardLinkedKey(key: DashboardKpi['key']) {
  return key === 'high_risk_alerts' || key === 'monthly_abnormal_invoices';
}

function KpiCardBody({
  item,
  viewLabel,
  en,
}: {
  item: DashboardKpi;
  viewLabel: string;
  en: boolean;
}) {
  const corner = kpiCornerHint(item, en);
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 text-sm font-medium leading-snug text-gray-700">{item.label}</div>
        <div className="shrink-0 max-w-[50%] text-right text-xs leading-snug text-gray-400">{corner}</div>
      </div>
      <div
        className={`mt-1.5 text-xl font-bold tabular-nums tracking-tight sm:text-2xl ${valueClass(item.key)}`}
      >
        {item.value}
      </div>
      <div className="mt-1.5 flex justify-end">
        <span className="text-sm font-medium text-blue-600">{viewLabel}</span>
      </div>
    </>
  );
}

export function DashboardKpiBar({
  items,
  viewLabel,
  onKpiClick,
  compact = false,
  en = true,
}: DashboardKpiBarProps) {
  if (!compact) {
    const grid = 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4';
    return (
      <div className={grid}>
        {items.map((item) => {
          const linked = Boolean(onKpiClick && isDashboardLinkedKey(item.key));
          const content = (
            <>
              <div className="text-sm font-medium text-gray-500">{item.label}</div>
              <div className={`mt-1.5 text-2xl font-bold tabular-nums tracking-tight ${valueClass(item.key)}`}>
                {item.value}
              </div>
              <div className="mt-3 flex items-end justify-between gap-2">
                <div className="text-xs text-gray-400">{item.hint ?? ''}</div>
                {linked ? (
                  <span className="shrink-0 text-xs font-medium text-blue-600">{viewLabel}</span>
                ) : item.link ? (
                  <span className="shrink-0 text-xs font-medium text-blue-600">{viewLabel}</span>
                ) : null}
              </div>
            </>
          );
          if (linked) {
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onKpiClick?.(item.key)}
                className="w-full rounded-2xl border border-gray-200 bg-white p-5 text-left font-sans shadow-sm transition hover:border-emerald-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                {content}
              </button>
            );
          }
          if (item.link) {
            return (
              <Link
                key={item.key}
                to={item.link}
                className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                {content}
              </Link>
            );
          }
          return (
            <div key={item.key} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              {content}
            </div>
          );
        })}
      </div>
    );
  }

  const grid =
    'grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-2 xl:grid-cols-4 xl:gap-2.5';

  return (
    <div className={grid}>
      {items.map((item) => {
        const linked = Boolean(onKpiClick && isDashboardLinkedKey(item.key));
        const body = <KpiCardBody item={item} viewLabel={viewLabel} en={en} />;

        if (linked) {
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onKpiClick?.(item.key)}
              className={`${cardShellCompact('w-full text-left font-sans focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1')}`}
            >
              {body}
            </button>
          );
        }

        if (item.link) {
          return (
            <Link key={item.key} to={item.link} className={cardShellCompact('block')}>
              {body}
            </Link>
          );
        }

        return (
          <div key={item.key} className={cardShellCompact('')}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
