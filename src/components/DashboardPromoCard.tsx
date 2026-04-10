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
    <div className="mb-2 sm:mb-4 rounded-2xl border border-emerald-100 bg-gradient-to-r from-green-50 to-emerald-50 p-6 shadow-sm">
      <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
        {/* Left: QR + CTA + three role lines */}
        <div className="flex flex-col items-center md:items-start">
          <img
            id="dashboard-promo-qr"
            src={promoQr}
            alt={en ? 'Scan to try' : '扫码体验'}
            className="h-44 w-44 rounded-xl border border-gray-200/80 bg-white p-3 shadow-sm object-contain"
            decoding="async"
          />

          <button
            type="button"
            onClick={scrollToQr}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-green-600 px-6 py-3 text-sm font-medium text-white shadow transition-colors hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
          >
            <QrCode className="size-5 shrink-0" strokeWidth={2.2} aria-hidden />
            {t('hero_cta')}
          </button>

          <div className="mt-4 grid w-full grid-cols-1 gap-2 text-center text-sm text-gray-700 md:grid-cols-3">
            <div className="rounded-xl bg-white/70 px-3 py-2 font-medium ring-1 ring-white/80">
              {t('hero_qr_role1')}
            </div>
            <div className="rounded-xl bg-white/70 px-3 py-2 font-medium ring-1 ring-white/80">
              {t('hero_qr_role2')}
            </div>
            <div className="rounded-xl bg-white/70 px-3 py-2 font-medium ring-1 ring-white/80">
              {t('hero_qr_role3')}
            </div>
          </div>

          <p className="mt-2 w-full text-center text-xs text-gray-500 md:text-left">{t('hero_cta_footer')}</p>
        </div>

        {/* Right: marketing copy */}
        <div className="text-center md:text-left">
          <div className="mb-2 text-sm font-medium text-green-600">{t('hero_badge')}</div>

          <h2 className="text-2xl font-bold leading-snug text-gray-900 sm:text-3xl">
            {t('hero_title_1')}
            {en ? ' ' : ''}
            <span className="text-green-600">
              {t('hero_title_2a')}
              {en ? ' ' : ''}15%
            </span>
          </h2>

          <p className="mt-2 text-base text-gray-600 sm:text-lg">{t('hero_lead')}</p>

          <p className="mt-3 text-sm text-gray-500">{t('hero_subline')}</p>
        </div>
      </div>
    </div>
  );
}
