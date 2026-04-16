import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Layout } from './Layout';
import {
  APP_MODE_STORAGE_KEY,
  GUEST_PROPERTY_CODE_STORAGE_KEY,
  GUEST_PROPERTY_NAME_STORAGE_KEY,
  GUEST_PROPERTY_STORAGE_KEY,
  readDemoLocalState,
} from '../contexts/PropertyContext';
import { demoEntryPath, MARKETING_DEMO_PROPERTY_CODE } from '@/lib/propertyEntryRoutes';
import { supabase } from '@/lib/supabase';

/**
 * Unauthenticated demo shell: requires appMode=demo + guestPropertyId in localStorage.
 */
export function DemoDashboardRoute({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { propertyCode } = useParams<{ propertyCode?: string }>();
  const [allowed, setAllowed] = useState(() => Boolean(readDemoLocalState()));

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const d = readDemoLocalState();
      if (d) {
        if (!cancelled) setAllowed(true);
        return;
      }

      const raw = propertyCode?.trim();
      if (raw) {
        const { data, error } = await supabase.rpc('resolve_public_demo_property', { p_code: raw });
        if (cancelled) return;
        if (!error) {
          const rows = (data ?? []) as Array<{ id: string; name: string; property_code: string | null }>;
          const row = rows[0];
          if (row?.id) {
            try {
              localStorage.setItem(GUEST_PROPERTY_STORAGE_KEY, String(row.id));
              localStorage.setItem(GUEST_PROPERTY_CODE_STORAGE_KEY, raw);
              localStorage.setItem(APP_MODE_STORAGE_KEY, 'demo');
              localStorage.setItem(GUEST_PROPERTY_NAME_STORAGE_KEY, row.name);
            } catch {
              /* ignore */
            }
            setAllowed(true);
            return;
          }
        }

        navigate(demoEntryPath(raw), { replace: true });
        setAllowed(false);
        return;
      }

      navigate(demoEntryPath(MARKETING_DEMO_PROPERTY_CODE), { replace: true });
      setAllowed(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, location.pathname, location.key]);

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1D9E75] border-t-transparent" />
      </div>
    );
  }

  return <Layout>{children}</Layout>;
}
