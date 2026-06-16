import { useState, useEffect, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useProperty } from '../../contexts/PropertyContext';
import { supabase } from '../../lib/supabase';
import { BankCsvImportDialog } from '../../components/finance/BankCsvImportDialog';

interface BankTransactionRow {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  balance: number | null;
  source_bank: string | null;
}

type Props = {
  canImport: boolean;
};

export function BankTransactionsTab({ canImport }: Props) {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const { currentPropertyId } = useProperty();
  const l = language === 'en';

  const [rows, setRows] = useState<BankTransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const loadTransactions = useCallback(async () => {
    if (!currentPropertyId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('bank_transactions')
      .select('id, transaction_date, description, amount, balance, source_bank')
      .eq('property_id', currentPropertyId)
      .gte('transaction_date', dateRange.start)
      .lte('transaction_date', dateRange.end)
      .order('transaction_date', { ascending: false });
    setRows((data as BankTransactionRow[]) ?? []);
    setLoading(false);
  }, [currentPropertyId, dateRange.start, dateRange.end]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  return (
    <div className="rounded-xl bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-200 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-600">{l ? 'Date range:' : '日期范围：'}</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-1 text-sm"
          />
          <span className="text-gray-500">–</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-1 text-sm"
          />
        </div>
        {canImport && (
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-medium text-white hover:bg-[#178a66]"
          >
            <Upload size={18} />
            {l ? 'Import bank CSV' : '导入银行流水'}
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {l ? 'Date' : '日期'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {l ? 'Description' : '描述'}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                {l ? 'Charges' : '费用'}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                {l ? 'Payments' : '付款'}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                {l ? 'Balance' : '余额'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                  {l ? 'Loading…' : '加载中…'}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  {l ? 'No bank transactions found' : '暂无银行流水记录'}
                </td>
              </tr>
            ) : (
              rows.map((t) => {
                const amt = Number(t.amount);
                const charge = amt < 0 ? Math.abs(amt) : 0;
                const payment = amt > 0 ? amt : 0;
                const bal = t.balance != null ? Number(t.balance) : null;
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {new Date(t.transaction_date + 'T12:00:00').toLocaleDateString(l ? 'en-CA' : 'zh-CN')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{t.description}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 tabular-nums">
                      {charge > 0 ? charge.toFixed(2) : ''}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 tabular-nums">
                      {payment > 0 ? payment.toFixed(2) : ''}
                    </td>
                    <td
                      className={`whitespace-nowrap px-6 py-4 text-right text-sm font-medium tabular-nums ${
                        bal != null && bal < 0 ? 'text-red-600' : 'text-gray-900'
                      }`}
                    >
                      {bal != null ? bal.toFixed(2) : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {canImport && profile && currentPropertyId && (
        <BankCsvImportDialog
          open={importOpen}
          propertyId={currentPropertyId}
          uploadedBy={profile.id}
          languageEn={l}
          onClose={() => setImportOpen(false)}
          onImported={() => void loadTransactions()}
        />
      )}
    </div>
  );
}
