import { useState, useEffect } from 'react';
import { Printer } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface LedgerTransaction {
  id: string;
  transaction_date: string;
  description: string;
  charge_amount: number;
  payment_amount: number;
  balance: number;
}

export function LedgerTab() {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (profile) loadLedger();
  }, [profile, dateRange]);

  const loadLedger = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('ledger_transactions')
      .select('*')
      .eq('user_id', profile.id)
      .gte('transaction_date', dateRange.start)
      .lte('transaction_date', dateRange.end)
      .order('transaction_date', { ascending: false });
    setTransactions(data || []);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">{language === 'en' ? 'Ledger' : '账户台账'}</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">{language === 'en' ? 'Date Range:' : '日期范围：'}</label>
            <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="px-3 py-1 border border-gray-300 rounded-lg text-sm" />
            <span className="text-gray-500">-</span>
            <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="px-3 py-1 border border-gray-300 rounded-lg text-sm" />
          </div>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-[#1D9E75] text-white rounded-lg hover:bg-[#178a66] transition-colors">
            <Printer size={18} />{language === 'en' ? 'Print' : '打印'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{language === 'en' ? 'Date' : '日期'}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{language === 'en' ? 'Description' : '描述'}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{language === 'en' ? 'Charges' : '费用'}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{language === 'en' ? 'Payments' : '付款'}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{language === 'en' ? 'Balance' : '余额'}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">{language === 'en' ? 'No transactions found' : '未找到交易记录'}</td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(t.transaction_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{t.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{t.charge_amount > 0 ? t.charge_amount.toFixed(2) : ''}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{t.payment_amount > 0 ? t.payment_amount.toFixed(2) : ''}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${t.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>{t.balance.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
