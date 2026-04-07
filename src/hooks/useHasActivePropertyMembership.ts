import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Authoritative check: at least one property_members row with status = active.
 * Returns null while resolving (caller should show loading when session && propertyReady).
 */
export function useHasActivePropertyMembership(
  userId: string | undefined,
  propertyReady: boolean
): boolean | null {
  const [hasActive, setHasActive] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) {
      setHasActive(null);
      return;
    }
    if (!propertyReady) {
      setHasActive(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      const { count, error } = await supabase
        .from('property_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (cancelled) return;
      setHasActive(!error && (count ?? 0) > 0);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, propertyReady]);

  return hasActive;
}
