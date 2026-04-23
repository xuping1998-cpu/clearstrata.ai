import { Link, useParams } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isPlatformAdmin } from '../lib/permissions';

const demoStats = {
  waste: 48200,
  anomalies: 3,
  overspend: 17,
};

function formatMoneyUSD(n: number): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  } catch {
    return `$${Math.round(n).toLocaleString()}`;
  }
}

export function DemoLandingPage() {
  const { propertyCode } = useParams<{ propertyCode: string }>();
  const code = (propertyCode ?? '').trim() || 'BCS3736';
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/30 via-white to-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-clearstrata-ui-primary text-white shadow-lg shadow-clearstrata-ui-primary/25">
            <Building2 className="size-6" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-extrabold tracking-tight text-gray-900">ClearStrata</div>
            <div className="text-xs font-semibold text-gray-500">Demo · {code.toUpperCase()}</div>
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              你的物业费用，可能多花了 <span className="text-rose-700">15%</span>
            </h1>
            <p className="mt-3 text-base font-semibold text-gray-700">这个小区的真实模拟数据显示：</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold tracking-wide text-gray-500">年度浪费</div>
                <div className="mt-2 text-2xl font-extrabold text-rose-700">{formatMoneyUSD(demoStats.waste)}</div>
                <div className="mt-1 text-xs text-gray-500">可通过预算与发票对齐降低损耗</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold tracking-wide text-gray-500">异常支出</div>
                <div className="mt-2 text-2xl font-extrabold text-amber-700">{demoStats.anomalies} 项</div>
                <div className="mt-1 text-xs text-gray-500">异常报价 / 重复开票 / 非预算类目</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold tracking-wide text-gray-500">预算超支</div>
                <div className="mt-2 text-2xl font-extrabold text-clearstrata-brand-700">{demoStats.overspend}%</div>
                <div className="mt-1 text-xs text-gray-500">年度维度自动计算与预警</div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to={`/demo-dashboard/${encodeURIComponent(code)}`}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-slate-800"
              >
                查看每一笔支出
              </Link>
              <Link
                to="/onboarding/create-property"
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-extrabold text-gray-900 hover:bg-gray-50"
              >
                创建我的物业
              </Link>
              <Link
                to={`/join/${encodeURIComponent(code)}`}
                className="inline-flex items-center justify-center px-1 py-3 text-sm font-semibold text-clearstrata-ui-primary underline-offset-2 hover:underline"
              >
                我是业主，进入真实物业
              </Link>
            </div>

            <p className="mt-4 text-xs text-gray-500">演示数据为模拟结果，仅用于体验产品能力，不会进入真实物业数据流。</p>
          </div>

          <div className="relative rounded-3xl border border-clearstrata-ui-softBorder/60 bg-white p-6 shadow-sm">
            {isPlatformAdmin(profile) && (
              <Link
                to="/admin/overview"
                className="absolute bottom-3 right-3 z-10 size-7 rounded-full border border-gray-200/80 bg-white/80 opacity-0 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clearstrata-ui-primary"
                title="Platform"
                aria-label="Open platform admin"
              />
            )}
            <div className="text-sm font-extrabold text-gray-900">你将看到什么</div>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              <li> - 每一笔发票支出与预算类目的对齐</li>
              <li> - 异常支出提示与可追溯链路</li>
              <li> - 会议与决议（只读）预览</li>
            </ul>
            <div className="mt-5 rounded-2xl bg-clearstrata-ui-soft p-4 text-xs font-semibold text-clearstrata-brand-950">
              提示：这是演示样板（只读）。若你是该物业真实成员，请使用 “进入真实物业”。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

