/** 侧栏底部：支出透明 / 扫码转化位（文案与样式与产品一致，二维码路径与 Layout 原逻辑相同） */
import { Link } from 'react-router-dom';

const QR_SRC = '/qr-code.png';

export type SidebarPromoCardProps = {
  language: 'en' | 'zh';
};

export function SidebarPromoCard({ language }: SidebarPromoCardProps) {
  const en = language === 'en';

  return (
    <div
      className={[
        'rounded-2xl border border-gray-100 bg-white shadow-sm',
        'px-3 py-2.5 sm:px-3.5 sm:py-3',
        '[@media(max-height:820px)]:px-2.5 [@media(max-height:820px)]:py-2',
        '[@media(max-height:720px)]:px-2 [@media(max-height:720px)]:py-1.5',
      ].join(' ')}
    >
      <h2
        className={[
          'text-center text-base font-bold leading-snug text-gray-900',
          '[@media(max-height:820px)]:text-[15px]',
          '[@media(max-height:720px)]:text-sm',
        ].join(' ')}
      >
        {en ? 'Scan to view spending' : '扫码查看支出'}
      </h2>

      <div
        className={[
          'mt-1 space-y-0.5 text-center text-xs leading-relaxed text-gray-500',
          '[@media(max-height:820px)]:mt-0.5 [@media(max-height:820px)]:text-[11px] [@media(max-height:820px)]:leading-snug',
          '[@media(max-height:720px)]:text-[10px]',
        ].join(' ')}
      >
        <p>{en ? 'Put every owner in control of spending' : '让每一位业主掌控花费'}</p>
        <p>{en ? 'Keep every expense clear and transparent' : '让每一笔支出干净透明'}</p>
      </div>

      <div
        className={[
          'mx-auto mt-2 flex w-[96px] shrink-0 items-center justify-center [@media(max-height:820px)]:mt-1.5 [@media(max-height:720px)]:mt-1',
          '[@media(max-height:820px)]:w-[88px]',
          '[@media(max-height:720px)]:w-20',
        ].join(' ')}
      >
        <img
          src={QR_SRC}
          alt={en ? 'QR code to view property spending' : '扫码查看物业支出'}
          width={112}
          height={112}
          className={[
            'h-24 w-24 max-h-[112px] max-w-[112px] object-contain',
            '[@media(max-height:820px)]:h-[88px] [@media(max-height:820px)]:w-[88px] [@media(max-height:820px)]:max-h-[88px] [@media(max-height:820px)]:max-w-[88px]',
            '[@media(max-height:720px)]:h-20 [@media(max-height:720px)]:w-20 [@media(max-height:720px)]:max-h-20 [@media(max-height:720px)]:max-w-20',
          ].join(' ')}
          decoding="async"
          loading="lazy"
        />
      </div>

      <p
        className={[
          'mt-1.5 text-center text-[11px] text-gray-400',
          '[@media(max-height:820px)]:mt-1 [@media(max-height:820px)]:text-[10px]',
          '[@media(max-height:720px)]:mt-0.5',
        ].join(' ')}
      >
        {en ? 'See every line of spending in seconds' : '3秒看清每一笔花费'}
      </p>
    </div>
  );
}
