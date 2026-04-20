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
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import { supabase } from '../../lib/supabase';

type RangeKey = '7d' | '30d' | 'all';
type FilterKind = 'all' | 'public' | 'direct' | 'legacy';

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

  const bestInviteRow = useMemo(() => computeBestInviteRow(filteredRows), [filteredRows]);
  const lowConversionRow = useMemo(() => computeLowConversionRow(filteredRows), [filteredRows]);

  const chartData = useMemo(() => {
    const list = [...filteredRows]
      .sort((a, b) => b.request_count - a.request_count)
      .slice(0, 12)
      .map((r) => ({
        name: r.label.length > 14 ? `${r.label.slice(0, 14)}…` : r.label,
        fullLabel: r.label,
        requests: r.request_count,
        conversion: Math.round((r.conversion_rate ?? 0) * 10000) / 100,
        kind: r.kind,
      }));
    return list;
  }, [filteredRows]);

  const conversionChartData = useMemo(() => {
    return [...filteredRows]
      .sort((a, b) => (b.conversion_rate ?? 0) - (a.conversion_rate ?? 0))
      .slice(0, 12)
      .map((r) => ({
        name: r.label.length > 14 ? `${r.label.slice(0, 14)}…` : r.label,
        conversion: Math.round((r.conversion_rate ?? 0) * 10000) / 100,
        kind: r.kind,
      }));
  }, [filteredRows]);

  const barColor = (kind: string) => {
    if (kind === 'public') return '#1D9E75';
    if (kind === 'direct') return '#0ea5e9';
    return '#a855f7';
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">邀请码来源统计</h1>
          <p className="mt-1 text-sm text-gray-600">查看不同邀请码与二维码入口的申请量和转化表现</p>
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
          <div className="text-xs text-gray-500">{en ? 'Invite definitions' : '邀请码总数'}</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{summary?.invite_definitions_total ?? '—'}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">{en ? 'Total applications' : '总申请数'}</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{summary?.total_requests ?? '—'}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">{en ? 'Approved' : '总通过数'}</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-900">{summary?.total_approved ?? '—'}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">{en ? 'Avg. conversion' : '平均转化率'}</div>
          <div className="mt-1 text-2xl font-semibold text-[#1D9E75]">
            {summary != null ? `${(summary.avg_conversion * 100).toFixed(1)}%` : '—'}
          </div>
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
                {en ? 'Applications per invite (top 12)' : '各邀请码申请数（前12）'}
              </h2>
              <div className="h-72 w-full">
                {chartData.length === 0 ? (
                  <p className="py-12 text-center text-sm text-gray-500">{en ? 'No data.' : '暂无数据'}</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={60} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v: number) => [v, en ? 'requests' : '申请数']}
                        labelFormatter={(_, p) => (p?.[0]?.payload?.fullLabel as string) ?? ''}
                      />
                      <Bar dataKey="requests" radius={[4, 4, 0, 0]}>
                        {chartData.map((e, i) => (
                          <Cell key={i} fill={barColor(e.kind)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">
                {en ? 'Conversion rate % (top 12)' : '各邀请码转化率 %（前12）'}
              </h2>
              <div className="h-72 w-full">
                {conversionChartData.length === 0 ? (
                  <p className="py-12 text-center text-sm text-gray-500">{en ? 'No data.' : '暂无数据'}</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={conversionChartData} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => [`${v}%`, en ? 'conversion' : '转化率']} />
                      <Bar dataKey="conversion" radius={[0, 4, 4, 0]}>
                        {conversionChartData.map((e, i) => (
                          <Cell key={i} fill={barColor(e.kind)} />
                        ))}
                      </Bar>
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
                  <th className="px-3 py-3 font-semibold">{en ? 'Type' : '类型'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Code / token' : '标识'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Applications' : '申请数'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Approved' : '通过'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Rejected' : '拒绝'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Conversion' : '转化率'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Last application' : '最近申请'}</th>
                  <th className="px-3 py-3 font-semibold">{en ? 'Status' : '状态'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-10 text-center text-gray-500">
                      {en ? 'No rows.' : '暂无数据'}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => {
                    const st = inviteStatus(r, en);
                    return (
                      <tr key={`${r.kind}-${r.source_id}`} className="border-t border-gray-100">
                        <td className="px-3 py-2.5">{r.label}</td>
                        <td className="px-3 py-2.5">{kindLabel(r.kind, en)}</td>
                        <td className="px-3 py-2.5 font-mono text-xs break-all max-w-[200px]">{r.identifier}</td>
                        <td className="px-3 py-2.5">{r.request_count}</td>
                        <td className="px-3 py-2.5">{r.approved_count}</td>
                        <td className="px-3 py-2.5">{r.rejected_count}</td>
                        <td className="px-3 py-2.5">{`${(r.conversion_rate * 100).toFixed(1)}%`}</td>
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
