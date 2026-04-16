import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, RefreshCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getTrialDaysRemaining } from '@/lib/subscription';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';
type LeadPlan = 'starter' | 'standard' | 'pro' | 'unknown' | '';

type LeadRow = {
  id: string;
  created_at: string;
  updated_at?: string | null;
  property_id?: string | null;
  property_name?: string | null;
  building?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  selected_plan?: string | null;
  source?: string | null;
  status?: string | null;
  note?: string | null;
  subscription_status_snapshot?: string | null;
  trial_ends_at_snapshot?: string | null;
};

function badgeClass(kind: 'gray' | 'green' | 'amber' | 'rose' | 'slate'): string {
  const base = 'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold';
  if (kind === 'green') return `${base} border-emerald-200 bg-emerald-50 text-emerald-900`;
  if (kind === 'amber') return `${base} border-amber-200 bg-amber-50 text-amber-900`;
  if (kind === 'rose') return `${base} border-rose-200 bg-rose-50 text-rose-900`;
  if (kind === 'slate') return `${base} border-slate-200 bg-slate-50 text-slate-900`;
  return `${base} border-gray-200 bg-gray-50 text-gray-900`;
}

function priorityFromTrialEnd(trialEndsAt?: string | null): { label: '高' | '中' | '低' | '—'; kind: 'rose' | 'amber' | 'gray' } {
  if (!trialEndsAt) return { label: '—', kind: 'gray' };
  const days = getTrialDaysRemaining(trialEndsAt);
  if (days <= 7) return { label: '高', kind: 'rose' };
  if (days <= 30) return { label: '中', kind: 'amber' };
  return { label: '低', kind: 'gray' };
}

function fmtTime(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

function planLabel(p?: string | null): string {
  const v = String(p ?? '').toLowerCase();
  if (v === 'starter') return 'Starter';
  if (v === 'standard') return 'Standard';
  if (v === 'pro') return 'Pro';
  return v ? v : '—';
}

function statusLabel(s?: string | null): string {
  const v = String(s ?? '').toLowerCase();
  if (v === 'new') return 'new';
  if (v === 'contacted') return 'contacted';
  if (v === 'qualified') return 'qualified';
  if (v === 'won') return 'won';
  if (v === 'lost') return 'lost';
  return v || 'new';
}

export function LeadsDashboardPage() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [planFilter, setPlanFilter] = useState<LeadPlan | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    setErrorText(null);
    try {
      let q = supabase
        .from('leads')
        .select(
          'id,created_at,updated_at,property_id,property_name,building,name,email,phone,selected_plan,source,status,note,subscription_status_snapshot,trial_ends_at_snapshot',
        )
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      if (planFilter !== 'all' && planFilter) q = q.eq('selected_plan', planFilter);
      if (sourceFilter !== 'all') q = q.eq('source', sourceFilter);

      const { data, error } = await q;
      if (error) {
        console.warn('[LeadsDashboard] select', error);
        setErrorText('无法读取线索列表（可能权限不足或表未同步）。');
        setRows([]);
        return;
      }
      setRows((data ?? []) as LeadRow[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, planFilter, sourceFilter]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const s = String(r.source ?? '').trim();
      if (s) set.add(s);
    }
    return ['all', ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const pn = String(r.property_name ?? r.building ?? '').toLowerCase();
      const n = String(r.name ?? '').toLowerCase();
      const em = String(r.email ?? '').toLowerCase();
      return pn.includes(q) || n.includes(q) || em.includes(q);
    });
  }, [rows, search]);

  const updateStatus = async (id: string, next: LeadStatus) => {
    const now = new Date().toISOString();
    const { error } = await (supabase
      .from('leads')
      .update({ status: next, updated_at: now })
      .eq('id', id) as any);
    if (error) {
      console.warn('[LeadsDashboard] update status', error);
      alert('更新失败（可能权限不足）。');
      return;
    }
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: next, updated_at: now } : r)),
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">平台销售线索</h1>
          <p className="mt-1 text-sm text-gray-600">
            仅供 ClearStrata 内部运营使用
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
        >
          <RefreshCcw className="h-4 w-4" />
          刷新
        </button>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs font-semibold text-gray-600">状态</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">全部</option>
              <option value="new">new</option>
              <option value="contacted">contacted</option>
              <option value="qualified">qualified</option>
              <option value="won">won</option>
              <option value="lost">lost</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">方案</label>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value as any)}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">全部</option>
              <option value="starter">starter</option>
              <option value="standard">standard</option>
              <option value="pro">pro</option>
              <option value="unknown">unknown</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">来源</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">搜索</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="物业 / 联系人 / 邮箱"
                className="w-full text-sm outline-none"
              />
            </div>
          </div>
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

      <div className="overflow-x-auto rounded-3xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-[1100px] w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr className="text-left text-xs font-semibold text-gray-600">
              <th className="px-4 py-3">提交时间</th>
              <th className="px-4 py-3">物业</th>
              <th className="px-4 py-3">联系人</th>
              <th className="px-4 py-3">邮箱</th>
              <th className="px-4 py-3">电话</th>
              <th className="px-4 py-3">方案</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">紧迫度</th>
              <th className="px-4 py-3">试用快照</th>
              <th className="px-4 py-3">来源</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((r) => {
              const propName = (r.property_name ?? r.building ?? '').trim() || '—';
              const pr = priorityFromTrialEnd(r.trial_ends_at_snapshot ?? null);
              const st = statusLabel(r.status);
              const plan = planLabel(r.selected_plan);
              const snap = String(r.subscription_status_snapshot ?? '').trim() || '—';
              const trialEnd = r.trial_ends_at_snapshot ? fmtTime(r.trial_ends_at_snapshot) : '—';
              return (
                <tr key={r.id} className="text-sm text-gray-800">
                  <td className="px-4 py-3 text-xs text-gray-600">{fmtTime(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-gray-900" title={propName}>
                        {propName}
                      </div>
                      {r.property_id ? (
                        <div className="text-[11px] text-gray-500">pid: {String(r.property_id).slice(0, 8)}…</div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">{r.email}</td>
                  <td className="px-4 py-3">{r.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={badgeClass(plan === 'Standard' ? 'green' : 'gray')}>{plan}</span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={st as any}
                      onChange={(e) => void updateStatus(r.id, e.target.value as LeadStatus)}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs"
                    >
                      <option value="new">new</option>
                      <option value="contacted">contacted</option>
                      <option value="qualified">qualified</option>
                      <option value="won">won</option>
                      <option value="lost">lost</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={badgeClass(pr.kind)}>{pr.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="text-xs text-gray-700">
                        {snap}
                      </div>
                      <div className="text-[11px] text-gray-500">ends: {trialEnd}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{String(r.source ?? '—')}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(r.email).catch(() => {})}
                      className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-50"
                    >
                      复制邮箱
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-sm text-gray-500" colSpan={11}>
                  暂无线索
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

