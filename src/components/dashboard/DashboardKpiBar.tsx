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

function cardLinkClass() {
  return [
    'block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition',
    'cursor-pointer hover:border-emerald-300 hover:shadow-md',
  ].join(' ');
}

function cardButtonClass() {
  return [
    'w-full rounded-2xl border border-gray-200 bg-white p-5 text-left font-sans shadow-sm transition',
    'cursor-pointer hover:border-emerald-300 hover:shadow-md',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
  ].join(' ');
}

export type DashboardKpiBarProps = {
  items: DashboardKpi[];
  viewLabel: string;
  onKpiClick?: (key: DashboardKpi['key']) => void;
};

function isDashboardLinkedKey(key: DashboardKpi['key']) {
  return key === 'high_risk_alerts' || key === 'monthly_abnormal_invoices';
}

export function DashboardKpiBar({ items, viewLabel, onKpiClick }: DashboardKpiBarProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const linked = Boolean(onKpiClick && isDashboardLinkedKey(item.key));

        const content = (
          <>
            <div className="text-sm font-medium text-gray-500">{item.label}</div>
            <div className={`mt-2 text-2xl font-bold tabular-nums tracking-tight ${valueClass(item.key)}`}>
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
              className={cardButtonClass()}
            >
              {content}
            </button>
          );
        }

        if (item.link) {
          return (
            <Link key={item.key} to={item.link} className={cardLinkClass()}>
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
