import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Mail, Phone, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProperty } from '@/contexts/PropertyContext';
import { supabase } from '@/lib/supabase';
import { getTrialDaysRemaining, getTrialState, type TrialState } from '@/lib/subscription';

type PlanKey = 'Starter' | 'Standard' | 'Pro';

type PropertySnapshot = {
  id: string;
  name?: string | null;
  subscription_status?: string | null;
  trial_ends_at?: string | null;
};

type Toast = { kind: 'success' | 'error'; text: string } | null;

const plans: Array<{
  key: PlanKey;
  monthly: string;
  yearly: string;
  bullets: string[];
}> = [
  {
    key: 'Starter',
    monthly: '$29 / 月',
    yearly: '$299 / 年',
    bullets: ['基础财务透明', '公告与成员管理', '基础邀请码功能', '基础后台模块'],
  },
  {
    key: 'Standard',
    monthly: '$59 / 月',
    yearly: '$599 / 年',
    bullets: ['发票 AI 审计', '异常提醒', '预算对比', '会议支持', '成员与邀请管理', '房号/白名单支持'],
  },
  {
    key: 'Pro',
    monthly: '$99 / 月',
    yearly: '$999 / 年',
    bullets: ['自动审计报告', '供应商风险分析', '会议材料导出', '高级财务洞察', '包含 Standard 全部功能'],
  },
];

const compareRows: Array<{ label: string; starter: boolean; standard: boolean; pro: boolean }> = [
  { label: '基础财务透明', starter: true, standard: true, pro: true },
  { label: '公告与成员管理', starter: true, standard: true, pro: true },
  { label: '发票 AI 审计', starter: false, standard: true, pro: true },
  { label: '异常提醒', starter: false, standard: true, pro: true },
  { label: '预算对比', starter: false, standard: true, pro: true },
  { label: '会议支持', starter: false, standard: true, pro: true },
  { label: '自动审计报告', starter: false, standard: false, pro: true },
  { label: '供应商风险分析', starter: false, standard: false, pro: true },
  { label: '会议材料导出', starter: false, standard: false, pro: true },
];

const faq: Array<{ q: string; a: string }> = [
  {
    q: '升级后试用数据会保留吗？',
    a: '会。你在试用期内创建的物业、发票、成员与配置会继续保留。',
  },
  {
    q: '可以先联系，再决定具体方案吗？',
    a: '可以。你可以先提交开通意向，我们会根据你的物业规模与使用情况建议方案。',
  },
  {
    q: '普通业主需要额外付费吗？',
    a: '不需要。费用由物业层级承担，业主按权限加入即可使用。',
  },
  {
    q: '现在还没准备好付款，可以先继续试用吗？',
    a: '可以。在试用期内你可以继续体验核心功能；如试用接近结束，我们会提醒你升级。',
  },
];

function trialSummaryCopy(state: TrialState, propertyName: string, daysLeft: number) {
  if (state === 'expiring') {
    return {
      title: '你的试用即将结束',
      line1: `你的物业：${propertyName || '—'}`,
      line2: `还剩 ${daysLeft} 天，建议提前准备升级，避免使用中断。`,
    };
  }
  if (state === 'expired') {
    return {
      title: '试用已结束',
      line1: `你的物业：${propertyName || '—'}`,
      line2: '你仍可暂时访问系统，但建议尽快升级，确保后续稳定使用。',
    };
  }
  if (state === 'active') {
    return {
      title: '你正在试用 ClearStrata',
      line1: `你的物业：${propertyName || '—'}`,
      line2: `试用剩余 ${daysLeft} 天。现在升级可确保功能连续、团队协作不中断。`,
    };
  }
  return {
    title: '联系开通 / 升级方案',
    line1: propertyName ? `你的物业：${propertyName}` : '你可以提交开通意向，我们会尽快联系你。',
    line2: '当前阶段不接支付，你可以先提交开通意向，我们会给出建议方案与开通指引。',
  };
}

function recommendPlan(): PlanKey {
  return 'Standard';
}

