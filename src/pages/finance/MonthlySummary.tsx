import { useState, useEffect, useCallback } from 'react';
import { FileText, Eye, Send, Loader2, RefreshCw, CheckCircle, Clock, DollarSign, Scale } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Summary {
  id: string;
  month: string;
  total_income: number;
  total_expenses: number;
  net_balance: number;
  summary_text_en: string | null;
  summary_text_zh: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
}

export function MonthlySummary() {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);

  const canManage = profile?.role === 'council' || profile?.role === 'admin';
  const l = language === 'en';

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth()); // 0-11

  const [snapshot, setSnapshot] = useState<{
    income: number;
    expenses: number;
    balance: number;
    pending_review: number;
    approved: number;
    paid: number;
    anomaly: number;
  } | null>(null);

  const loadMonthSnapshot = useCallback(async () => {
    const monthStart = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
    const monthEnd = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];
    const [{ data: payments }, { data: invs }] = await Promise.all([
      supabase
        .from('ledger_transactions')
        .select('payment_amount')
        .gte('transaction_date', monthStart)
        .lte('transaction_date', monthEnd),
      supabase.from('invoices').select('total_amount, status').gte('invoice_date', monthStart).lte('invoice_date', monthEnd),
    ]);
    const income = (payments || []).reduce((s, t) => s + Number(t.payment_amount || 0), 0);
    const list = invs || [];
    const expenses = list
      .filter((i) => ['approved', 'paid'].includes(i.status))
      .reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const balance = income - expenses;
    const pending_review = list.filter((i) => i.status === 'pending_review').length;
    const approved = list.filter((i) => i.status === 'approved').length;
    const paid = list.filter((i) => i.status === 'paid').length;
    const anomaly = list.filter((i) => i.status === 'flagged' || i.status === 'rejected').length;
    setSnapshot({ income, expenses, balance, pending_review, approved, paid, anomaly });
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    void loadSummaries();
  }, []);

  useEffect(() => {
    void loadMonthSnapshot();
  }, [loadMonthSnapshot]);

  const loadSummaries = async () => {
    setLoading(true);
    let q = supabase
      .from('monthly_summaries')
      .select('*')
      .order('month', { ascending: false });
    // Owners/readonly users should only see published summaries
    if (!canManage) q = q.eq('published', true);
    const { data } = await q;
    setSummaries(data || []);
    setLoading(false);
  };

  const generateSummary = async () => {
    if (!profile) return;
    setGenerating(true);

    try {
      const monthDate = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];

      const monthStart = monthDate;
      const monthEnd = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];

      const [{ data: payments }, { data: invoices }] = await Promise.all([
        supabase
          .from('ledger_transactions')
          .select('payment_amount, charge_amount')
          .gte('transaction_date', monthStart)
          .lte('transaction_date', monthEnd),
        supabase
          .from('invoices')
          .select('total_amount, vendor_name, category, status')
          .gte('invoice_date', monthStart)
          .lte('invoice_date', monthEnd)
          .in('status', ['approved', 'paid']),
      ]);

      const totalIncome = (payments || []).reduce((sum, t) => sum + Number(t.payment_amount || 0), 0);
      const totalCharges = (payments || []).reduce((sum, t) => sum + Number(t.charge_amount || 0), 0);
      const totalExpenses = (invoices || []).reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
      const netBalance = totalIncome - totalExpenses;

      const expensesByCategory: Record<string, number> = {};
      (invoices || []).forEach((inv) => {
        const cat = inv.category || 'general';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Number(inv.total_amount || 0);
      });

      const monthForLabel = new Date(selectedYear, selectedMonth, 1);
      const monthName = monthForLabel.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      const monthNameZh = `${selectedYear}年${selectedMonth + 1}月`;

      const summaryEn = buildSummaryText(
        'en',
        monthName,
        totalIncome,
        totalCharges,
        totalExpenses,
        netBalance,
        expensesByCategory,
        (invoices || []).length,
        (payments || []).length
      );

      const summaryZh = buildSummaryText(
        'zh',
        monthNameZh,
        totalIncome,
        totalCharges,
        totalExpenses,
        netBalance,
        expensesByCategory,
        (invoices || []).length,
        (payments || []).length
      );

      const { data: existing } = await supabase
        .from('monthly_summaries')
        .select('id')
        .eq('month', monthDate)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('monthly_summaries')
          .update({
            total_income: totalIncome,
            total_expenses: totalExpenses,
            net_balance: netBalance,
            summary_text_en: summaryEn,
            summary_text_zh: summaryZh,
            generated_by: profile.id,
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('monthly_summaries').insert({
          month: monthDate,
          total_income: totalIncome,
          total_expenses: totalExpenses,
          net_balance: netBalance,
          summary_text_en: summaryEn,
          summary_text_zh: summaryZh,
          generated_by: profile.id,
        });
      }

      await loadSummaries();
      await loadMonthSnapshot();
    } catch (err) {
      console.error('Error generating summary:', err);
      alert(l ? 'Failed to generate summary.' : '生成摘要失败。');
    } finally {
      setGenerating(false);
    }
  };

  const publishSummary = async (id: string) => {
    if (!profile) return;
    await supabase
      .from('monthly_summaries')
      .update({
        published: true,
        published_by: profile.id,
        published_at: new Date().toISOString(),
      })
      .eq('id', id);
    await loadSummaries();
    await loadMonthSnapshot();
    if (selectedSummary?.id === id) {
      setSelectedSummary(null);
    }
  };

  const unpublishSummary = async (id: string) => {
    if (!profile) return;
    await supabase
      .from('monthly_summaries')
      .update({
        published: false,
        published_by: null,
        published_at: null,
      })
      .eq('id', id);
    await loadSummaries();
    await loadMonthSnapshot();
    if (selectedSummary?.id === id) {
      setSelectedSummary(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-[#1D9E75]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedSummary(null);
                setSelectedMonth((m) => {
                  if (m === 0) {
                    setSelectedYear((y) => y - 1);
                    return 11;
                  }
                  return m - 1;
                });
              }}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
            >
              {l ? 'Prev' : '上一月'}
            </button>
            <div className="text-sm font-semibold text-gray-900">
              {formatMonth(new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0], language)}
            </div>
            <button
              onClick={() => {
                setSelectedSummary(null);
                setSelectedMonth((m) => {
                  if (m === 11) {
                    setSelectedYear((y) => y + 1);
                    return 0;
                  }
                  return m + 1;
                });
              }}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
            >
              {l ? 'Next' : '下一月'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{l ? 'Year' : '年份'}</span>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedSummary(null);
                setSelectedYear(Number(e.target.value));
              }}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white"
            >
              {Array.from({ length: 9 }, (_, i) => now.getFullYear() - 5 + i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {snapshot && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 border-l-4 border-l-green-500">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <DollarSign size={14} className="text-green-600" />
              {l ? 'Month income' : '本月收入'}
            </div>
            <div className="text-xl font-bold text-gray-900">${snapshot.income.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 border-l-4 border-l-red-500">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <DollarSign size={14} className="text-red-500" />
              {l ? 'Month expenses' : '本月支出'}
            </div>
            <div className="text-xl font-bold text-gray-900">${snapshot.expenses.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Scale size={14} className="text-blue-500" />
              {l ? 'Balance' : '结余'}
            </div>
            <div
              className={`text-xl font-bold ${snapshot.balance >= 0 ? 'text-blue-700' : 'text-orange-600'}`}
            >
              ${snapshot.balance.toFixed(2)}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 col-span-2 lg:col-span-1">
            <div className="text-xs text-gray-500 mb-2">{l ? 'Invoice counts' : '发票状态数量'}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:text-sm">
              <span className="text-blue-700 font-medium">
                {l ? 'Pending' : '待审核'}: {snapshot.pending_review}
              </span>
              <span className="text-green-700 font-medium">
                {l ? 'Approved' : '已批准'}: {snapshot.approved}
              </span>
              <span className="text-cyan-700 font-medium">
                {l ? 'Paid' : '已付款'}: {snapshot.paid}
              </span>
              <span className="text-red-700 font-medium">
                {l ? 'Exception' : '异常'}: {snapshot.anomaly}
              </span>
            </div>
          </div>
        </div>
      )}

      {canManage && (
        <div className="bg-gradient-to-r from-[#1D9E75] to-[#178a66] rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold mb-1">
                {l ? 'Monthly Financial Summary' : '月度财务摘要'}
              </h3>
              <p className="text-green-100 text-sm">
                {l
                  ? 'Generate a plain-language summary of this month\'s income and expenses. Review and publish for all owners to see.'
                  : '自动生成本月收支报告，用通俗语言描述。审核确认后发布给所有业主查看。'}
              </p>
            </div>
            <button
              onClick={generateSummary}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#1D9E75] rounded-lg hover:bg-green-50 transition-colors font-medium disabled:opacity-50"
            >
              {generating ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <RefreshCw size={18} />
              )}
              {generating ? (l ? 'Generating...' : '生成中...') : (l ? 'Generate Selected Month' : '生成所选月份报告')}
            </button>
          </div>
        </div>
      )}

      {summaries.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <FileText size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">
            {l ? 'No financial summaries yet' : '暂无财务摘要'}
          </p>
          {canManage && (
            <p className="text-sm text-gray-400 mt-2">
              {l
                ? 'Click "Generate This Month" to create the first summary'
                : '点击"生成本月报告"创建第一份摘要'}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {summaries.map((summary) => (
            <div key={summary.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {formatMonth(summary.month, language)}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {summary.published ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          <CheckCircle size={12} />
                          {l ? 'Published' : '已发布'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                          <Clock size={12} />
                          {l ? 'Draft' : '草稿'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedSummary(summary)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-[#1D9E75] hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <Eye size={16} />
                      {l ? 'View' : '查看'}
                    </button>
                    {canManage && summary.published && (
                      <button
                        onClick={() => unpublishSummary(summary.id)}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-white/80 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {l ? 'Unpublish' : '撤回发布'}
                      </button>
                    )}
                    {canManage && !summary.published && (
                      <button
                        onClick={() => publishSummary(summary.id)}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-[#1D9E75] text-white rounded-lg hover:bg-[#178a66] transition-colors"
                      >
                        <Send size={16} />
                        {l ? 'Publish' : '发布'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-xs text-gray-500 mb-1">{l ? 'Income' : '收入'}</div>
                    <div className="text-xl font-bold text-green-700">
                      ${Number(summary.total_income).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="text-xs text-gray-500 mb-1">{l ? 'Expenses' : '支出'}</div>
                    <div className="text-xl font-bold text-red-700">
                      ${Number(summary.total_expenses).toFixed(2)}
                    </div>
                  </div>
                  <div className={`rounded-lg p-4 ${Number(summary.net_balance) >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                    <div className="text-xs text-gray-500 mb-1">{l ? 'Net Balance' : '净余额'}</div>
                    <div className={`text-xl font-bold ${Number(summary.net_balance) >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                      ${Number(summary.net_balance).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedSummary && (
        <SummaryDetailModal
          summary={selectedSummary}
          language={language}
          onClose={() => setSelectedSummary(null)}
        />
      )}
    </div>
  );
}

function SummaryDetailModal({
  summary,
  language,
  onClose,
}: {
  summary: Summary;
  language: string;
  onClose: () => void;
}) {
  const l = language === 'en';
  const text = l ? summary.summary_text_en : (summary.summary_text_zh || summary.summary_text_en);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {formatMonth(summary.month, language)} - {l ? 'Financial Summary' : '财务摘要'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">{l ? 'Income' : '收入'}</div>
              <div className="text-2xl font-bold text-green-700">${Number(summary.total_income).toFixed(2)}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">{l ? 'Expenses' : '支出'}</div>
              <div className="text-2xl font-bold text-red-700">${Number(summary.total_expenses).toFixed(2)}</div>
            </div>
            <div className={`rounded-lg p-4 text-center ${Number(summary.net_balance) >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
              <div className="text-xs text-gray-500 mb-1">{l ? 'Net' : '净额'}</div>
              <div className={`text-2xl font-bold ${Number(summary.net_balance) >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                ${Number(summary.net_balance).toFixed(2)}
              </div>
            </div>
          </div>

          {text && (
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-3">{l ? 'Summary Report' : '摘要报告'}</h3>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                {text}
              </div>
            </div>
          )}

          {summary.published_at && (
            <div className="text-xs text-gray-400 text-right">
              {l ? 'Published:' : '发布时间：'} {new Date(summary.published_at).toLocaleString(l ? 'en-CA' : 'zh-CN')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatMonth(dateStr: string, language: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  if (language === 'en') {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function buildSummaryText(
  lang: string,
  monthName: string,
  income: number,
  charges: number,
  expenses: number,
  net: number,
  expensesByCategory: Record<string, number>,
  invoiceCount: number,
  transactionCount: number
): string {
  const categoryNames: Record<string, Record<string, string>> = {
    en: {
      general: 'General', maintenance: 'Maintenance', utilities: 'Utilities',
      insurance: 'Insurance', professional_services: 'Professional Services',
      cleaning: 'Cleaning', landscaping: 'Landscaping', security: 'Security',
      elevator: 'Elevator', plumbing: 'Plumbing', electrical: 'Electrical',
    },
    zh: {
      general: '一般费用', maintenance: '维修', utilities: '水电费',
      insurance: '保险', professional_services: '专业服务',
      cleaning: '清洁', landscaping: '绿化', security: '安保',
      elevator: '电梯', plumbing: '管道', electrical: '电气',
    },
  };

  const cats = Object.entries(expensesByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => {
      const name = categoryNames[lang]?.[cat] || cat;
      return `  - ${name}: $${amt.toFixed(2)}`;
    })
    .join('\n');

  if (lang === 'zh') {
    return `${monthName}财务摘要\n\n` +
      `本月共收到物业费缴款 $${income.toFixed(2)}，` +
      `共产生物业费账单 $${charges.toFixed(2)}。\n\n` +
      `本月共处理 ${invoiceCount} 张供应商发票，支出总计 $${expenses.toFixed(2)}。\n` +
      (cats ? `\n支出分类明细：\n${cats}\n` : '') +
      `\n本月净余额为 $${net.toFixed(2)}${net >= 0 ? '（盈余）' : '（亏损）'}。\n\n` +
      `共处理 ${transactionCount} 笔交易记录。`;
  }

  return `Financial Summary for ${monthName}\n\n` +
    `Total strata fee payments received: $${income.toFixed(2)}\n` +
    `Total strata fee charges billed: $${charges.toFixed(2)}\n\n` +
    `${invoiceCount} vendor invoice(s) processed, totaling $${expenses.toFixed(2)} in expenses.\n` +
    (cats ? `\nExpense breakdown by category:\n${cats}\n` : '') +
    `\nNet balance for the month: $${net.toFixed(2)} (${net >= 0 ? 'surplus' : 'deficit'}).\n\n` +
    `${transactionCount} total transaction(s) recorded.`;
}
