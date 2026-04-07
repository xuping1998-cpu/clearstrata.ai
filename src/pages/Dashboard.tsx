import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Vote, DollarSign, Users, Scale, FileText, ClipboardList } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useProperty } from '../contexts/PropertyContext';
import { canReviewJoinRequestsFromContext } from '../lib/propertyPermissions';
import { supabase } from '../lib/supabase';
import { BudgetDashboardSection } from '../components/budget/BudgetDashboardSection';
import { DashboardAbnormalInvoicesCard } from '../components/DashboardAbnormalInvoicesCard';
import { DashboardPromoCard } from '../components/DashboardPromoCard';
import { DashboardRedAlertInvoicesCard } from '../components/DashboardRedAlertInvoicesCard';

export function Dashboard() {
  const navigate = useNavigate();
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

  const modules = [
    { path: '/procurement', icon: ShoppingCart, label: t('nav_procurement'), color: 'bg-blue-500' },
    { path: '/voting', icon: Vote, label: t('nav_voting'), color: 'bg-purple-500' },
    { path: '/finance', icon: DollarSign, label: t('nav_finance'), color: 'bg-green-500' },
    { path: '/owner-info', icon: Users, label: t('nav_owner_info'), color: 'bg-cyan-500' },
    { path: '/manager-tasks?task_type=dispute', icon: Scale, label: t('nav_disputes'), color: 'bg-red-500' },
    { path: '/compliance', icon: FileText, label: t('nav_help_compliance'), color: 'bg-indigo-500' },
  ] as Array<{
    path: string;
    icon: typeof ShoppingCart;
    label: string;
    color: string;
  }>;

  return (
    <div className="w-full max-w-6xl mx-auto pt-0">
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

      <DashboardAbnormalInvoicesCard />

      <DashboardRedAlertInvoicesCard />

      <DashboardPromoCard />

      {/* 3×2 grid: row1 采购/会议/财务, row2 业主/纠纷/法规; sm 2 列, md+ 3 列 */}
      <div className="w-full max-w-5xl mx-auto mt-0.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 [grid-auto-rows:1fr]">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.path}
                type="button"
                onClick={() => navigate(module.path)}
                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1 group h-full min-h-[128px] w-full text-left flex flex-col"
              >
                <div
                  className={`${module.color} w-12 h-12 shrink-0 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
                >
                  <Icon className="text-white" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 leading-snug">{module.label}</h3>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
