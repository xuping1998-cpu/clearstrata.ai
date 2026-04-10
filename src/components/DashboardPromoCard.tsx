import { QrCode } from 'lucide-react';
import promoQr from '../assets/promo-qr.png';
import { useLanguage } from '../contexts/LanguageContext';

export function DashboardPromoCard() {
  const { t, language } = useLanguage();
  const en = language === 'en';

  const scrollToQr = () => {
    document.getElementById('dashboard-promo-qr')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="mb-2 sm:mb-4 rounded-2xl border border-emerald-100 bg-gradient-to-r from-green-50 to-emerald-50 p-4 sm:p-6 shadow-sm">
      <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
        <div className="flex justify-center">
          <img
            id="dashboard-promo-qr"
            src={promoQr}
            alt={en ? 'Scan to try' : '扫码体验'}
            className="h-48 w-48 rounded-xl border border-gray-200/80 bg-white p-3 shadow-sm object-contain"
            decoding="async"
          />
        </div>

        <div className="text-center md:text-left">
          <div className="mb-2 text-sm font-medium text-green-600">{t('hero_badge')}</div>

          <h2 className="text-2xl font-bold leading-snug text-gray-900 sm:text-3xl">
            <span className="block">{t('hero_title_1')}</span>
            <span className="text-green-600">
              {t('hero_title_2a')}
              15%
            </span>
          </h2>

          <p className="mt-2 text-base text-gray-600 sm:text-lg">{t('hero_lead')}</p>

          <p className="mt-1 text-sm text-gray-500">{t('hero_subline')}</p>

          <button
            type="button"
            onClick={scrollToQr}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-green-600 px-6 py-3 text-base font-medium text-white shadow transition-colors hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 md:w-auto"
          >
            <QrCode className="size-5 shrink-0" strokeWidth={2.2} aria-hidden />
            {t('hero_cta')}
          </button>
          <p className="mt-2 text-center text-xs text-gray-500 md:text-left">{t('hero_cta_footer')}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 text-center text-sm text-gray-700 md:grid-cols-3">
        <div className="rounded-lg bg-white/60 p-3 font-medium shadow-sm ring-1 ring-white/80">
          {t('hero_qr_role1')}
        </div>
        <div className="rounded-lg bg-white/60 p-3 font-medium shadow-sm ring-1 ring-white/80">
          {t('hero_qr_role2')}
        </div>
        <div className="rounded-lg bg-white/60 p-3 font-medium shadow-sm ring-1 ring-white/80">
          {t('hero_qr_role3')}
        </div>
      </div>
    </div>
  );
}
