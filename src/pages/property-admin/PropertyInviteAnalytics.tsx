import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
type FilterKind = 'all' | 'public' | 'direct' | 'legacy';

/** 漏斗展示字段（部分由现有 join_requests 统计推导，无数据处兜底 0） */
type FunnelFields = {
  opened: number;
  auth_ok: number;
  submitted: number;
  approved: number;
  auto_approved: number;
};

type AnalyticsRow = {
  kind: string;
  source_id: string;
  label: string;
  identifier: string;
  request_count: number;
  approved_count: number;
  rejected_count: number;
  conversion_rate: number;
  last_used_at: string | null;
  is_active: boolean;
  expires_at: string | null;
};

type Summary = {
  invite_definitions_total: number;
  total_requests: number;
  total_approved: number;
  total_rejected: number;
  avg_conversion: number;
};

function sinceFromRange(r: RangeKey): string | null {
  if (r === 'all') return null;
  const d = new Date();
  const days = r === '7d' ? 7 : 30;
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/** 由列表行推导漏斗（无独立打开/认证埋点时：opened/submitted≈申请量，auto_approved=0） */
function funnelFromRow(r: AnalyticsRow): FunnelFields {
  const submitted = r.request_count;
  const approved = r.approved_count;
  const opened = submitted;
  return {
    opened,
    auth_ok: 0,
    submitted,
    approved,
    auto_approved: 0,
  };
}

function funnelFromSummary(s: Summary): FunnelFields {
  const submitted = s.total_requests;
  const approved = s.total_approved;
  const opened = submitted;
  return {
    opened,
    auth_ok: 0,
    submitted,
    approved,
    auto_approved: 0,
  };
}

function conversionFinalPass(f: FunnelFields): number {
  if (f.opened <= 0) return 0;
  return (f.approved + f.auto_approved) / f.opened;
}

function kindLabel(kind: string, en: boolean): string {
  const m: Record<string, [string, string]> = {
    public: ['Public code', '公开邀请码'],
    direct: ['Directed invite', '定向邀请'],
    legacy: ['Classic invite', '经典邀请'],
  };
  const pair = m[kind] ?? [kind, kind];
  return en ? pair[0] : pair[1];
}

function inviteStatus(
  row: { is_active: boolean; expires_at: string | null },
  en: boolean,
): { key: 'active' | 'expired' | 'disabled'; label: string } {
  if (!row.is_active) {
    return { key: 'disabled', label: en ? 'Disabled' : '已停用' };
  }
  if (row.expires_at) {
    const t = new Date(row.expires_at).getTime();
    if (!Number.isNaN(t) && t < Date.now()) {
      return { key: 'expired', label: en ? 'Expired' : '已失效' };
    }
  }
  return { key: 'active', label: en ? 'Active' : '启用中' };
}

function fmtTime(iso: string | null, en: boolean): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(en ? 'en-CA' : 'zh-CN');
  } catch {
    return iso;
  }
}

const STAGE_COLORS = ['#94a3b8', '#a5b4fc', '#38bdf8', '#34d399', '#059669'];

