import { useLanguage } from '@/contexts/LanguageContext';
import { useDemoGeneratedData } from '@/contexts/DemoGeneratedDataContext';
import { DemoPropertyConvertBar } from './DemoPropertyConvertBar';
import { DemoCreatePropertyCtaCard } from '@/components/onboarding/DemoCreatePropertyCta';

/** 演示楼首页：使用确定性生成数据，不请求网络。首页不展示财务看板区块。 */
export function DemoPropertyMockHomePanel() {
  const { language } = useLanguage();
  const en = language === 'en';
  const d = useDemoGeneratedData();

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

      <div className="grid gap-6 lg:grid-cols-2">
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
      </div>

      <p className="text-center text-xs text-gray-500">
        {en
          ? 'Illustrative content only · same visitor sees stable demo identifiers.'
          : '以下为示意内容与布局 · 同一访客看到的演示标识稳定。'}
      </p>
    </div>
  );
}
