import { useLanguage } from '@/contexts/LanguageContext';
import { useDemoGeneratedData } from '@/contexts/DemoGeneratedDataContext';
import { formatDemoCents, formatDemoCurrency } from '@/lib/demoPropertyMockData';
import { DemoPropertyConvertBar } from './DemoPropertyConvertBar';
import { DemoCreatePropertyCtaCard } from '@/components/onboarding/DemoCreatePropertyCta';

/** 演示楼首页：使用确定性生成数据，不请求网络。 */
export function DemoPropertyMockHomePanel() {
  const { language } = useLanguage();
  const en = language === 'en';
  const d = useDemoGeneratedData();

  const highRisk = d.invoiceItems.filter((i) => i.risk_level === 'high').length;
  const householdLine = en
    ? `Roughly ${formatDemoCurrency(d.perHouseholdAbnormalMonthlyLow)}–${formatDemoCurrency(d.perHouseholdAbnormalMonthlyHigh)} more per household / month (illustrative).`
    : `相当于每户可能多承担 ${formatDemoCurrency(d.perHouseholdAbnormalMonthlyLow)} - ${formatDemoCurrency(d.perHouseholdAbnormalMonthlyHigh)} / 月（示意）。`;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-8">
      <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-950">
        {en
          ? `Demo property · not real data · ${d.buildingLabel}`
          : `当前为演示楼（Demo Property），非真实数据 · ${d.buildingLabel}`}
      </p>

      <div className="space-y-4">
        <DemoPropertyConvertBar />
        <DemoCreatePropertyCtaCard />
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900">
          {en ? `${d.buildingLabel} · monthly spend overview` : `${d.buildingLabel} 本月支出概览`}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {en
            ? `Illustrative KPIs · comparable avg ${formatDemoCurrency(d.averageComparableSpend)}.`
            : `以下为示意指标 · 对标楼盘月均约 ${formatDemoCurrency(d.averageComparableSpend)}。`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {en ? 'This month spend' : '本月支出'}
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatDemoCurrency(d.totalSpend)}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-red-800">
            {en ? 'Flagged / abnormal' : '异常支出'}
          </p>
          <p className="mt-2 text-2xl font-bold text-red-700">{formatDemoCurrency(d.abnormalSpend)}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-900">
            {en ? 'Budget used' : '预算占用'}
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-900">{d.budgetUsedPct}%</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {en ? 'YTD spend' : '年初至今支出'}
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatDemoCents(d.ytdSpendCents)}</p>
        </div>
      </div>

      <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-4 text-red-600 shadow-sm">
        <p className="text-center text-sm font-semibold text-red-700">
          {en ? '⚠️ Abnormal spend detected:' : '⚠️ 检测到异常支出：'}
          <span className="ml-1.5 text-2xl font-black tracking-tight text-red-600 md:text-3xl">
            {formatDemoCurrency(d.abnormalSpend)}
          </span>
        </p>
        <p className="mt-2 text-center text-sm font-medium leading-relaxed text-red-600">{householdLine}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900">
            {en ? 'Invoices needing attention' : '需关注的发票'}
          </h3>
          <ul className="mt-3 divide-y divide-gray-100">
            {d.invoiceItems
              .filter((i) => i.risk_level !== 'normal')
              .map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span className="font-medium text-gray-800">{inv.vendor_name}</span>
                  <span className="font-mono text-gray-900">{formatDemoCurrency(inv.total_amount)}</span>
                  <span
                    className={
                      inv.risk_level === 'high' ? 'text-xs font-medium text-red-600' : 'text-xs text-amber-700'
                    }
                  >
                    {inv.risk_label}
                  </span>
                </li>
              ))}
          </ul>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900">{en ? 'Members (sample)' : '成员（示例）'}</h3>
          <ul className="mt-3 divide-y divide-gray-100">
            {d.memberList.slice(0, 8).map((m) => (
              <li key={m.user_id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="truncate text-gray-800">{m.full_name_en}</span>
                <span className="shrink-0 font-mono text-gray-600">{m.unit_no ?? '—'}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900">{en ? 'Notices' : '公告摘要'}</h3>
          <ul className="mt-3 space-y-3 text-sm text-gray-700">
            {d.notices.map((n) => (
              <li key={n.title} className="border-b border-gray-100 pb-3 last:border-0">
                <span className="text-xs text-gray-500">{n.date}</span>
                <p className="font-medium text-gray-900">{n.title}</p>
                <p className="mt-1 text-gray-600">{n.body}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900">{en ? 'Vendor risk hints' : '供应商风险摘要'}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {d.vendorRisks.map((v) => (
              <li key={v.vendor} className="rounded-lg bg-gray-50 px-3 py-2">
                <span className="font-medium text-gray-900">{v.vendor}</span>
                <span className="ml-2 text-xs text-amber-800">[{v.scoreLabel}]</span>
                <p className="mt-1 text-gray-600">{v.note}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="text-center text-xs text-gray-500">
        {en
          ? `Generated demo snapshot · ${highRisk} high-risk row(s). Same visitor sees stable numbers.`
          : `演示数据由本地生成器按访客/邀请码种子计算 · ${highRisk} 条高风险样式 · 同一访客数据稳定。`}
      </p>

      <DemoPropertyConvertBar />
    </div>
  );
}
