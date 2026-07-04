import { useCallback, useEffect, useState } from 'react';
import type { ImportantUpdatesBullet } from '@/components/dashboard/ImportantUpdatesDashboardCard';
import {
  daysUntilIso,
  formatOpenUntil,
  governanceMatterDeliberationType,
  governanceMatterDetailUrl,
} from '@/lib/community/governanceMatterModel';
import { fetchGovernanceMattersForDashboard } from '@/features/governance-matters/governanceMattersApi';

export function mapGovernanceMatterToBullet(
  row: Awaited<ReturnType<typeof fetchGovernanceMattersForDashboard>>[number],
  langEn: boolean,
): ImportantUpdatesBullet {
  const contentType = governanceMatterDeliberationType(row.status);
  const remainingDays = daysUntilIso(row.discussion_deadline);

  return {
    id: `governance-matter-${row.id}`,
    text: row.title,
    contentType,
    actionUrl: governanceMatterDetailUrl(row.id, row.property_id),
    createdAt: row.last_revision_at,
    commentCount: row.comment_count,
    remainingDays: remainingDays ?? undefined,
    openUntil: contentType === 'consultation' ? formatOpenUntil(row.discussion_deadline, langEn) : undefined,
    priority: 120,
  };
}

export type UseGovernanceMatterDashboardParams = {
  propertyId: string | null | undefined;
  propertyReady: boolean;
  langEn: boolean;
};

export function useGovernanceMatterDashboard({
  propertyId,
  propertyReady,
  langEn,
}: UseGovernanceMatterDashboardParams) {
  const [bullets, setBullets] = useState<ImportantUpdatesBullet[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasRealMatters, setHasRealMatters] = useState(false);

  const load = useCallback(async () => {
    if (!propertyReady || !propertyId?.trim()) {
      setBullets([]);
      setHasRealMatters(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const rows = await fetchGovernanceMattersForDashboard(propertyId.trim());
      setHasRealMatters(rows.length > 0);
      setBullets(rows.map((row) => mapGovernanceMatterToBullet(row, langEn)));
    } catch (e) {
      console.error('[useGovernanceMatterDashboard]', e);
      setBullets([]);
      setHasRealMatters(false);
    } finally {
      setLoading(false);
    }
  }, [propertyId, propertyReady, langEn]);

  useEffect(() => {
    void load();
  }, [load]);

  return { bullets, loading, hasRealMatters, reload: load };
}
