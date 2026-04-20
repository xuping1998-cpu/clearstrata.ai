import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronDown, ShieldCheck, Sparkles } from 'lucide-react';
import { demoEntryPath, MARKETING_DEMO_PROPERTY_CODE } from '@/lib/propertyEntryRoutes';

const SEO_TITLE = 'ClearStrata 定价';
const SEO_DESCRIPTION =
  'ClearStrata 商用定价：3 个月免费试用，5 分钟开通物业后台，让每一笔支出更透明。';

function useSeo() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = SEO_TITLE;

    let meta = document.querySelector('meta[name="description"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    const prevDesc = meta.getAttribute('content') || '';
    meta.setAttribute('content', SEO_DESCRIPTION);

    return () => {
      document.title = prevTitle;
      if (created && meta?.parentNode) meta.parentNode.removeChild(meta);
      else if (meta) meta.setAttribute('content', prevDesc);
    };
  }, []);
}

type ValueCard = { title: string; description: string };
type PricingTier = {
  key: 'starter' | 'standard' | 'pro';
  name: string;
  badge?: string;
  priceMonthly: string;
  priceYearly: string;
  tagline: string;
  bullets: string[];
  cta: string;
  emphasis?: boolean;
};
type FaqItem = { q: string; a: string };

const valueCards: ValueCard[] = [
  {
    title: '看清每一笔支出',
    description: '所有发票、费用与审批过程集中管理，避免支出流向不透明。',
  },
  {
    title: '自动发现异常',
    description: 'AI 自动识别异常发票、重复收费、预算偏差与可疑供应商风险。',
  },
  {
    title: '让业主参与监督',
    description: '透明不是负担，而是信任。让业主看见、理解并参与监督。',
  },
];

const tiers: PricingTier[] = [
  {
    key: 'starter',
    name: 'Starter',
    priceMonthly: '$29 / 月',
    priceYearly: '$299 / 年',
    tagline: '适合小型物业',
    bullets: ['基础财务查看', '公告与成员管理', '基础邀请码功能', '物业后台基础模块'],
    cta: '开始免费试用',
  },
  {
    key: 'standard',
    name: 'Standard',
    badge: '最受欢迎',
    priceMonthly: '$59 / 月',
    priceYearly: '$599 / 年',
    tagline: '适合大多数物业',
    bullets: ['发票 AI 审计', '异常支出提醒', '预算对比', '会议支持', '成员与邀请管理', '房号/白名单支持'],
    cta: '开通我的物业',
    emphasis: true,
  },
  {
    key: 'pro',
    name: 'Pro',
    priceMonthly: '$99 / 月',
    priceYearly: '$999 / 年',
    tagline: '适合较大型或管理要求更高的物业',
    bullets: ['自动审计报告', '供应商风险分析', '会议材料导出', '高级财务洞察', '标准版全部功能'],
    cta: '预约开通',
  },
];

const faqs: FaqItem[] = [
  {
    q: '为什么按物业收费，而不是按用户收费？',
    a: '物业系统的价值不取决于多少人登录，而取决于整个物业是否实现透明管理。因此按物业规模收费更公平，也更容易推动落地。',
  },
  {
    q: '免费试用结束后会怎样？',
    a: '试用结束前我们会提前提醒你。你可以选择升级付费方案，继续使用系统管理你的物业。',
  },
  {
    q: '普通业主也需要付费吗？',
    a: '不需要。费用由物业层级承担，业主加入后即可按权限使用系统。',
  },
  {
    q: '如果我的物业现在刚开始尝试，可以先空白开通吗？',
    a: '可以。你可以先创建物业，再逐步导入房号、邀请成员、上传第一张发票。',
  },
];

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{title}</h2>
      {subtitle ? <p className="mt-2 text-sm text-gray-600 sm:text-base">{subtitle}</p> : null}
    </div>
  );
}

function PrimaryCta({ label, to }: { label: string; to: string }) {
  return (
    <Link
      to={to}
      className="inline-flex w-full items-center justify-center rounded-xl bg-clearstrata-ui-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive active:scale-[0.99] sm:w-auto"
    >
      {label}
    </Link>
  );
}

