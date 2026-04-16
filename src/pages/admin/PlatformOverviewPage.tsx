import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getPlatformOverview, type PlatformOverview } from '@/features/admin/getPlatformOverview';
import { demoEntryPath, MARKETING_DEMO_PROPERTY_CODE, realPropertyJoinPath } from '@/lib/propertyEntryRoutes';
import { PriorityBadge } from '@/components/admin/PriorityBadge';

function MetricCard({
  title,
  value,
  hint,
  accent = 'gray',
}: {
  title: string;
  value: number;
  hint: string;
  accent?: 'gray' | 'amber' | 'rose' | 'green';
}) {
  const cls =
    accent === 'rose'
      ? 'border-rose-200 bg-rose-50'
      : accent === 'amber'
        ? 'border-amber-200 bg-amber-50'
        : accent === 'green'
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-gray-200 bg-white';
  return (
    <div className={`rounded-3xl border ${cls} p-5 shadow-sm`}>
      <p className="text-xs font-semibold text-gray-600">{title}</p>
      <p className="mt-2 text-3xl font-black text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-600">{hint}</p>
    </div>
  );
}

function badge(kind: 'rose' | 'amber' | 'gray' | 'green') {
  const base = 'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold';
  if (kind === 'rose') return `${base} border-rose-200 bg-rose-50 text-rose-900`;
  if (kind === 'amber') return `${base} border-amber-200 bg-amber-50 text-amber-900`;
  if (kind === 'green') return `${base} border-emerald-200 bg-emerald-50 text-emerald-900`;
  return `${base} border-gray-200 bg-gray-50 text-gray-900`;
}

function fmt(ts: string | null | undefined): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  try {
    return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d);
  } catch {
    return d.toISOString();
  }
}

function expiredDaysText(trialEndsAt: string | null): string | null {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt);
  if (Number.isNaN(end.getTime())) return null;
  const ms = Date.now() - end.getTime();
  if (ms <= 0) return null;
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return `已过期 ${days} 天`;
}

