import { useLanguage } from '@/contexts/LanguageContext';
import { useProperty } from '@/contexts/PropertyContext';
import { useDemoGeneratedData } from '@/contexts/DemoGeneratedDataContext';
import { formatDemoCurrency } from '@/lib/demoPropertyMockData';
import { DemoPropertyConvertBar } from './DemoPropertyConvertBar';

/** 演示楼财务 + 发票列表：使用生成器数据。 */
export function DemoPropertyMockFinancePanel() {
  const { language } = useLanguage();
  const { isDemoPropertyMock } = useProperty();
  const en = language === 'en';
  const d = useDemoGeneratedData();

  if (!isDemoPropertyMock) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-8">
      <DemoPropertyConvertBar />

      <div>
        <p className="text-xs font-medium text-gray-500">{d.buildingLabel}</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900">{en ? 'Financial reporting' : '月度财报'}</h1>
        <p className="mt-2 text-gray-600">
          {en
            ? 'A monthly picture of spend, anomalies, and AGM-approved budget utilization (demo build).'
            : '演示楼栋的月度支出、异常金额与 AGM 批准预算占用示意。'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">{en ? 'Month spend' : '本月支出'}</p>
          <p className="mt-1 text-xl font-bold">{formatDemoCurrency(d.totalSpend)}</p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 shadow-sm">
          <p className="text-xs text-red-800">{en ? 'Anomalies' : '异常金额'}</p>
          <p className="mt-1 text-xl font-bold text-red-700">{formatDemoCurrency(d.abnormalSpend)}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs text-amber-900">{en ? 'Budget usage' : '预算占用'}</p>
          <p className="mt-1 text-xl font-bold text-amber-900">{d.budgetUsedPct}%</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">{en ? 'Invoice details' : '发票明细'}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">{en ? 'Vendor' : '供应商'}</th>
                <th className="px-4 py-2">{en ? 'Invoice #' : '发票号'}</th>
                <th className="px-4 py-2">{en ? 'Date' : '日期'}</th>
                <th className="px-4 py-2">{en ? 'Amount' : '金额'}</th>
                <th className="px-4 py-2">{en ? 'Status' : '状态'}</th>
                <th className="px-4 py-2">{en ? 'Risk' : '风险'}</th>
              </tr>
            </thead>
            <tbody>
              {d.invoiceItems.map((row) => (
                <tr key={row.id} className="border-t border-gray-100">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{row.vendor_name}</td>
                  <td className="px-4 py-2.5 font-mono text-gray-700">{row.invoice_number}</td>
                  <td className="px-4 py-2.5 text-gray-600">{row.invoice_date}</td>
                  <td className="px-4 py-2.5 font-mono">{formatDemoCurrency(row.total_amount)}</td>
                  <td className="px-4 py-2.5 text-gray-600">{row.status}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={
                        row.risk_level === 'high'
                          ? 'font-medium text-red-600'
                          : row.risk_level === 'warn'
                            ? 'text-amber-700'
                            : 'text-gray-500'
                      }
                    >
                      {row.risk_level === 'high' ? '🔴 ' : row.risk_level === 'warn' ? '⚠️ ' : ''}
                      {row.risk_label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{en ? 'Vendor risk hints' : '供应商风险'}</h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          {d.vendorRisks.map((v) => (
            <li key={v.vendor}>
              <span className="font-medium text-gray-900">{v.vendor}</span>{' '}
              <span className="text-amber-800">[{v.scoreLabel}]</span> {v.note}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-gray-500">
        {en ? 'Comparable avg (mock): ' : '对标均值（演示）：'}
        {formatDemoCurrency(d.averageComparableSpend)}
      </p>
    </div>
  );
}
