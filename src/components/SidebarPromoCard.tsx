/** 侧栏底部：居家服务推广位 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export type SidebarPromoCardProps = {
  language: 'en' | 'zh';
};

export function SidebarPromoCard({ language }: SidebarPromoCardProps) {
  const en = language === 'en';
  const [toastKey, setToastKey] = useState(0);

  useEffect(() => {
    if (toastKey === 0) return;
    const id = window.setTimeout(() => setToastKey(0), 2800);
    return () => window.clearTimeout(id);
  }, [toastKey]);

  const items = en
    ? ['🔧 Plumbing & Electrical', '🏠 Rental Support', '🛠 Renovation', '🔑 Key Service']
    : ['🔧 水电维修', '🏠 出租管理', '🛠 装修服务', '🔑 钥匙快配'];

  return (
    <>
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
          {en ? 'Home Services' : '居家服务'}
        </h2>

        <div
          className={[
            'mt-1 space-y-0.5 text-center text-xs leading-relaxed text-gray-500',
            '[@media(max-height:820px)]:mt-0.5 [@media(max-height:820px)]:text-[11px] [@media(max-height:820px)]:leading-snug',
            '[@media(max-height:720px)]:text-[10px]',
          ].join(' ')}
        >
          <p>{en ? 'Trusted local help for your home' : '让家的事更省心'}</p>
        </div>

        <ul
          className={[
            'mx-auto mt-2 max-w-[13.5rem] space-y-1 text-left text-xs leading-snug text-gray-700',
            '[@media(max-height:820px)]:mt-1.5 [@media(max-height:820px)]:space-y-0.5 [@media(max-height:820px)]:text-[11px]',
            '[@media(max-height:720px)]:mt-1 [@media(max-height:720px)]:text-[10px]',
          ].join(' ')}
          aria-label={en ? 'Home services offered' : '居家服务项目'}
        >
          {items.map((line) => (
            <li key={line} className="pl-0.5">
              {line}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setToastKey((k) => k + 1)}
          className={[
            'mt-2 w-full rounded-lg bg-clearstrata-ui-primary py-2 text-center text-xs font-semibold text-white shadow-sm',
            'hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive',
            '[@media(max-height:820px)]:mt-1.5 [@media(max-height:820px)]:py-1.5 [@media(max-height:820px)]:text-[11px]',
            '[@media(max-height:720px)]:mt-1 [@media(max-height:720px)]:py-1.5 [@media(max-height:720px)]:text-[10px]',
          ].join(' ')}
        >
          {en ? 'Book Now' : '立即预约'}
        </button>
      </div>

      {toastKey > 0
        ? createPortal(
            <div className="pointer-events-none fixed bottom-6 left-1/2 z-[300] flex max-w-[min(100%,20rem)] -translate-x-1/2 justify-center px-4">
              <div
                role="status"
                className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg"
              >
                {en ? 'Coming soon' : '即将上线'}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
