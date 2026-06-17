import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useProperty } from '../contexts/PropertyContext';
import { fetchPendingExplanationAlert } from '../features/finance/bankTransactionExplanations';

export function DashboardFinancialAlertsCard() {
  const { language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId } = useProperty();

  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    if (!currentPropertyId) {
      setLoading(false);
      setCount(0);
      setTotalAmount(0);
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      const alert = await fetchPendingExplanationAlert(currentPropertyId);
      if (cancelled) return;
      setCount(alert.count);
      setTotalAmount(alert.totalAmount);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentPropertyId]);

  if (!currentPropertyId || loading) {
    if (!currentPropertyId) return null;
    return (
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">
        <Loader2 size={18} className="animate-spin" />
        {en ? 'Loading financial alerts…' : '加载财务提醒…'}
      </div>
    );
  }

  if (count === 0) return null;

  return (
    <Link
      to="/finance?tab=bank&filter=explanations"
      className="mb-4 block rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm transition hover:bg-amber-100/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-700" size={22} />
          <div>
            <h3 className="text-sm font-semibold text-amber-950">
              {en ? 'Financial Alerts' : '财务提醒'}
            </h3>
            <p className="mt-1 text-sm text-amber-900">
              {en
                ? `${count} payment${count === 1 ? '' : 's'} awaiting manager explanation.`
                : `存在 ${count} 笔待物业经理解释支出。`}
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-amber-950">
              ${totalAmount.toFixed(2)}
            </p>
          </div>
        </div>
        <ChevronRight className="shrink-0 text-amber-700" size={20} />
      </div>
    </Link>
  );
}
