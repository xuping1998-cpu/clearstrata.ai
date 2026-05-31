import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDemoGeneratedData } from '@/contexts/DemoGeneratedDataContext';
import { DemoPropertyConvertBar } from './DemoPropertyConvertBar';
import { DemoCreatePropertyCtaCard } from '@/components/onboarding/DemoCreatePropertyCta';

/** 演示楼首页：使用确定性生成数据，不请求网络。首页不展示财务看板区块。 */
export function DemoPropertyMockHomePanel() {
  const { language } = useLanguage();
  const en = language === 'en';
  const d = useDemoGeneratedData();
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash?.replace('#', '');
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash, location.key]);

  const valueProps = [
    {
      zh: '让业主的每一笔支出干净透明',
      en: 'Every owner dollar, clean and transparent',
      descZh: 'AI自动审核发票、对比预算与历史支出，发现异常立即预警。',
      descEn:
        'AI reviews invoices and compares them against budget and history, alerting on anomalies instantly.',
    },
    {
      zh: '让全球 Council 决策轻松、便捷、高效',
      en: 'Effortless, efficient decisions for every council',
      descZh: 'AGM / SGM、远程书面会议、电子投票、决议追踪和会议档案全部在线完成。',
      descEn:
        'AGM / SGM, remote written meetings, e-voting, resolution tracking and meeting archives — all online.',
    },
    {
      zh: '让本地物业服务可追踪、可监督、可查询',
      en: 'Local services you can track, monitor and audit',
      descZh: '业主诉求、巡检记录、采购询价、公共事项和月报全程留痕。',
      descEn:
        'Owner requests, inspections, procurement RFQs, public matters and monthly reports — all on the record.',
    },
  ];

  const aiAlerts = [
    {
      zh: '水费异常：本月 $8,800，历史均值 $2,100，超出 +319%',
      en: 'Water bill anomaly: $8,800 this month vs. $2,100 average (+319%)',
      status: 'High Risk',
      tone: 'high' as const,
    },
    {
      zh: '发票超预算：园林维护 $3,250，月预算 $2,000',
      en: 'Over budget: landscaping $3,250 vs. $2,000 monthly budget',
      status: 'Needs Review',
      tone: 'warn' as const,
    },
    {
      zh: '供应商报价偏高：管道维修发票超出市场范围 28%',
      en: 'Vendor quote high: plumbing invoice 28% above market range',
      status: 'Check RFQ',
      tone: 'warn' as const,
    },
  ];

  const councilDecisions = [
    {
      zh: '2026 AGM 预算批准',
      en: '2026 AGM Budget Approval',
      detailZh: '电子投票进行中，支持 68%，反对 12%，待投 20%',
      detailEn: 'E-voting in progress · 68% for · 12% against · 20% pending',
      status: '投票中 / Voting',
      tone: 'active' as const,
    },
    {
      zh: 'SGM 漏水应对',
      en: 'SGM Water Leak Response',
      detailZh: '讨论中，需决定是否追偿维修责任',
      detailEn: 'In discussion · deciding on repair-cost recovery',
      status: '讨论中 / Discussing',
      tone: 'warn' as const,
    },
    {
      zh: '电梯合同续签',
      en: 'Elevator Contract Renewal',
      detailZh: '已归档，Council 决议通过',
      detailEn: 'Archived · council resolution passed',
      status: '已通过 / Passed',
      tone: 'done' as const,
    },
  ];

  const serviceTracking = [
    {
      labelZh: '业主诉求',
      labelEn: 'Owner request',
      zh: '地下车库漏水，已发送物业经理，处理中',
      en: 'Underground parkade leak — sent to property manager, in progress',
      status: '处理中 / In progress',
    },
    {
      labelZh: '巡检记录',
      labelEn: 'Inspection',
      zh: '3F 走廊灯具故障，已安排维修',
      en: '3F corridor light fault — repair scheduled',
      status: '已安排 / Scheduled',
    },
    {
      labelZh: '采购询价',
      labelEn: 'Procurement RFQ',
      zh: '园林维护三家报价比选中',
      en: 'Landscaping — comparing three vendor quotes',
      status: '比选中 / Comparing',
    },
    {
      labelZh: '月报',
      labelEn: 'Monthly report',
      zh: '五月物业服务月报已生成草稿',
      en: 'May property service report — draft generated',
      status: '草稿 / Draft',
    },
  ];

  const toneBadge: Record<string, string> = {
    high: 'bg-red-50 text-red-700 border border-red-200',
    warn: 'bg-amber-50 text-amber-800 border border-amber-200',
    active: 'bg-blue-50 text-blue-700 border border-blue-200',
    done: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    neutral: 'bg-gray-100 text-gray-600 border border-gray-200',
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-8">
      <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-950">
        {en
          ? `Demo property · not real data · ${d.buildingLabel}`
          : `当前为演示楼（Demo Property），非真实数据 · ${d.buildingLabel}`}
      </p>

      {/* Three value props */}
      <section className="rounded-2xl border border-clearstrata-ui-softBorder bg-gradient-to-b from-white to-clearstrata-ui-soft/40 p-6">
        <div className="text-center">
          <h2 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
            {en ? 'AI-Powered Owner Self-Governance Platform' : 'AI驱动的业主自管平台'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {en ? 'AI驱动的业主自管平台' : 'AI-Powered Owner Self-Governance Platform'}
          </p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {valueProps.map((v) => (
            <div key={v.zh} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-900">{en ? v.en : v.zh}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{en ? v.descEn : v.descZh}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI alerts */}
      <section id="demo-ai-alerts" className="scroll-mt-24 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-gray-900">{en ? 'AI Alerts' : 'AI异常预警'}</h3>
          <span className="text-xs text-gray-400">{en ? 'Demo' : '示例'}</span>
        </div>
        <ul className="mt-3 space-y-2.5">
          {aiAlerts.map((a) => (
            <li
              key={a.zh}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2.5 text-sm"
            >
              <span className="min-w-0 text-gray-800">{en ? a.en : a.zh}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${toneBadge[a.tone]}`}>
                {a.status}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Council remote decisions */}
      <section id="demo-council-decisions" className="scroll-mt-24 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-gray-900">
            {en ? 'Remote Council Decisions' : 'Council远程决策'}
          </h3>
          <span className="text-xs text-gray-400">{en ? 'Demo' : '示例'}</span>
        </div>
        <ul className="mt-3 space-y-2.5">
          {councilDecisions.map((c) => (
            <li key={c.zh} className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-900">{en ? c.en : c.zh}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${toneBadge[c.tone]}`}>
                  {c.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-600">{en ? c.detailEn : c.detailZh}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Local service tracking */}
      <section id="demo-local-services" className="scroll-mt-24 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-gray-900">
            {en ? 'Local Service Tracking' : '本地物业服务追踪'}
          </h3>
          <span className="text-xs text-gray-400">{en ? 'Demo' : '示例'}</span>
        </div>
        <ul className="mt-3 space-y-2.5">
          {serviceTracking.map((s) => (
            <li key={s.zh} className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-clearstrata-ui-primary">
                  {en ? s.labelEn : s.labelZh}
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${toneBadge.neutral}`}>
                  {s.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-800">{en ? s.en : s.zh}</p>
            </li>
          ))}
        </ul>
      </section>

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