export function PlatformOverviewPage() {
  const { user } = useAuth();
  const isSerena = String(user?.email ?? '').trim().toLowerCase() === 'serena@clearstrata.ai';

  const [data, setData] = useState<PlatformOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorText(null);
    void (async () => {
      try {
        const res = await getPlatformOverview();
        if (cancelled) return;
        setData(res);
      } catch (e) {
        if (cancelled) return;
        console.warn('[PlatformOverview] load', e);
        setErrorText('无法加载平台总览数据（可能字段未同步或权限不足）。');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = data?.metrics ?? {
    newTrials7d: 0,
    expiringTrials7d: 0,
    expiredTrials: 0,
    newLeads7d: 0,
    pendingLeads: 0,
    wonLeads: 0,
  };

  return (
    <div className="space-y-6">
      {/* 1) Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-gray-900">平台运营总览</h1>
            {isSerena ? <span className={badge('green')}>平台管理员</span> : null}
          </div>
          <p className="mt-1 text-sm text-gray-600">仅供 ClearStrata 内部使用，查看试用、升级与转化情况</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/admin/leads"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
          >
            查看线索
          </Link>
          <Link
            to="/upgrade"
            className="inline-flex items-center justify-center rounded-xl bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white hover:bg-[#178a66]"
          >
            升级页
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载中…
        </div>
      ) : null}
      {errorText ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {errorText}
        </div>
      ) : null}

      {/* 2) Metrics */}
      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="最近 7 天新增试用物业"
            value={metrics.newTrials7d}
            hint="subscription_status=trial 且 trial_started_at/created_at 在 7 天内"
          />
          <MetricCard
            title="7 天内即将到期物业"
            value={metrics.expiringTrials7d}
            hint="trial_ends_at 在未来 7 天内"
            accent="amber"
          />
          <MetricCard
            title="已过期未升级物业"
            value={metrics.expiredTrials}
            hint="trial_ends_at <= now"
            accent="rose"
          />
          <MetricCard
            title="最近 7 天新增升级线索"
            value={metrics.newLeads7d}
            hint="leads.created_at 在 7 天内"
          />
          <MetricCard
            title="待跟进线索"
            value={metrics.pendingLeads}
            hint="leads.status = new"
            accent="amber"
          />
          <MetricCard
            title="已成交线索"
            value={metrics.wonLeads}
            hint="leads.status = won"
            accent="green"
          />
        </div>
      </section>

      {/* 3) High priority list */}
      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900">今日优先行动队列（Top 10）</h2>
            <p className="mt-1 text-sm text-gray-600">
              按可解释规则自动打分并排序：优先处理试用紧急、线索热度高、方案意向强的物业
            </p>
          </div>
          <Link to="/admin/leads" className="text-sm font-semibold text-gray-700 hover:text-gray-900">
            去线索页跟进 →
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[1180px] w-full">
            <thead className="border-b border-gray-200 text-left text-xs font-semibold text-gray-600">
              <tr>
                <th className="py-2 pr-3">物业</th>
                <th className="py-2 pr-3">联系人</th>
                <th className="py-2 pr-3">邮箱</th>
                <th className="py-2 pr-3">试用</th>
                <th className="py-2 pr-3">剩余/过期</th>
                <th className="py-2 pr-3">方案</th>
                <th className="py-2 pr-3">线索</th>
                <th className="py-2 pr-3">优先级</th>
                <th className="py-2 pr-3">分数</th>
                <th className="py-2 pr-3">原因</th>
                <th className="py-2 pr-3">提交时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {(data?.prioritizedPropertyLeads ?? []).map((r) => {
                const plan = String(r.selectedPlan ?? '').toLowerCase();
                const planText = plan ? plan : '—';
                const leadStatus =
                  r.leadCreatedAt == null && (r.leadStatus == null || String(r.leadStatus).trim() === '')
                    ? '无 lead'
                    : r.leadStatus == null || String(r.leadStatus).trim() === ''
                      ? '—'
                      : String(r.leadStatus);
                const days = r.daysRemaining;
                const trialBadge =
                  r.trialState === 'expired' ? badge('rose') : r.trialState === 'expiring' ? badge('amber') : badge('gray');
                const trialText =
                  r.trialState === 'expired' ? '已过期' : r.trialState === 'expiring' ? '即将到期' : r.trialState === 'active' ? '试用中' : '未知';
                const expiredText = r.trialState === 'expired' ? expiredDaysText(r.trialEndsAt) : null;
                const daysText =
                  r.trialState === 'expired'
                    ? expiredText ?? '已过期'
                    : typeof days === 'number' && days > 0
                      ? `剩余 ${days} 天`
                      : '—';
                const reasons = (r.scoreBreakdown ?? []).slice(0, 3).join('、');
                return (
                  <tr
                    key={`${r.propertyId ?? 'solo'}|${r.email ?? ''}|${r.leadCreatedAt ?? ''}|${r.priorityScore}`}
                    className="text-gray-800"
                  >
                    <td className="py-3 pr-3 font-semibold text-gray-900">{r.propertyName}</td>
                    <td className="py-3 pr-3">{r.contactName?.trim() ? r.contactName : <span className="text-gray-500">—</span>}</td>
                    <td className="py-3 pr-3">
                      {r.email?.trim() ? (
                        <a className="font-semibold text-[#1D9E75] hover:underline" href={`mailto:${r.email}`}>
                          {r.email}
                        </a>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <span className={trialBadge}>{trialText}</span>
                    </td>
                    <td className="py-3 pr-3">{daysText}</td>
                    <td className="py-3 pr-3">{planText}</td>
                    <td className="py-3 pr-3">{leadStatus}</td>
                    <td className="py-3 pr-3">
                      <PriorityBadge level={r.priorityLevel} />
                    </td>
                    <td className="py-3 pr-3 font-black text-gray-900">{r.priorityScore} 分</td>
                    <td className="py-3 pr-3 text-xs text-gray-600">{reasons ? reasons : '—'}</td>
                    <td className="py-3 pr-3 text-xs text-gray-600">{fmt(r.leadCreatedAt)}</td>
                  </tr>
                );
              })}
              {(data?.prioritizedPropertyLeads?.length ?? 0) === 0 ? (
                <tr>
                  <td className="py-8 text-center text-sm text-gray-500" colSpan={11}>
                    当前没有需要优先跟进的物业
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4) Recent leads */}
      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-gray-900">最近升级线索</h2>
            <p className="mt-1 text-sm text-gray-600">按 created_at 倒序展示最近 10 条</p>
          </div>
          <Link to="/admin/leads" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900">
            查看全部
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[880px] w-full">
            <thead className="border-b border-gray-200 text-left text-xs font-semibold text-gray-600">
              <tr>
                <th className="py-2 pr-3">时间</th>
                <th className="py-2 pr-3">物业</th>
                <th className="py-2 pr-3">联系人</th>
                <th className="py-2 pr-3">方案</th>
                <th className="py-2 pr-3">状态</th>
                <th className="py-2 pr-3">来源</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {(data?.recentLeads ?? []).map((r) => (
                <tr key={r.id} className="text-gray-800">
                  <td className="py-3 pr-3 text-xs text-gray-600">{fmt(r.createdAt)}</td>
                  <td className="py-3 pr-3 font-semibold text-gray-900">{r.propertyName}</td>
                  <td className="py-3 pr-3">{r.name} · {r.email}</td>
                  <td className="py-3 pr-3">{r.selectedPlan ?? '—'}</td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <span>{r.status}</span>
                      <PriorityBadge level={r.priorityLevel} />
                      <span className="text-xs text-gray-500">{r.priorityScore} 分</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-xs text-gray-600">{r.source ?? '—'}</td>
                </tr>
              ))}
              {(data?.recentLeads?.length ?? 0) === 0 ? (
                <tr>
                  <td className="py-8 text-center text-sm text-gray-500" colSpan={6}>
                    暂无近期线索
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5) Shortcuts */}
      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-gray-900">快捷入口</h2>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link to="/admin/leads" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50">
            查看全部销售线索
          </Link>
          <Link to="/pricing" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50">
            查看定价页
          </Link>
          <Link to="/upgrade" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50">
            查看升级页
          </Link>
          <Link
            to={demoEntryPath(MARKETING_DEMO_PROPERTY_CODE)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
          >
            查看演示样板（Demo）
          </Link>
          <Link
            to={realPropertyJoinPath(MARKETING_DEMO_PROPERTY_CODE)}
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100"
          >
            真实物业入口（{MARKETING_DEMO_PROPERTY_CODE}）
          </Link>
        </div>
      </section>
    </div>
  );
}

