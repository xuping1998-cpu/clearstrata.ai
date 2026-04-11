import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useProperty } from '../contexts/PropertyContext';
import { canReviewJoinRequestsFromContext } from '../lib/propertyPermissions';
import { supabase } from '../lib/supabase';
import HomeBudgetPanel from '@/components/dashboard/HomeBudgetPanel';

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

  return <HomeBudgetPanel />;
}
