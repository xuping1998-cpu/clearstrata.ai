import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { JoinCodeScanPage } from '@/pages/join/JoinCodeScanPage';
import { JoinPropertyPage, type JoinPropertyResolved } from '@/pages/JoinPropertyPage';

/**
 * `/join/:code` 分流：
 * 1. 先按「真实物业代号」解析（resolve_property_for_join_request，公开加入开关内的物业）
 * 2. 若未命中，再交给邀请码扫码页（resolve_public_invite_code 等）
 *
 * 因此 `/join/BCS3736` 可与演示路由 `/demo/BCS3736` 并存：前者走真实物业入口，后者走演示样板。
 */
export function JoinRouteSplit() {
  const { code: raw } = useParams<{ code: string }>();
  const code = raw?.trim() ?? '';

  const [phase, setPhase] = useState<'loading' | 'property' | 'invite'>('loading');
  const [property, setProperty] = useState<JoinPropertyResolved | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!code) {
      setProperty(null);
      setPhase('invite');
      return;
    }

    setPhase('loading');
    setProperty(null);

    void (async () => {
      try {
        const { data, error } = await supabase.rpc('resolve_property_for_join_request', { p_code: code });
        if (cancelled) return;
        if (error) {
          console.warn('[JoinRouteSplit] resolve_property_for_join_request', error);
          setPhase('invite');
          return;
        }
        const rows = Array.isArray(data) ? data : data != null ? [data] : [];
        const row = rows[0] as Record<string, unknown> | undefined;
        const id = row?.id != null ? String(row.id) : '';
        if (id) {
          setProperty({
            id,
            name: typeof row?.name === 'string' ? row.name : '',
            slug: row?.slug != null ? String(row.slug) : null,
            property_code: row?.property_code != null ? String(row.property_code) : null,
          });
          setPhase('property');
        } else {
          setPhase('invite');
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('[JoinRouteSplit] resolve exception', e);
          setPhase('invite');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (phase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1D9E75] border-t-transparent" />
      </div>
    );
  }

  if (phase === 'property' && property) {
    return <JoinPropertyPage resolved={property} codeParam={code} />;
  }

  return <JoinCodeScanPage />;
}
