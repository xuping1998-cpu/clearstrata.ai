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

function cardLinkClass(compact: boolean) {
  return [
    compact
      ? 'block rounded-2xl border border-gray-200 bg-gray-50 p-4 transition'
      : 'block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition',
    'cursor-pointer hover:border-emerald-300 hover:shadow-md',
  ].join(' ');
}

function cardButtonClass(compact: boolean) {
  return [
    compact
      ? 'w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left font-sans transition'
      : 'w-full rounded-2xl border border-gray-200 bg-white p-5 text-left font-sans shadow-sm transition',
    'cursor-pointer hover:border-emerald-300 hover:shadow-md',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
  ].join(' ');
}

export type DashboardKpiBarProps = {
  items: DashboardKpi[];
  viewLabel: string;
  onKpiClick?: (key: DashboardKpi['key']) => void;
  /** Home mega-card: one row of four on xl, tighter padding. */
  compact?: boolean;
};

function isDashboardLinkedKey(key: DashboardKpi['key']) {
  return key === 'high_risk_alerts' || key === 'monthly_abnormal_invoices';
}

export function DashboardKpiBar({ items, viewLabel, onKpiClick, compact = false }: DashboardKpiBarProps) {
  const grid = compact
    ? 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4'
    : 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4';
  const valueCls = compact ? 'text-xl' : 'text-2xl';
  const hintRow = compact ? 'mt-2' : 'mt-3';

  return (
    <div className={grid}>
      {items.map((item) => {
        const linked = Boolean(onKpiClick && isDashboardLinkedKey(item.key));

        const content = (
          <>
            <div className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-500`}>{item.label}</div>
            <div className={`mt-1.5 ${valueCls} font-bold tabular-nums tracking-tight ${valueClass(item.key)}`}>
              {item.value}
            </div>
            <div className={`${hintRow} flex items-end justify-between gap-2`}>
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
              className={cardButtonClass(compact)}
            >
              {content}
            </button>
          );
        }

        if (item.link) {
          return (
            <Link key={item.key} to={item.link} className={cardLinkClass(compact)}>
              {content}
            </Link>
          );
        }

        return (
          <div
            key={item.key}
            className={
              compact
                ? 'rounded-2xl border border-gray-200 bg-gray-50 p-4'
                : 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm'
            }
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
