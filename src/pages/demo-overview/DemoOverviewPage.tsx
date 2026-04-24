import { FormEvent, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  buildDemoGenerationSeed,
  demoUnitDraftKey,
  DEMO_SUGGESTED_DEFAULT_UNIT,
  getStoredDemoInviteCode,
} from '@/lib/demoProperty/demoStorage';
import { generateDemoData } from '@/lib/demoProperty/generateDemoData';
import { formatDemoCurrency } from '@/lib/demoPropertyMockData';
import { DemoCreatePropertyCtaCard } from '@/components/onboarding/DemoCreatePropertyCta';

/**
 * 成交演示页：`/demo-overview`。数据由生成器按 propertyId + unit + visitor 种子计算。
 */
export function DemoOverviewPage() {
  const [searchParams] = useSearchParams();
  const propertyId = useMemo(() => searchParams.get('propertyId')?.trim() || '', [searchParams]);
  const unitHint = useMemo(() => searchParams.get('unit')?.trim() || '', [searchParams]);

  const demo = useMemo(
    () =>
      generateDemoData({
        seed: buildDemoGenerationSeed({ propertyId, unit: unitHint }),
        unitCount: 48,
      }),
    [propertyId, unitHint],
  );

  const invite = getStoredDemoInviteCode();
  const joinFromDemoHref = invite
    ? (() => {
        const draft =
          typeof sessionStorage !== 'undefined'
            ? sessionStorage.getItem(demoUnitDraftKey(invite))?.trim() ?? ''
            : '';
        const u = draft || DEMO_SUGGESTED_DEFAULT_UNIT;
        return `/join/${encodeURIComponent(invite)}?from=demo&unit=${encodeURIComponent(u)}`;
      })()
    : '';
  const topInvoices = demo.invoiceItems.slice(0, 3);

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openModal = () => {
    setFormError(null);
    setModalOpen(true);
  };

  const onSubmitLead = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const n = name.trim();
    const em = email.trim();
    const ph = phone.trim();
    if (!n || !em) {
      setFormError('请填写姓名和邮箱。');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('leads').insert({
        name: n,
        email: em,
        phone: ph || null,
        property_id: propertyId || null,
        message: 'demo-overview / 联系业委会或完整报告',
        building: unitHint ? `扫码成交页 · 房号 ${unitHint}` : '扫码成交页',
        units: unitHint || null,
      });
      if (error) {
        console.error('leads insert', error);
        setFormError('提交失败，请稍后重试。');
        return;
      }
      setDone(true);
      setModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <main className="mx-auto max-w-lg px-5 pb-28 pt-12">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-slate-500">本页为演示数据</p>

        <p className="mt-3 text-center text-sm text-slate-400">{demo.buildingLabel}</p>
        <h1 className="mt-2 text-center text-2xl font-bold leading-snug text-white md:text-3xl">
          你这栋楼，本月花了：
        </h1>

        <p className="mt-8 text-center font-mono text-5xl font-black tracking-tight text-white drop-shadow-lg md:text-6xl">
          💰 {formatDemoCurrency(demo.totalSpend)}
        </p>

        <p className="mt-2 text-center text-sm text-slate-400">
          对标类似楼盘月均约 {formatDemoCurrency(demo.averageComparableSpend)}（示意）
        </p>

        <div className="mt-8">
          <DemoCreatePropertyCtaCard />
        </div>

        <p className="mt-6 text-center text-lg text-red-400 md:text-xl">
          ⚠️ 其中有 <span className="font-bold">{formatDemoCurrency(demo.abnormalSpend)}</span> 支出异常
        </p>
        <p className="mt-2 text-center text-sm text-red-300/90">
          相当于每户可能多承担 {formatDemoCurrency(demo.perHouseholdAbnormalMonthlyLow)} -{' '}
          {formatDemoCurrency(demo.perHouseholdAbnormalMonthlyHigh)} / 月（示意）
        </p>

        <ul className="mt-12 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          {topInvoices.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 border-b border-white/5 pb-4 last:border-0 last:pb-0"
            >
              <span className="text-sm text-slate-200">{row.vendor_name}</span>
              <div className="text-right">
                <span className="block font-mono text-base font-semibold text-white">
                  {formatDemoCurrency(row.total_amount)}
                </span>
                <span
                  className={
                    row.risk_level === 'high'
                      ? 'text-xs font-semibold text-red-400'
                      : row.risk_level === 'warn'
                        ? 'text-xs text-amber-400'
                        : 'text-xs text-slate-400'
                  }
                >
                  {row.risk_level === 'high' ? '🔴 ' : row.risk_level === 'warn' ? '⚠️ ' : ''}
                  {row.risk_label}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {invite && joinFromDemoHref ? (
          <div className="mt-8 text-center space-y-2">
            <Link
              to={joinFromDemoHref}
              className="inline-block w-full max-w-sm rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 px-6 py-3.5 text-center text-base font-extrabold text-white shadow-lg shadow-rose-600/30 transition hover:from-rose-500 hover:to-orange-500 hover:shadow-xl active:scale-[0.98] sm:w-auto"
            >
              🔥 我家是不是多花钱了？
            </Link>
            <p className="text-xs text-slate-500">输入房号，查看你所在楼的真实费用数据（已预填草稿）</p>
          </div>
        ) : null}

        <section className="mt-16 rounded-2xl border border-red-500/30 bg-red-950/20 p-6">
          <p className="text-center text-base font-medium text-red-100">❗ 你是否知道这些钱花在哪里？</p>
          <p className="mt-3 text-center text-sm text-slate-300">👉 业委会正在寻找更透明的管理方式</p>
          <button
            type="button"
            onClick={openModal}
            className="mt-6 w-full rounded-xl bg-red-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-red-600/30 transition hover:bg-red-500 active:scale-[0.98]"
          >
            联系业委会 / 获取完整报告
          </button>
        </section>
      </main>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lead-modal-title"
        >
          <div className="w-full max-w-md scale-100 rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl transition-transform duration-200">
            <h2 id="lead-modal-title" className="text-lg font-semibold text-white">
              请输入联系方式
            </h2>
            <form className="mt-5 space-y-4" onSubmit={onSubmitLead}>
              <div>
                <label className="text-xs text-slate-400">姓名</label>
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none ring-emerald-400/30 focus:ring-2"
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">电话</label>
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none ring-emerald-400/30 focus:ring-2"
                  value={phone}
                  onChange={(ev) => setPhone(ev.target.value)}
                  autoComplete="tel"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">邮箱</label>
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none ring-emerald-400/30 focus:ring-2"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  type="email"
                  autoComplete="email"
                />
              </div>
              {formError ? <p className="text-sm text-red-400">{formError}</p> : null}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  className="flex-1 rounded-lg border border-white/15 py-2.5 text-sm text-slate-300 hover:bg-white/5"
                  onClick={() => setModalOpen(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 active:scale-[0.98]"
                >
                  {submitting ? '提交中…' : '提交'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {done ? (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full border border-emerald-500/40 bg-emerald-950/90 px-5 py-2 text-sm text-emerald-100 shadow-lg">
          已提交，我们会尽快联系您。
        </div>
      ) : null}
    </div>
  );
}