export function PropertyInviteAnalytics() {
  const { language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId } = useProperty();

  const [range, setRange] = useState<RangeKey>('30d');
  const [kindFilter, setKindFilter] = useState<FilterKind>('all');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<AnalyticsRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentPropertyId) return;
    setLoading(true);
    setError(null);
    const p_since = sinceFromRange(range);
    const { data, error: rpcErr } = await supabase.rpc('get_invite_analytics', {
      p_property_id: currentPropertyId,
      p_since: p_since,
    });
    if (rpcErr) {
      console.error(rpcErr);
      setError(rpcErr.message);
      setSummary(null);
      setRows([]);
      setLoading(false);
      return;
    }
    const d = data as { ok?: boolean; summary?: Summary; rows?: AnalyticsRow[]; error?: string } | null;
    if (!d?.ok) {
      setError(d?.error === 'forbidden' ? (en ? 'Access denied.' : '无权限访问。') : en ? 'Failed to load.' : '加载失败');
      setSummary(null);
      setRows([]);
      setLoading(false);
      return;
    }
    setSummary(d.summary ?? null);
    setRows((d.rows as AnalyticsRow[]) ?? []);
    setLoading(false);
  }, [currentPropertyId, range, en]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    if (kindFilter === 'all') return rows;
    return rows.filter((r) => r.kind === kindFilter);
  }, [rows, kindFilter]);

  const propertyFunnel = useMemo((): FunnelFields | null => {
    if (!summary) return null;
    return funnelFromSummary(summary);
  }, [summary]);

  const funnelStageChart = useMemo(() => {
    if (!propertyFunnel) return [];
    const f = propertyFunnel;
    return [
      { stage: en ? 'Opened' : '打开', key: 'opened', n: f.opened, fill: STAGE_COLORS[0] },
      { stage: en ? 'Auth OK' : '认证成功', key: 'auth_ok', n: f.auth_ok, fill: STAGE_COLORS[1] },
      { stage: en ? 'Submitted' : '提交申请', key: 'submitted', n: f.submitted, fill: STAGE_COLORS[2] },
      { stage: en ? 'Approved' : '审核通过', key: 'approved', n: f.approved, fill: STAGE_COLORS[3] },
      { stage: en ? 'Auto' : '自动通过', key: 'auto_approved', n: f.auto_approved, fill: STAGE_COLORS[4] },
    ];
  }, [propertyFunnel, en]);

  const stackedChartData = useMemo(() => {
    return [...filteredRows]
      .sort((a, b) => b.request_count - a.request_count)
      .slice(0, 12)
      .map((r) => {
        const f = funnelFromRow(r);
        const name = r.label.length > 14 ? `${r.label.slice(0, 14)}…` : r.label;
        return {
          name,
          fullLabel: r.label,
          opened: f.opened,
          auth_ok: f.auth_ok,
          submitted: f.submitted,
          approved: f.approved,
          auto_approved: f.auto_approved,
        };
      });
  }, [filteredRows]);

  const insightRows: InviteInsightRow[] = useMemo(() => {
    return filteredRows.map((r) => {
      const f = funnelFromRow(r);
      return {
        kind: r.kind,
        label: r.label,
        identifier: r.identifier,
        request_count: f.submitted,
        approved_count: f.approved + f.auto_approved,
        rejected_count: r.rejected_count,
        conversion_rate: conversionFinalPass(f),
      };
    });
  }, [filteredRows]);

  const bestInviteRow = useMemo(() => computeBestInviteRow(insightRows), [insightRows]);
  const lowConversionRow = useMemo(() => computeLowConversionRow(insightRows), [insightRows]);

  const finalPassTotal = propertyFunnel ? propertyFunnel.approved + propertyFunnel.auto_approved : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{en ? 'Invite funnel (MVP)' : '邀请码漏斗（最小可用）'}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {en
              ? 'Funnel fields from current analytics; open/auth/auto may be 0 until backend events exist.'
              : '漏斗字段由现有统计推导；打开/认证/自动通过在无埋点时为 0。'}
          </p>
        </div>
        <Link to="/property-admin/settings" className="text-sm font-medium text-[#1D9E75] hover:underline">
          ← {en ? 'Property settings' : '物业设置'}
        </Link>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">{en ? 'Opened' : '打开数'}</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{propertyFunnel?.opened ?? '—'}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">{en ? 'Auth OK' : '认证成功'}</div>
          <div className="mt-1 text-2xl font-semibold text-indigo-900">{propertyFunnel?.auth_ok ?? '—'}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">{en ? 'Submitted' : '提交申请'}</div>
          <div className="mt-1 text-2xl font-semibold text-sky-900">{propertyFunnel?.submitted ?? '—'}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">{en ? 'Final pass (approved + auto)' : '最终通过（审核+自动）'}</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-900">{finalPassTotal ?? '—'}</div>
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
        <span className="ml-2 text-sm font-medium text-gray-700">{en ? 'Type' : '类型'}</span>
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as FilterKind)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
        >
          <option value="all">{en ? 'All' : '全部'}</option>
          <option value="public">{en ? 'Public codes' : '公开邀请码'}</option>
          <option value="direct">{en ? 'Directed' : '定向邀请'}</option>
          <option value="legacy">{en ? 'Classic' : '经典邀请'}</option>
        </select>
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
                {en ? 'Funnel stages (property)' : '漏斗阶段（物业汇总）'}
              </h2>
              <div className="h-72 w-full">
                {funnelStageChart.length === 0 ? (
                  <p className="py-12 text-center text-sm text-gray-500">{en ? 'No data.' : '暂无数据'}</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelStageChart} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100" />
                      <XAxis dataKey="stage" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={56} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [v, en ? 'count' : '次数']} />
                      <Bar dataKey="n" radius={[4, 4, 0, 0]}>
                        {funnelStageChart.map((e, i) => (
                          <Cell key={e.key} fill={e.fill ?? STAGE_COLORS[i % STAGE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">
                {en ? 'Stacked funnel by invite (top 12)' : '分阶段堆叠（前12 条邀请）'}
              </h2>
              <div className="h-72 w-full">
                {stackedChartData.length === 0 ? (
                  <p className="py-12 text-center text-sm text-gray-500">{en ? 'No data.' : '暂无数据'}</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stackedChartData} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={70} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v: number) => [v, en ? 'count' : '次数']}
                        labelFormatter={(_, p) => (p?.[0]?.payload?.fullLabel as string) ?? ''}
                      />
                      <Bar dataKey="opened" stackId="a" fill={STAGE_COLORS[0]} name={en ? 'Opened' : '打开'} />
                      <Bar dataKey="auth_ok" stackId="a" fill={STAGE_COLORS[1]} name={en ? 'Auth OK' : '认证'} />
                      <Bar dataKey="submitted" stackId="a" fill={STAGE_COLORS[2]} name={en ? 'Submitted' : '提交'} />
                      <Bar dataKey="approved" stackId="a" fill={STAGE_COLORS[3]} name={en ? 'Approved' : '通过'} />
                      <Bar dataKey="auto_approved" stackId="a" fill={STAGE_COLORS[4]} name={en ? 'Auto' : '自动'} />
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
                  <th className="px-3 py-3 font-semibold">{en ? 'Label' : '标签'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Code' : '标识'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Opened' : '打开'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Auth OK' : '认证'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Submitted' : '提交'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Approved' : '审核通过'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Auto' : '自动通过'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Conversion' : '转化率'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Type' : '类型'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Last use' : '最近'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Status' : '状态'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-10 text-center text-gray-500">
                      {en ? 'No rows.' : '暂无数据'}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => {
                    const f = funnelFromRow(r);
                    const conv = conversionFinalPass(f);
                    const st = inviteStatus(r, en);
                    return (
                      <tr key={`${r.kind}-${r.source_id}`} className="border-t border-gray-100">
                        <td className="px-3 py-2.5">{r.label}</td>
                        <td className="px-3 py-2.5 font-mono text-xs break-all max-w-[180px]">{r.identifier}</td>
                        <td className="px-3 py-2.5">{f.opened}</td>
                        <td className="px-3 py-2.5">{f.auth_ok}</td>
                        <td className="px-3 py-2.5">{f.submitted}</td>
                        <td className="px-3 py-2.5">{f.approved}</td>
                        <td className="px-3 py-2.5">{f.auto_approved}</td>
                        <td className="px-3 py-2.5 tabular-nums">{`${(conv * 100).toFixed(1)}%`}</td>
                        <td className="px-3 py-2.5">{kindLabel(r.kind, en)}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs">{fmtTime(r.last_used_at, en)}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              st.key === 'active'
                                ? 'bg-emerald-100 text-emerald-900'
                                : st.key === 'expired'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
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
