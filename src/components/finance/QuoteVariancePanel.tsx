import type { QuoteVarianceResult } from '../../lib/quoteInvoiceVariance';
import { quoteVariancePanelClass } from '../../lib/quoteInvoiceVariance';

type Props = {
  result: QuoteVarianceResult;
  en: boolean;
  /** 默认「报价对比」 */
  title?: string;
};

export function QuoteVariancePanel({ result, en, title }: Props) {
  const t = title ?? (en ? 'Quote comparison' : '报价对比');
  const msg = en ? result.messageEn : result.message;
  const pctDisplay = (result.variancePercent * 100).toFixed(1);
  const sign = result.varianceAmount >= 0 ? '+' : '';

  return (
    <div className={`rounded-xl border p-4 ${quoteVariancePanelClass(result.warningLevel)}`}>
      <h3 className="text-sm font-semibold mb-3">{t}</h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-gray-600">{en ? 'Quote amount' : '报价金额'}</dt>
          <dd className="font-semibold">${result.quoteAmount.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-gray-600">{en ? 'Invoice amount' : '发票金额'}</dt>
          <dd className="font-semibold">${result.invoiceAmount.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-gray-600">{en ? 'Variance ($)' : '差异金额'}</dt>
          <dd className="font-semibold">
            {sign}${result.varianceAmount.toFixed(2)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-600">{en ? 'Variance (%)' : '差异百分比'}</dt>
          <dd className="font-semibold">
            {sign}
            {pctDisplay}%
          </dd>
        </div>
      </dl>
      <p className={`mt-3 text-sm font-medium ${result.warningLevel === 'danger' ? 'text-red-800' : result.warningLevel === 'warning' ? 'text-amber-900' : 'text-gray-800'}`}>
        {msg}
      </p>
    </div>
  );
}
