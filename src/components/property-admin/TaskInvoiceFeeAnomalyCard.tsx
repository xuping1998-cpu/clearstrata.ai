import type { FeeAnomalyState } from '../../lib/invoiceFeeAnomaly';

type Props = {
  state: FeeAnomalyState;
  en: boolean;
};

export function TaskInvoiceFeeAnomalyCard({ state, en }: Props) {
  const fmtMoney = (n: number) =>
    new Intl.NumberFormat(en ? 'en-CA' : 'zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  return (
    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">{en ? 'Fee anomaly check' : '费用异常提醒'}</h2>
      <p className="mt-1 text-xs text-gray-600">
        {en
          ? 'Compares this invoice to other invoices from the same vendor at this property in the last 12 months (same category when set).'
          : '将本张发票与同物业、同供应商、近 12 个月内、同类 category 的历史发票对比。'}
      </p>

      {state.insufficient ? (
        <p className="mt-4 text-sm font-medium text-amber-900">{en ? state.messageEn : state.messageZh}</p>
      ) : (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">{en ? 'Current invoice amount' : '当前发票金额'}</dt>
            <dd className="font-semibold text-gray-900">{fmtMoney(state.currentAmount)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{en ? 'Historical average' : '历史平均金额'}</dt>
            <dd className="font-semibold text-gray-900">{fmtMoney(state.avgAmount)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-500">{en ? 'Difference vs average' : '相对历史均价'}</dt>
            <dd className="font-medium text-gray-900">
              {state.pctAboveAvg >= 0 ? '+' : ''}
              {state.pctAboveAvg.toFixed(1)}%
            </dd>
          </div>
          <div className="sm:col-span-2 rounded-lg border border-amber-100 bg-white/80 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              {en ? 'Suggestion' : '建议'}
            </span>
            <p className="mt-1 text-sm text-gray-800">{en ? state.verdictEn : state.verdictZh}</p>
          </div>
        </dl>
      )}
    </div>
  );
}