function SecondaryCta({ label, to }: { label: string; to: string }) {
  return (
    <Link
      to={to}
      className="inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 sm:w-auto"
    >
      {label}
    </Link>
  );
}

function PricingCard({ tier, ctaTo }: { tier: PricingTier; ctaTo: string }) {
  return (
    <article
      className={
        tier.emphasis
          ? 'relative rounded-3xl border-2 border-clearstrata-ui-softBorder bg-white p-6 shadow-md sm:p-7'
          : 'rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7'
      }
    >
      {tier.badge ? (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-clearstrata-ui-primary px-3 py-1 text-xs font-semibold text-white shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {tier.badge}
          </span>
        </div>
      ) : null}

      <div className={tier.badge ? 'mt-2' : ''}>
        <p className="text-sm font-semibold text-gray-900">{tier.name}</p>
        <p className="mt-1 text-xs text-gray-600">{tier.tagline}</p>
      </div>

      <div className="mt-5 space-y-1">
        <p className="text-3xl font-black tracking-tight text-gray-900">{tier.priceMonthly}</p>
        <p className="text-sm font-semibold text-gray-700">{tier.priceYearly}</p>
        <p className="text-xs text-gray-500">3 个月免费试用 · 无需信用卡</p>
      </div>

      <ul className="mt-6 space-y-3">
        {tier.bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm text-gray-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-clearstrata-ui-primary" />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className="mt-7">
        <Link
          to={ctaTo}
          className={
            tier.emphasis
              ? 'inline-flex w-full items-center justify-center rounded-xl bg-clearstrata-ui-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive active:scale-[0.99]'
              : 'inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50'
          }
        >
          {tier.cta}
        </Link>
      </div>
    </article>
  );
}

function FaqRow({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-gray-900">{item.q}</span>
        <ChevronDown className={open ? 'h-5 w-5 rotate-180 text-gray-400 transition-transform' : 'h-5 w-5 text-gray-400 transition-transform'} />
      </button>
      {open ? <p className="mt-3 text-sm leading-relaxed text-gray-600">{item.a}</p> : null}
    </div>
  );
}

export function PricingPage() {
  useSeo();
  const navigate = useNavigate();

  const createHref = '/onboarding/create-property';
  /** 营销用演示样板（与真实物业入口 `/join/:code` 区分） */
  const demoHref = demoEntryPath(MARKETING_DEMO_PROPERTY_CODE);

  const roi = useMemo(
    () => ({
      spend: 200_000,
      wastePct: 0.1,
      save: 20_000,
      costRange: '$599–$999 / 年',
    }),
    [],
  );

  return (
    <div className="min-h-full bg-gray-50">
      {/* Lightweight header (works both standalone and inside Layout) */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-lg font-black tracking-tight text-clearstrata-ui-primary"
          >
            clearstrata.ai
          </button>
          <div className="flex items-center gap-2">
            <SecondaryCta label="查看 Demo" to={demoHref} />
            <PrimaryCta label="立即开通我的物业" to={createHref} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {/* 1) Hero */}
        <section className="py-4 sm:py-8">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <p className="inline-flex items-center gap-2 rounded-full border border-clearstrata-ui-softBorder bg-clearstrata-ui-soft px-3 py-1 text-xs font-semibold text-clearstrata-brand-950">
                <ShieldCheck className="h-4 w-4 text-clearstrata-brand-700" />
                3 个月免费试用 · 无需信用卡 · 5 分钟完成开通
              </p>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
                你的物业，可能每年多花了 10%–20%
              </h1>
              <p className="mt-4 text-base leading-relaxed text-gray-700">
                用 ClearStrata，让每一笔支出透明，并自动发现隐藏浪费。为业委会、委员与业主提供真正看得见的财务透明。
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <PrimaryCta label="立即开通我的物业" to={createHref} />
                <SecondaryCta label="查看 Demo" to={demoHref} />
              </div>
              <p className="mt-4 text-sm text-gray-600">
                3 个月免费试用 · 无需信用卡 · 5 分钟完成开通
              </p>
            </div>
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-gray-900">你将得到什么？</p>
                <ul className="mt-4 space-y-3 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-clearstrata-ui-primary" />
                    发票、审批、公告、成员统一在一个后台
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-clearstrata-ui-primary" />
                    自动发现异常发票与预算偏差
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-clearstrata-ui-primary" />
                    业主可按权限参与监督与透明查看
                  </li>
                </ul>
                <div className="mt-5 rounded-2xl border border-clearstrata-ui-softBorder bg-clearstrata-ui-soft/60 p-4 text-xs text-clearstrata-brand-950">
                  低门槛开通：允许先空白创建物业，再逐步导入房号、邀请成员、上传第一张发票。
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2) 价值说明区 */}
        <section className="mt-14 sm:mt-16">
          <SectionTitle title="为什么业委会选择 ClearStrata" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {valueCards.map((c) => (
              <div key={c.title} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <p className="text-base font-bold text-gray-900">{c.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{c.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 3) ROI 说明区 */}
        <section className="mt-14 sm:mt-16">
          <SectionTitle title="这不是成本，而是帮你省钱" />
          <div className="mt-8 rounded-3xl border border-clearstrata-ui-softBorder bg-gradient-to-br from-white to-clearstrata-ui-soft/70 p-6 shadow-sm sm:p-8">
            <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-medium text-gray-500">典型物业年度支出</p>
                    <p className="mt-1 text-2xl font-black text-gray-900">${roi.spend.toLocaleString()}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-medium text-gray-500">如果减少 10% 浪费</p>
                    <p className="mt-1 text-2xl font-black text-gray-900">${roi.save.toLocaleString()} / 年</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-medium text-gray-500">ClearStrata 年成本</p>
                    <p className="mt-1 text-2xl font-black text-gray-900">{roi.costRange}</p>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-5">
                <p className="text-base font-bold text-gray-900">
                  即使只减少很小一部分浪费，系统成本也远低于你可能省下的金额。
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  对许多物业来说，真正昂贵的不是软件，而是不透明带来的长期浪费。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4) 定价卡片区 */}
        <section className="mt-14 sm:mt-16">
          <SectionTitle title="简单透明的定价" subtitle="按物业规模收费，而不是按业主人头收费" />
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {tiers.map((t) => (
              <PricingCard key={t.key} tier={t} ctaTo={createHref} />
            ))}
          </div>
        </section>

        {/* 5) 免费试用说明区 */}
        <section className="mt-14 sm:mt-16">
          <SectionTitle title="先用，再决定" />
          <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                '3 个月免费试用',
                '无需信用卡',
                '随时可取消',
                '试用期内即可完整体验核心功能',
              ].map((x) => (
                <div key={x} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-900">
                  {x}
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm text-gray-700">
              我们希望你先真正感受到透明管理的价值，再决定是否长期使用。
            </p>
          </div>
        </section>

        {/* 6) FAQ 区 */}
        <section className="mt-14 sm:mt-16">
          <SectionTitle title="FAQ" />
          <div className="mx-auto mt-8 max-w-3xl space-y-3">
            {faqs.map((f) => (
              <FaqRow key={f.q} item={f} />
            ))}
          </div>
        </section>

        {/* 7) 底部最终 CTA 区 */}
        <section className="mt-14 sm:mt-16">
          <div className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm sm:p-10">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
                5 分钟开通你的物业后台
              </h2>
              <p className="mt-3 text-sm text-gray-700 sm:text-base">
                无需部署，无需培训，今天就开始让每一笔支出更透明。
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <PrimaryCta label="立即创建我的物业" to={createHref} />
                <SecondaryCta label="先看 Demo" to={demoHref} />
              </div>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-gray-500">
            ClearStrata · 商用定价页面（可用于营销站点 / Demo 转化链路）
          </p>
        </section>
      </div>
    </div>
  );
}