function CheckCell({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 className="mx-auto h-5 w-5 text-clearstrata-ui-primary" aria-hidden />
  ) : (
    <span className="block text-center text-gray-300">—</span>
  );
}

export function UpgradePage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { currentPropertyId, isDemoMode, isDemoPropertyMock } = useProperty();

  const pid = useMemo(() => (currentPropertyId ? String(currentPropertyId) : ''), [currentPropertyId]);
  const [property, setProperty] = useState<PropertySnapshot | null>(null);
  const [loadingProperty, setLoadingProperty] = useState(false);

  const [toast, setToast] = useState<Toast>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), toast.kind === 'success' ? 5000 : 7000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    if (!pid || isDemoMode || isDemoPropertyMock) {
      setProperty(null);
      return;
    }
    setLoadingProperty(true);
    void (async () => {
      try {
        const { data, error } = await (supabase
          .from('properties')
          .select('id,name,subscription_status,trial_ends_at')
          .eq('id', pid)
          .maybeSingle() as any);
        if (cancelled) return;
        if (error) {
          // silent downgrade: old env / missing columns / RLS
          setProperty({ id: pid });
          return;
        }
        setProperty((data as PropertySnapshot) ?? { id: pid });
      } finally {
        if (!cancelled) setLoadingProperty(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pid, isDemoMode, isDemoPropertyMock]);

  const subscriptionStatus = property?.subscription_status ?? null;
  const trialEndsAt = property?.trial_ends_at ?? null;
  const daysLeft = getTrialDaysRemaining(trialEndsAt);
  const trialState = getTrialState(trialEndsAt, subscriptionStatus, 7);

  const recommended = recommendPlan();
  const recommendedPlan = plans.find((p) => p.key === recommended)!;

  // Form state
  const formRef = useRef<HTMLDivElement | null>(null);
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>(recommended);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);

  useEffect(() => {
    const fallbackName =
      (profile?.full_name_zh && profile.full_name_zh.trim()) ||
      (profile?.full_name_en && profile.full_name_en.trim()) ||
      '';
    if (!contactName.trim() && fallbackName) setContactName(fallbackName);
  }, [profile, contactName]);

  useEffect(() => {
    const uEmail = (user?.email ?? profile?.email ?? '').trim();
    if (!email.trim() && uEmail) setEmail(uEmail);
  }, [user?.email, profile?.email, email]);

  useEffect(() => {
    const pn = (property?.name ?? '').trim();
    if (!propertyName.trim() && pn) setPropertyName(pn);
  }, [property?.name, propertyName]);

  const statusCopy = useMemo(() => {
    const name = property?.name?.trim() || propertyName.trim() || '';
    return trialSummaryCopy(trialState, name, daysLeft);
  }, [trialState, property?.name, propertyName, daysLeft]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || submitLock.current) return;
    setToast(null);

    const n = contactName.trim();
    const em = email.trim().toLowerCase();
    if (!n || !em) {
      setToast({ kind: 'error', text: '请填写联系人姓名与联系邮箱。' });
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    try {
      const planDb =
        selectedPlan === 'Starter'
          ? 'starter'
          : selectedPlan === 'Standard'
            ? 'standard'
            : selectedPlan === 'Pro'
              ? 'pro'
              : 'unknown';

      const payloadFull = {
        property_id: pid || null,
        name: n,
        email: em,
        phone: phone.trim() || null,
        property_name: propertyName.trim() || null,
        selected_plan: planDb,
        source: 'upgrade_page',
        status: 'new',
        note: note.trim() || null,
        created_by: user?.id ?? null,
        trial_ends_at_snapshot: trialEndsAt || null,
        subscription_status_snapshot: subscriptionStatus || null,
      };

      // Prefer structured columns; fallback to legacy shape if columns not deployed.
      const { error } = await (supabase.from('leads').insert(payloadFull) as any);
      if (error) {
        const msg = String((error as any)?.message ?? '').toLowerCase();
        const missingCol = msg.includes('column') && msg.includes('does not exist');
        if (!missingCol) {
          console.warn('[upgrade] leads insert', error);
          setToast({ kind: 'error', text: '提交失败，请稍后重试。' });
          return;
        }

        const details = [
          `source=upgrade_page`,
          `selected_plan=${planDb}`,
          `subscription_status=${String(subscriptionStatus ?? '')}`,
          trialEndsAt ? `trial_ends_at=${trialEndsAt}` : '',
          pid ? `property_id=${pid}` : '',
          propertyName.trim() ? `property_name=${propertyName.trim()}` : '',
          note.trim() ? `note=${note.trim()}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        const { error: fallbackErr } = await (supabase.from('leads').insert({
          name: n,
          email: em,
          phone: phone.trim() || null,
          property_id: pid || null,
          building: propertyName.trim() || null,
          units: null,
          message: details,
        }) as any);
        if (fallbackErr) {
          console.warn('[upgrade] leads fallback insert', fallbackErr);
          setToast({ kind: 'error', text: '提交失败，请稍后重试。' });
          return;
        }
      }

      setToast({ kind: 'success', text: '我们已收到你的开通意向，会尽快联系你。' });
      setNote('');
    } catch (err) {
      setToast({ kind: 'error', text: err instanceof Error ? err.message : '提交失败，请稍后重试。' });
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
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
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              查看定价
            </Link>
            <button
              type="button"
              onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="inline-flex items-center justify-center rounded-xl bg-clearstrata-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive active:scale-[0.99]"
            >
              提交升级意向
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* 1) 顶部状态摘要区 */}
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-clearstrata-brand-700" />
                <h1 className="text-xl font-black tracking-tight text-gray-900">{statusCopy.title}</h1>
              </div>
              <p className="mt-2 text-sm text-gray-700">{statusCopy.line1}</p>
              <p className="mt-1 text-sm text-gray-700">{statusCopy.line2}</p>
              {loadingProperty ? (
                <p className="mt-2 inline-flex items-center gap-2 text-xs text-gray-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  正在读取当前物业状态…
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <button
                type="button"
                onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="inline-flex items-center justify-center rounded-xl bg-clearstrata-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive active:scale-[0.99]"
              >
                联系开通 / 提交意向
              </button>
              <Link to="/pricing" className="text-xs font-semibold text-gray-600 hover:text-gray-900">
                先回到定价页对比方案 →
              </Link>
            </div>
          </div>
        </section>

        {/* 2) 推荐方案区 */}
        <section className="mt-10 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-clearstrata-ui-softBorder bg-gradient-to-br from-white to-clearstrata-ui-soft/60 p-6 shadow-sm sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clearstrata-brand-800">推荐方案</p>
              <h2 className="mt-2 text-xl font-black text-gray-900">推荐给你的物业：{recommended}</h2>
              <p className="mt-2 text-sm text-gray-700">
                适合正在使用发票审计、预算对比与会议支持的物业。对大多数业委会来说，这一档已经能覆盖核心使用场景。
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-xs text-gray-500">月付</p>
                  <p className="mt-1 text-2xl font-black text-gray-900">{recommendedPlan.monthly}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-xs text-gray-500">年付</p>
                  <p className="mt-1 text-2xl font-black text-gray-900">{recommendedPlan.yearly}</p>
                </div>
              </div>
              <ul className="mt-5 space-y-3 text-sm text-gray-700">
                {recommendedPlan.bullets.slice(0, 5).map((b) => (
                  <li key={b} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-clearstrata-ui-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlan(recommended);
                    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="inline-flex items-center justify-center rounded-xl bg-clearstrata-ui-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive active:scale-[0.99]"
                >
                  提交升级意向（{recommended}）
                </button>
                <Link
                  to="/pricing"
                  className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                >
                  查看定价
                </Link>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <h3 className="text-base font-bold text-gray-900">其他方案（简表）</h3>
              <div className="mt-4 space-y-3">
                {plans.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      setSelectedPlan(p.key);
                      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left hover:bg-gray-100"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{p.key}</p>
                        <p className="mt-1 text-xs text-gray-600">{p.monthly} · {p.yearly}</p>
                      </div>
                      <span className="text-xs font-semibold text-clearstrata-ui-primary">选择 →</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 3) 方案对比区 */}
        <section className="mt-10 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-black text-gray-900">方案对比（决策支持）</h2>
          <p className="mt-2 text-sm text-gray-700">
            当前阶段不接支付。本页用于帮助你明确选择，并提交开通意向。
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-[720px] w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white px-3 py-2 text-left text-xs font-semibold text-gray-600">
                    功能
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">Starter</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">Standard</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">Pro</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((r) => (
                  <tr key={r.label} className="border-t border-gray-100">
                    <td className="sticky left-0 bg-white px-3 py-3 text-sm font-medium text-gray-900">
                      {r.label}
                    </td>
                    <td className="px-3 py-3"><CheckCell ok={r.starter} /></td>
                    <td className="px-3 py-3"><CheckCell ok={r.standard} /></td>
                    <td className="px-3 py-3"><CheckCell ok={r.pro} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4) 开通/联系表单区 */}
        <section ref={formRef} className="mt-10 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-black text-gray-900">提交升级意向 / 联系开通</h2>
          <p className="mt-2 text-sm text-gray-700">
            我们会根据你的物业规模与使用情况，协助你选择方案并完成开通流程。
          </p>

          <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
            <div>
              <label className="text-sm font-medium text-gray-700">联系人姓名</label>
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none ring-clearstrata-brand-400/30 focus:ring-2"
                placeholder="例如：王小明"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">联系邮箱</label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                <Mail className="h-4 w-4 text-gray-400" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm outline-none"
                  placeholder="name@example.com"
                  type="email"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">联系电话（可选）</label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                <Phone className="h-4 w-4 text-gray-400" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-sm outline-none"
                  placeholder="例如：04xx xxx xxx"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">物业名称</label>
              <input
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none ring-clearstrata-brand-400/30 focus:ring-2"
                placeholder="例如：BCS 3736 Strata"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">感兴趣的方案</label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value as PlanKey)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none ring-clearstrata-brand-400/30 focus:ring-2"
              >
                <option value="Starter">Starter</option>
                <option value="Standard">Standard</option>
                <option value="Pro">Pro</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700">备注（可选）</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 min-h-[96px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none ring-clearstrata-brand-400/30 focus:ring-2"
                placeholder="例如：我们希望优先开通发票审计；成员大约 8–12 人；希望下周前完成开通。"
              />
              <p className="mt-2 text-xs text-gray-500">
                当前试用状态将随提交一并记录（用于后续跟进）。
              </p>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-clearstrata-ui-primary px-5 py-3 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive disabled:opacity-50 active:scale-[0.99] sm:w-auto"
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                提交升级意向
              </button>

              <Link to="/pricing" className="text-sm font-semibold text-gray-700 hover:text-gray-900">
                先查看定价再决定 →
              </Link>
            </div>

            {toast ? (
              <div
                className={`sm:col-span-2 rounded-2xl border px-4 py-3 text-sm ${
                  toast.kind === 'success'
                    ? 'border-clearstrata-ui-softBorder bg-clearstrata-ui-soft text-clearstrata-brand-950'
                    : 'border-red-200 bg-red-50 text-red-900'
                }`}
                role="status"
              >
                {toast.text}
              </div>
            ) : null}
          </form>
        </section>

        {/* 5) FAQ 区 */}
        <section className="mt-10 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-black text-gray-900">FAQ</h2>
          <div className="mt-5 space-y-3">
            {faq.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 open:bg-white">
                <summary className="cursor-pointer list-none text-sm font-semibold text-gray-900 [&::-webkit-details-marker]:hidden">
                  {f.q}
                </summary>
                <p className="mt-2 text-sm text-gray-700">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 6) 底部 CTA 区 */}
        <section className="mt-10 rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-clearstrata-ui-soft/50 p-6 shadow-sm sm:p-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold text-gray-900">
              你的物业已经开始建立透明管理，现在是把它正式运行起来的时候了。
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="inline-flex items-center justify-center rounded-xl bg-clearstrata-ui-primary px-5 py-3 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive active:scale-[0.99]"
              >
                提交升级意向
              </button>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
              >
                查看定价
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

