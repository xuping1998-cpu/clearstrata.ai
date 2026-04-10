import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useProperty } from '../contexts/PropertyContext';
import { canReviewJoinRequestsFromContext } from '../lib/propertyPermissions';
import { supabase } from '../lib/supabase';
import { BudgetDashboardSection } from '../components/budget/BudgetDashboardSection';

export function Dashboard() {
  const { t, language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId, roleInProperty, memberships } = useProperty();
  const showJoinRequestBadge =
    !!currentPropertyId && canReviewJoinRequestsFromContext(roleInProperty, memberships);
  const [pendingJoinCount, setPendingJoinCount] = useState<number | null>(null);

  useEffect(() => {
    if (!showJoinRequestBadge || !currentPropertyId) {
      setPendingJoinCount(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { count, error } = await supabase
        .from('join_requests')
        .select('*', { count: 'exact', head: true })
        .eq('property_id', currentPropertyId)
        .eq('status', 'pending');
      if (!cancelled && !error) setPendingJoinCount(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [showJoinRequestBadge, currentPropertyId]);

  return (
    <div className="mx-auto w-full max-w-7xl pt-0">
      {showJoinRequestBadge && pendingJoinCount != null && pendingJoinCount > 0 && (
        <Link
          to="/admin/join-requests"
          className="mb-2 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-amber-950 shadow-sm hover:bg-amber-100/80 transition-colors"
        >
          <ClipboardList className="shrink-0 text-amber-800" size={22} aria-hidden />
          <span className="text-sm font-medium">
            {en
              ? `${pendingJoinCount} pending join request${pendingJoinCount === 1 ? '' : 's'} — review`
              : `待审核加入申请 ${pendingJoinCount} 条 — 去处理`}
          </span>
        </Link>
      )}

      <BudgetDashboardSection />
    </div>
  );
}
