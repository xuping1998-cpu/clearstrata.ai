import { useState, useEffect, useMemo } from 'react';
import { DollarSign, AlertCircle, TrendingUp, Users, Plus, X, Loader2, PieChart as PieChartIcon } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useProperty } from '../../contexts/PropertyContext';
import { supabase } from '../../lib/supabase';

interface SpecialLevy {
  id: string;
  title_en: string;
  title_zh: string | null;
  description_en: string | null;
  description_zh: string | null;
  target_amount: number;
  collected_amount: number;
  due_date: string | null;
  status: string;
  created_at: string;
}

interface ArrearsOwner {
  user_id: string;
  full_name_en: string;
  full_name_zh?: string;
  unit_number?: string;
  balance: number;
}

export function RevenueDashboard() {
  const { language } = useLanguage();
  const { currentRole, currentPropertyId } = useProperty();
  const [loading, setLoading] = useState(true);
  const [levies, setLevies] = useState<SpecialLevy[]>([]);
  const [arrears, setArrears] = useState<ArrearsOwner[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [showLevyForm, setShowLevyForm] = useState(false);

  const isCouncil =
    currentRole === 'council' || currentRole === 'admin' || currentRole === 'property_admin';
  const l = language === 'en';

  const [invoiceRows, setInvoiceRows] = useState<
    { invoice_date: string; total_amount: number; status: string; category: string | null }[]
  >([]);
  const [ledgerRows, setLedgerRows] = useState<{ transaction_date: string; payment_amount: number | null }[]>([]);

  const loadChartsData = async () => {
    const start = new Date();
    start.setMonth(start.getMonth() - 11);
    start.setDate(1);
    const from = start.toISOString().split('T')[0];
    let invQ = supabase
      .from('invoices')
      .select('invoice_date, total_amount, status, category')
      .gte('invoice_date', from);
    let ledQ = supabase
      .from('ledger_transactions')
      .select('transaction_date, payment_amount')
      .gte('transaction_date', from);
    if (currentPropertyId) {
      invQ = invQ.eq('property_id', currentPropertyId);
      ledQ = ledQ.eq('property_id', currentPropertyId);
    }
    const [{ data: inv }, { data: led }] = await Promise.all([invQ, ledQ]);
    setInvoiceRows(inv || []);
    setLedgerRows(led || []);
  };

  const trendData = useMemo(() => {
    const keys: string[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const incomeByMonth = new Map<string, number>();
    const expenseByMonth = new Map<string, number>();
    ledgerRows.forEach((t) => {
      const k = t.transaction_date.slice(0, 7);
      incomeByMonth.set(k, (incomeByMonth.get(k) || 0) + Number(t.payment_amount || 0));
    });
    invoiceRows
      .filter((inv) => ['approved', 'paid'].includes(inv.status))
      .forEach((inv) => {
        const k = inv.invoice_date.slice(0, 7);
        expenseByMonth.set(k, (expenseByMonth.get(k) || 0) + Number(inv.total_amount || 0));
      });
    return keys.map((k) => {
      const [y, m] = k.split('-').map(Number);
      const label = new Date(y, m - 1, 1).toLocaleDateString(l ? 'en-CA' : 'zh-CN', {
        year: '2-digit',
        month: 'short',
      });
      return {
        key: k,
        monthLabel: label,
        income: Math.round((incomeByMonth.get(k) || 0) * 100) / 100,
        expense: Math.round((expenseByMonth.get(k) || 0) * 100) / 100,
      };
    });
  }, [ledgerRows, invoiceRows, l]);

  const categoryPieData = useMemo(() => {
    const catMap = new Map<string, number>();
    invoiceRows
      .filter((inv) => ['approved', 'paid'].includes(inv.status))
      .forEach((inv) => {
        const c = inv.category || 'general';
        catMap.set(c, (catMap.get(c) || 0) + Number(inv.total_amount || 0));
      });
    const COLORS = ['#1D9E75', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#64748b', '#ec4899', '#14b8a6'];
    return Array.from(catMap.entries())
      .map(([name, value], i) => ({ name, value: Math.round(value * 100) / 100, color: COLORS[i % COLORS.length] }))
      .filter((d) => d.value > 0);
  }, [invoiceRows]);

  const statusPieData = useMemo(() => {
    const m = new Map<string, number>();
    invoiceRows.forEach((inv) => {
      m.set(inv.status, (m.get(inv.status) || 0) + 1);
    });
    const colorMap: Record<string, string> = {
      pending_review: '#2563eb',
      approved: '#16a34a',
      paid: '#0891b2',
      flagged: '#dc2626',
      rejected: '#dc2626',
      ai_processing: '#94a3b8',
      pending_upload: '#94a3b8',
      ai_extraction_failed: '#ea580c',
    };
    return Array.from(m.entries()).map(([name, value]) => ({
      name,
      value,
      color: colorMap[name] || '#94a3b8',
    }));
  }, [invoiceRows]);

  const loadFinancials = async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    let payQ = supabase
      .from('ledger_transactions')
      .select('payment_amount, charge_amount, balance, user_id')
      .gte('transaction_date', monthStart)
      .lte('transaction_date', monthEnd);
    if (currentPropertyId) payQ = payQ.eq('property_id', currentPropertyId);
    const { data: payments } = await payQ;

    if (payments) {
      const income = payments.reduce((sum, t) => sum + Number(t.payment_amount || 0), 0);
      setMonthlyIncome(income);
    }

    let latestQ = supabase
      .from('ledger_transactions')
      .select('user_id, balance, transaction_date')
      .order('transaction_date', { ascending: false });
    if (currentPropertyId) latestQ = latestQ.eq('property_id', currentPropertyId);
    const { data: allLatest } = await latestQ;

    if (allLatest) {
      const latestByUser = new Map<string, number>();
      for (const t of allLatest) {
        if (!latestByUser.has(t.user_id)) {
          latestByUser.set(t.user_id, Number(t.balance));
        }
      }

      let collected = 0;
      let outstanding = 0;
      const arrearsUsers: string[] = [];

      latestByUser.forEach((balance, userId) => {
        if (balance <= 0) {
          collected += Math.abs(balance);
        } else {
          outstanding += balance;
          arrearsUsers.push(userId);
        }
      });

      setTotalCollected(collected);
      setTotalOutstanding(outstanding);

      const canSeeArrearsDetail =
        currentRole === 'council' ||
        currentRole === 'admin' ||
        currentRole === 'property_admin';
      if (arrearsUsers.length > 0 && canSeeArrearsDetail) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name_en, full_name_zh')
          .in('id', arrearsUsers);

        let oiQ = supabase
          .from('owner_info')
          .select('user_id, unit_number')
          .in('user_id', arrearsUsers);
        if (currentPropertyId) oiQ = oiQ.eq('property_id', currentPropertyId);
        const { data: ownerInfos } = await oiQ;

        const arrearsData: ArrearsOwner[] = arrearsUsers.map((uid) => {
          const p = profiles?.find((pr) => pr.id === uid);
          const oi = ownerInfos?.find((o) => o.user_id === uid);
          return {
            user_id: uid,
            full_name_en: p?.full_name_en || 'Unknown',
            full_name_zh: p?.full_name_zh,
            unit_number: oi?.unit_number,
            balance: latestByUser.get(uid) || 0,
          };
        });

        setArrears(arrearsData.sort((a, b) => b.balance - a.balance));
      }
    }
  };

  const loadLevies = async () => {
    let q = supabase.from('special_levies').select('*').order('created_at', { ascending: false });
    if (currentPropertyId) q = q.eq('property_id', currentPropertyId);
    const { data } = await q;
    setLevies(data || []);
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadFinancials(), loadLevies(), loadChartsData()]);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when tenant changes
  }, [currentPropertyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-[#1D9E75]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-[#1D9E75]">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <DollarSign size={20} className="text-[#1D9E75]" />
            </div>
            <span className="text-sm text-gray-600">{l ? 'This Month Income' : '本月收入'}</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">${monthlyIncome.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {l ? 'Strata fee payments received' : '已收到的物业费'}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp size={20} className="text-blue-500" />
            </div>
            <span className="text-sm text-gray-600">{l ? 'Total Collected' : '已收总额'}</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">${totalCollected.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {l ? 'Owners with credit balance' : '业主账户结余'}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-red-500">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertCircle size={20} className="text-red-500" />
            </div>
            <span className="text-sm text-gray-600">{l ? 'Outstanding' : '欠费总额'}</span>
          </div>
          <div className="text-3xl font-bold text-red-600">${totalOutstanding.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {l ? `${arrears.length} owner(s) overdue` : `${arrears.length} 位业主欠费`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-[#1D9E75]" />
            {l ? 'Monthly income vs expenses (12 mo)' : '月度收支趋势（近12月）'}
          </h3>
          <div className="h-64 sm:h-72 w-full min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v) => `$${Number(v ?? 0).toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="income" name={l ? 'Income' : '收入'} stroke="#1D9E75" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expense" name={l ? 'Expenses' : '支出'} stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <PieChartIcon size={20} className="text-[#1D9E75]" />
            {l ? 'Expense by category (approved/paid)' : '支出分类占比（已批准/已付款）'}
          </h3>
          <div className="h-64 sm:h-72 w-full min-h-[240px] flex items-center justify-center">
            {categoryPieData.length === 0 ? (
              <p className="text-sm text-gray-500">{l ? 'No data' : '暂无数据'}</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(props: { name?: string; percent?: number }) =>
                      `${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {categoryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `$${Number(v ?? 0).toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <PieChartIcon size={20} className="text-[#1D9E75]" />
          {l ? 'Invoice status distribution' : '发票状态分布'}
        </h3>
        <div className="h-56 sm:h-64 w-full min-h-[220px] flex items-center justify-center">
          {statusPieData.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">{l ? 'No invoices' : '暂无发票'}</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={88}
                  label={(props: { name?: string; percent?: number }) =>
                    `${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`st-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => String(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {isCouncil && arrears.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertCircle size={20} className="text-red-500" />
              {l ? 'Arrears List' : '欠费列表'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {l ? 'Owner' : '业主'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {l ? 'Unit' : '单元'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {l ? 'Outstanding' : '欠费金额'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {arrears.map((a) => (
                  <tr key={a.user_id} className="hover:bg-red-50/50">
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900">
                        {l ? a.full_name_en : (a.full_name_zh || a.full_name_en)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{a.unit_number || '-'}</td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-red-600">
                      ${a.balance.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users size={20} className="text-[#1D9E75]" />
            {l ? 'Special Levies' : '特别征收 (Special Levy)'}
          </h3>
          {isCouncil && (
            <button
              onClick={() => setShowLevyForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1D9E75] text-white rounded-lg hover:bg-[#178a66] transition-colors text-sm"
            >
              <Plus size={16} />
              {l ? 'New Levy' : '新建征收'}
            </button>
          )}
        </div>

        {levies.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <DollarSign size={40} className="mx-auto mb-3 text-gray-300" />
            <p>{l ? 'No special levies' : '暂无特别征收'}</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {levies.map((levy) => {
              const progress = levy.target_amount > 0
                ? Math.min((Number(levy.collected_amount) / Number(levy.target_amount)) * 100, 100)
                : 0;
              return (
                <div key={levy.id} className="border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-gray-900">
                        {l ? levy.title_en : (levy.title_zh || levy.title_en)}
                      </h4>
                      {(l ? levy.description_en : (levy.description_zh || levy.description_en)) && (
                        <p className="text-sm text-gray-600 mt-1">
                          {l ? levy.description_en : (levy.description_zh || levy.description_en)}
                        </p>
                      )}
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      levy.status === 'active'
                        ? 'bg-blue-100 text-blue-700'
                        : levy.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {levy.status === 'active' ? (l ? 'Active' : '进行中') :
                       levy.status === 'completed' ? (l ? 'Completed' : '已完成') :
                       (l ? 'Cancelled' : '已取消')}
                    </span>
                  </div>

                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">
                        ${Number(levy.collected_amount).toFixed(2)} / ${Number(levy.target_amount).toFixed(2)}
                      </span>
                      <span className="font-medium text-gray-900">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          progress >= 100 ? 'bg-[#1D9E75]' : 'bg-blue-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {levy.due_date && (
                    <div className="text-xs text-gray-500">
                      {l ? 'Due:' : '截止日期：'} {new Date(levy.due_date).toLocaleDateString(l ? 'en-CA' : 'zh-CN')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showLevyForm && (
        <LevyFormModal
          language={language}
          onClose={() => setShowLevyForm(false)}
          onCreated={() => { setShowLevyForm(false); loadLevies(); }}
        />
      )}
    </div>
  );
}

function LevyFormModal({
  language,
  onClose,
  onCreated,
}: {
  language: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const l = language === 'en';
  const { profile } = useAuth();
  const { currentPropertyId } = useProperty();
  const [form, setForm] = useState({
    title_en: '',
    title_zh: '',
    description_en: '',
    description_zh: '',
    target_amount: '',
    due_date: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);

    if (!currentPropertyId) {
      alert(l ? 'No property selected.' : '未选择物业。');
      setSubmitting(false);
      return;
    }
    const { error } = await supabase.from('special_levies').insert({
      property_id: currentPropertyId,
      title_en: form.title_en,
      title_zh: form.title_zh || null,
      description_en: form.description_en || null,
      description_zh: form.description_zh || null,
      target_amount: parseFloat(form.target_amount),
      due_date: form.due_date || null,
      created_by: profile.id,
    });

    if (error) {
      alert(l ? 'Failed to create levy.' : '创建征收失败。');
    } else {
      onCreated();
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {l ? 'New Special Levy' : '新建特别征收'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {l ? 'Title (English)' : '标题（英文）'} *
            </label>
            <input
              type="text"
              required
              value={form.title_en}
              onChange={(e) => setForm({ ...form, title_en: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {l ? 'Title (Chinese)' : '标题（中文）'}
            </label>
            <input
              type="text"
              value={form.title_zh}
              onChange={(e) => setForm({ ...form, title_zh: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {l ? 'Description (English)' : '描述（英文）'}
            </label>
            <textarea
              value={form.description_en}
              onChange={(e) => setForm({ ...form, description_en: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {l ? 'Description (Chinese)' : '描述（中文）'}
            </label>
            <textarea
              value={form.description_zh}
              onChange={(e) => setForm({ ...form, description_zh: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {l ? 'Target Amount ($)' : '目标金额 ($)'} *
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={form.target_amount}
                onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {l ? 'Due Date' : '截止日期'}
              </label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-[#1D9E75] text-white py-2.5 rounded-lg hover:bg-[#178a66] transition-colors disabled:opacity-50 font-medium"
            >
              {submitting ? (l ? 'Creating...' : '创建中...') : (l ? 'Create Levy' : '创建征收')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              {l ? 'Cancel' : '取消'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
