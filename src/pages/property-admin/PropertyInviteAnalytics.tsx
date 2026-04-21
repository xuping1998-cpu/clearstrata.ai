import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import {
  BestInviteCard,
  computeBestInviteRow,
  computeLowConversionRow,
  LowConversionCard,
} from '../../components/property-admin/InviteInsightCards';
import type { InviteInsightRow } from '../../components/property-admin/InviteInsightCards';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import { supabase } from '../../lib/supabase';

type RangeKey = '7d' | '30d' | 'all';

type FunnelSummary = {
  invite_count: number;
  entry_opened: number;
  auth_started: number;
  auth_succeeded: number;
  submit_started: number;
  pending_submitted: number;
  auto_approved: number;
  already_member: number;
  invalid_invite: number;
  rejected: number;
  duplicate_pending?: number;
};

type TopCodeRow = {
  code: string;
  entry_opened: number;
  auth_started: number;
  auth_succeeded: number;
  submit_started: number;
  pending_submitted: number;
  auto_approved: number;
  already_member: number;
  invalid_invite: number;
  rejected: number;
};

function sinceFromRange(r: RangeKey): string | null {
  if (r === 'all') return null;
  const d = new Date();
  const days = r === '7d' ? 7 : 30;
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export function PropertyInviteAnalytics() {
  const { language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId } = useProperty();

  const [range, setRange] = useState<RangeKey>('30d');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FunnelSummary | null>(null);
  const [topCodes, setTopCodes] = useState<TopCodeRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentPropertyId) return;
    setLoading(true);
    setError(null);
    const p_since = sinceFromRange(range);
    const { data, error: rpcErr } = await supabase.rpc('get_invite_funnel_analytics', {
      p_property_id: currentPropertyId,
      p_since: p_since,
    });
    if (rpcErr) {
      console.error(rpcErr);
      setError(rpcErr.message);
      setSummary(null);
      setTopCodes([]);
      setLoading(false);
      return;
    }
    const d = data as {
      ok?: boolean;
      summary?: FunnelSummary;
      top_codes?: TopCodeRow[];
      error?: string;
    } | null;
    if (!d?.ok) {
      setError(d?.error === 'forbidden' ? (en ? 'Access denied.' : '无权限访问。') : en ? 'Failed to load.' : '加载失败');
      setSummary(null);
      setTopCodes([]);
      setLoading(false);
      return;
    }
    setSummary(d.summary ?? null);
    setTopCodes(Array.isArray(d.top_codes) ? d.top_codes : []);
    setLoading(false);
  }, [currentPropertyId, range, en]);

  useEffect(() => {
    void load();
  }, [load]);

  const insightRows: InviteInsightRow[] = useMemo(() => {
    return topCodes.map((r) => ({
      kind: 'public',
      label: r.code,
      identifier: r.code,
      request_count: r.submit_started,
      approved_count: r.auto_approved,
      rejected_count: r.invalid_invite + r.rejected,
      conversion_rate: r.entry_opened > 0 ? r.auto_approved / r.entry_opened : 0,
    }));
  }, [topCodes]);

  const bestInviteRow = useMemo(() => computeBestInviteRow(insightRows), [insightRows]);
  const lowConversionRow = useMemo(() => computeLowConversionRow(insightRows), [insightRows]);

  const chartData = useMemo(() => {
    return [...topCodes].slice(0, 12).map((r) => ({
      name: r.code.length > 14 ? `${r.code.slice(0, 14)}…` : r.code,
      fullLabel: r.code,
      opened: r.entry_opened,
      authOk: r.auth_succeeded,
      submit: r.submit_started,
    }));
  }, [topCodes]);

  const funnelStageChart = useMemo(() => {
    if (!summary) return [];
    return [
      { stage: en ? 'Opened' : '打开', n: summary.entry_opened },
      { stage: en ? 'Auth OK' : '认证', n: summary.auth_succeeded },
      { stage: en ? 'Submit' : '提交', n: summary.submit_started },
      { stage: en ? 'Pending' : '待审', n: summary.pending_submitted },
      { stage: en ? 'Auto' : '自动', n: summary.auto_approved },
    ];
  }, [summary, en]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{en ? 'Invite funnel' : '邀请码转化漏斗'}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {en
              ? 'QR and invite flows: opens, auth, submits, and outcomes (not only join_requests).'
              : '二维码/邀请码全链路：打开、认证、提交与结果（含自动通过、已是成员等）。'}
          </p>
        </div>
        <Link to="/property-admin/settings" className="text-sm font-medium text-[#1D9E75] hover:underline">
          ← {en ? 'Property settings' : '物业设置'}
        </Link>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">{en ? 'Invite definitions' : '邀请码总数'}</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{summary?.invite_count ?? '—'}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">{en ? 'Entry opened' : '链接打开'}</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{summary?.entry_opened ?? '—'}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">{en ? 'Auth completed' : '认证完成'}</div>
          <div className="mt-1 text-2xl font-semibold text-indigo-900">{summary?.auth_succeeded ?? '—'}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">{en ? 'Submit started' : '开始提交'}</div>
          <div className="mt-1 text-2xl font-semibold text-sky-900">{summary?.submit_started ?? '—'}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">{en ? 'Pending review' : '待审核'}</div>
          <div className="mt-1 text-2xl font-semibold text-amber-900">{summary?.pending_submitted ?? '—'}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">{en ? 'Auto-approved' : '自动通过'}</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-900">{summary?.auto_approved ?? '—'}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">{en ? 'Already member' : '已是成员'}</div>
          <div className="mt-1 text-2xl font-semibold text-gray-800">{summary?.already_member ?? '—'}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">{en ? 'Invalid invite' : '无效邀请码'}</div>
          <div className="mt-1 text-2xl font-semibold text-red-900">{summary?.invalid_invite ?? '—'}</div>
        </div>
      </div>

      {!loading && !error ? (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <BestInviteCard en={en} row={bestInviteRow} />
          <LowConversionCard en={en} row={lowConversionRow} />
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <span className="text-sm font-medium text-gray-700">{en ? 'Period' : '时间范围'}</span>
        <div className="flex flex-wrap gap-2">
          {(['7d', '30d', 'all'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setRange(k)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                range === k ? 'bg-[#1D9E75] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {k === '7d' ? (en ? 'Last 7 days' : '最近7天') : k === '30d' ? en ? 'Last 30 days' : '最近30天' : en ? 'All' : '全部'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-[#1D9E75]" />
        </div>
      ) : (
        <>
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">
                {en ? 'Funnel stages (property totals)' : '漏斗阶段（物业汇总）'}
              </h2>
              <div className="h-64 w-full">
                {funnelStageChart.length === 0 ? (
                  <p className="py-12 text-center text-sm text-gray-500">{en ? 'No data.' : '暂无数据'}</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelStageChart} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100" />
                      <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [v, en ? 'count' : '次数']} />
                      <Bar dataKey="n" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">
                {en ? 'Per code: opens vs auth vs submit (top 12)' : '按邀请码：打开 / 认证 / 提交（前12）'}
              </h2>
              <div className="h-64 w-full">
                {chartData.length === 0 ? (
                  <p className="py-12 text-center text-sm text-gray-500">{en ? 'No coded events yet.' : '暂无带码事件'}</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={60} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v: number, name: string) => [v, name]}
                        labelFormatter={(_, p) => (p?.[0]?.payload?.fullLabel as string) ?? ''}
                      />
                      <Bar dataKey="opened" fill="#94a3b8" name={en ? 'Opened' : '打开'} />
                      <Bar dataKey="authOk" fill="#6366f1" name={en ? 'Auth' : '认证'} />
                      <Bar dataKey="submit" fill="#0ea5e9" name={en ? 'Submit' : '提交'} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-3 font-semibold">{en ? 'Code' : '邀请码'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Opened' : '打开'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Auth' : '认证'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Submit' : '提交'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Pending' : '待审'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Auto' : '自动通过'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Member' : '已是成员'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Bad code' : '无效码'}</th>
                </tr>
              </thead>
              <tbody>
                {topCodes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-gray-500">
                      {en ? 'No per-code funnel data in this period.' : '该时间段暂无分码数据'}
                    </td>
                  </tr>
                ) : (
                  topCodes.map((r) => (
                    <tr key={r.code} className="border-t border-gray-100">
                      <td className="px-3 py-2.5 font-mono text-xs break-all max-w-[220px]">{r.code}</td>
                      <td className="px-3 py-2.5">{r.entry_opened}</td>
                      <td className="px-3 py-2.5">{r.auth_succeeded}</td>
                      <td className="px-3 py-2.5">{r.submit_started}</td>
                      <td className="px-3 py-2.5">{r.pending_submitted}</td>
                      <td className="px-3 py-2.5 text-emerald-800">{r.auto_approved}</td>
                      <td className="px-3 py-2.5">{r.already_member}</td>
                      <td className="px-3 py-2.5 text-red-800">{r.invalid_invite}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="mt-8 text-center text-xs text-gray-400">ClearStrata</p>
    </div>
  );
}
