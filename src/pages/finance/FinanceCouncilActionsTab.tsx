import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useProperty } from '../../contexts/PropertyContext';
import { CouncilActionCenterPanel } from '../../components/finance/CouncilActionCenterPanel';
import { supabase } from '../../lib/supabase';
import { canManageInvoiceReview } from '../../lib/financePermissions';

const YEARS_BACK = 3;
const YEARS_FORWARD = 2;

export function FinanceCouncilActionsTab() {
  const { language } = useLanguage();
  const en = language === 'en';
  const { profile } = useAuth();
  const { currentPropertyId, roleInProperty } = useProperty();
  const canManage = canManageInvoiceReview(roleInProperty);
  const [searchParams] = useSearchParams();

  const anchorYear = new Date().getFullYear();
  const fiscalYear = useMemo(() => {
    const yearFromUrl = Number(searchParams.get('year'));
    return Number.isFinite(yearFromUrl) &&
      yearFromUrl >= anchorYear - YEARS_BACK &&
      yearFromUrl <= anchorYear + YEARS_FORWARD
      ? yearFromUrl
      : anchorYear;
  }, [searchParams, anchorYear]);

  const [staffType, setStaffType] = useState<string | null>(null);

  useEffect(() => {
    if (!currentPropertyId || !profile?.id) {
      setStaffType(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('property_members')
        .select('staff_type')
        .eq('property_id', currentPropertyId)
        .eq('user_id', profile.id)
        .eq('status', 'active')
        .maybeSingle();
      if (cancelled) return;
      const st = (data as { staff_type?: string | null } | null)?.staff_type;
      setStaffType(st != null ? String(st) : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPropertyId, profile?.id]);

  if (!currentPropertyId) {
    return (
      <p className="text-sm text-gray-500">
        {en ? 'Select a property to view the Council Action Center.' : '请先选择物业以查看业委会行动中心。'}
      </p>
    );
  }

  return (
    <CouncilActionCenterPanel
      propertyId={currentPropertyId}
      fiscalYear={fiscalYear}
      en={en}
      canManage={canManage}
      roleInProperty={roleInProperty}
      staffType={staffType}
    />
  );
}
