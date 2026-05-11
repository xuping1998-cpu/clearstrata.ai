/** 侧栏底部：正式邀请二维码（与物业设置 → 邀请管理中「公开邀请码」扫码链接一致） */
import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { useProperty } from '../contexts/PropertyContext';
import { supabase } from '@/lib/supabase';

export type SidebarPromoCardProps = {
  language: 'en' | 'zh';
};

/** 与 `PropertyAdminInvites` 中公开码链接一致：`/entry?propertyId=&inviteCode=&source=qr&lang=` */
function publicInviteEntryUrl(origin: string, propertyId: string, code: string): string {
  const rawLang = typeof localStorage !== 'undefined' ? localStorage.getItem('language') || localStorage.getItem('i18nextLng') || 'zh' : 'zh';
  const lang = rawLang === 'en' ? 'en' : 'zh';
  const q = new URLSearchParams({
    propertyId,
    inviteCode: code,
    source: 'qr',
    lang,
  });
  return `${origin}/entry?${q.toString()}`;
}

type PublicCodeRow = {
  id: string;
  code: string;
  label: string;
  used_count: number;
  max_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
};

type InviteStatus = 'active' | 'disabled' | 'expired' | 'used_up';

function deriveStatus(row: {
  is_active: boolean;
  expires_at: string | null;
  used_count: number;
  max_uses: number;
}): InviteStatus {
  if (!row.is_active) return 'disabled';
  if (row.expires_at) {
    const t = new Date(row.expires_at).getTime();
    if (!Number.isNaN(t) && t < Date.now()) return 'expired';
  }
  if (row.max_uses > 0 && row.used_count >= row.max_uses) return 'used_up';
  return 'active';
}

export function SidebarPromoCard({ language }: SidebarPromoCardProps) {
  const en = language === 'en';
  const { currentPropertyId } = useProperty();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (!currentPropertyId) {
      setInviteUrl(null);
      setResolved(false);
      return;
    }

    let cancelled = false;
    setResolved(false);
    setInviteUrl(null);

    void (async () => {
      const { data, error } = await supabase
        .from('property_invite_codes')
        .select('id, code, label, used_count, max_uses, is_active, expires_at, created_at')
        .eq('property_id', currentPropertyId)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (error || !data?.length) {
        setInviteUrl(null);
        setResolved(true);
        return;
      }

      const rows = data as PublicCodeRow[];
      const firstActive = rows.find((r) => deriveStatus(r) === 'active');
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      if (!firstActive || !origin) {
        setInviteUrl(null);
        setResolved(true);
        return;
      }

      setInviteUrl(publicInviteEntryUrl(origin, String(currentPropertyId), firstActive.code));
      setResolved(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentPropertyId]);

  if (!currentPropertyId) return null;
  if (resolved && !inviteUrl) return null;

  const line1 = en ? 'Scan to view spending' : '扫码查看支出';
  const line2 = en ? 'Help every owner understand costs' : '让每一位业主掌控花费';
  const line3 = en ? 'Make every expense transparent' : '让每一笔支出干净透明';

  /** ~30% smaller than 118px for sidebar fit while remaining scannable */
  const qrPx = 83;

  return (
    <div
      className={[
        'rounded-2xl border border-gray-100 bg-white shadow-sm',
        'px-2.5 py-2 sm:px-3 sm:py-2.5',
        '[@media(max-height:820px)]:px-2 [@media(max-height:820px)]:py-1.5',
        '[@media(max-height:720px)]:px-2 [@media(max-height:720px)]:py-1',
      ].join(' ')}
    >
      <h2
        className={[
          'text-center text-[15px] font-bold leading-tight text-gray-900 sm:text-[15px]',
          '[@media(max-height:820px)]:text-sm',
          '[@media(max-height:720px)]:text-[13px]',
        ].join(' ')}
      >
        {line1}
      </h2>

      <div
        className={[
          'mt-0.5 space-y-0 text-center text-[11px] leading-snug text-gray-500',
          '[@media(max-height:820px)]:text-[11px]',
          '[@media(max-height:720px)]:text-[10px]',
        ].join(' ')}
      >
        <p>{line2}</p>
        <p>{line3}</p>
      </div>

      <div className="mt-1 flex justify-center [@media(max-height:820px)]:mt-1 [@media(max-height:720px)]:mt-0.5">
        {!resolved ? (
          <div
            style={{ width: qrPx, height: qrPx }}
            className="flex items-center justify-center rounded-lg bg-gray-50 ring-1 ring-gray-200"
            aria-busy
            aria-label={en ? 'Loading invite QR' : '加载邀请二维码'}
          >
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-clearstrata-ui-primary border-t-transparent" />
          </div>
        ) : inviteUrl ? (
          <div className="rounded-lg bg-white p-1 ring-1 ring-gray-200">
            <QRCode value={inviteUrl} size={qrPx} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
