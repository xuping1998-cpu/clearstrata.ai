import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  APP_MODE_STORAGE_KEY,
  GUEST_PROPERTY_CODE_STORAGE_KEY,
  GUEST_PROPERTY_NAME_STORAGE_KEY,
  GUEST_PROPERTY_STORAGE_KEY,
} from '../contexts/PropertyContext';

type Row = { id: string; name: string; property_code: string | null };

export function PropertyDemoEntry() {
  const { propertyCode } = useParams<{ propertyCode: string }>();
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const raw = propertyCode?.trim();
      if (!raw) {
        setNotFound(true);
        return;
      }

      const { data, error } = await supabase.rpc('resolve_public_demo_property', { p_code: raw });

      if (cancelled) return;

      if (error) {
        console.error('resolve_public_demo_property', error);
        setNotFound(true);
        return;
      }

      const rows = (data ?? []) as Row[];
      const row = rows[0];
      if (!row?.id) {
        setNotFound(true);
        return;
      }

      try {
        localStorage.setItem(GUEST_PROPERTY_STORAGE_KEY, row.id);
        localStorage.setItem(GUEST_PROPERTY_CODE_STORAGE_KEY, raw);
        localStorage.setItem(APP_MODE_STORAGE_KEY, 'demo');
        localStorage.setItem(GUEST_PROPERTY_NAME_STORAGE_KEY, row.name);
      } catch {
        /* ignore */
      }

      navigate('/demo-home', { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [propertyCode, navigate]);

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <p className="text-sm text-gray-700" role="status">
          未找到演示物业
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1D9E75] border-t-transparent" />
    </div>
  );
}
