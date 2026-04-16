import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  APP_MODE_STORAGE_KEY,
  GUEST_PROPERTY_CODE_STORAGE_KEY,
  GUEST_PROPERTY_NAME_STORAGE_KEY,
  GUEST_PROPERTY_STORAGE_KEY,
} from '../contexts/PropertyContext';
import { MARKETING_DEMO_PROPERTY_CODE, realPropertyJoinPath } from '@/lib/propertyEntryRoutes';

type Row = { id: string; name: string; property_code: string | null };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isMarketingDemoCode(raw: string): boolean {
  return raw.trim().toLowerCase() === MARKETING_DEMO_PROPERTY_CODE.trim().toLowerCase();
}

/** 部署时可配置：RPC 未命中时仍打开 `/demo-home`（须为真实 demo 物业 UUID） */
function readConfiguredDemoPropertyRow(): Row | null {
  const id = import.meta.env.VITE_PUBLIC_DEMO_PROPERTY_ID as string | undefined;
  if (!id || !UUID_RE.test(id.trim())) return null;
  const name = (import.meta.env.VITE_PUBLIC_DEMO_PROPERTY_NAME as string | undefined)?.trim() || 'ClearStrata Demo';
  return {
    id: id.trim(),
    name,
    property_code: MARKETING_DEMO_PROPERTY_CODE,
  };
}

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

      let row: Row | null = null;
      if (!error) {
        const rows = (data ?? []) as Row[];
        row = rows[0] ?? null;
      } else {
        console.error('resolve_public_demo_property', error);
      }

      if (!row?.id && isMarketingDemoCode(raw)) {
        row = readConfiguredDemoPropertyRow();
      }

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
    const code = propertyCode?.trim() || '';
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <p className="text-sm font-medium text-gray-800" role="status">
          未找到该代号对应的演示样板
        </p>
        <p className="mt-2 max-w-md text-xs text-gray-600">
          演示入口仅用于产品展示。若你是某真实物业成员，请使用
          {code ? (
            <>
              {' '}
              <Link to={realPropertyJoinPath(code)} className="font-semibold text-[#1D9E75] underline">
                真实物业入口
              </Link>
            </>
          ) : null}
          ，勿与 Demo 混淆。
        </p>
        <div className="mt-6 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:justify-center">
          <Link to="/" className="font-semibold text-gray-700 underline">
            返回首页
          </Link>
          <Link to="/onboarding/create-property" className="font-semibold text-[#1D9E75] underline">
            创建物业
          </Link>
          <Link to="/demo-property" className="font-semibold text-[#1D9E75] underline">
            纯前端演示楼（无需数据库）
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1D9E75] border-t-transparent" />
    </div>
  );
}
