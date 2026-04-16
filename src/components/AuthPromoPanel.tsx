import { QrCode } from 'lucide-react';
import promoQr from '../assets/promo-qr.png';
import { useLanguage } from '../contexts/LanguageContext';

/** Login / register page: QR + hero copy (i18n via hero_* keys). */
export function AuthPromoPanel() {
  const { t, language } = useLanguage();
  const en = language === 'en';

  const scrollToQr = () => {
    document.getElementById('auth-promo-qr')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col justify-between rounded-2xl border border-emerald-100 bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-md sm:p-8">
      <div className="flex h-32 shrink-0 flex-col justify-center gap-1.5 px-1 text-center">
        <div className="text-sm font-medium text-emerald-600">{t('hero_badge')}</div>
        <h2 className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl">
          {t('hero_title_1')}
          {en ? ' ' : ''}
          <span className="text-emerald-600">
            {t('hero_title_2a')}
            {en ? ' ' : ''}15%
          </span>
        </h2>
        <p className="line-clamp-1 text-sm text-gray-700">{t('hero_lead')}</p>
        <p className="line-clamp-2 text-xs text-gray-500 sm:text-sm">{t('hero_subline')}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-between gap-4 pt-2">
        <div className="flex w-full flex-col items-center gap-3">
          <img
            id="auth-promo-qr"
            src={promoQr}
            alt={en ? 'Scan to try' : '扫码体验'}
            className="h-44 w-44 rounded-2xl border border-gray-200/80 bg-white p-3 shadow-sm object-contain sm:h-52 sm:w-52"
            decoding="async"
          />

          <button
            type="button"
            onClick={scrollToQr}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:px-8 sm:py-3 sm:text-base"
          >
            <QrCode className="size-5 shrink-0" strokeWidth={2.2} aria-hidden />
            {t('hero_cta')}
          </button>

          <div className="mt-1 grid w-full grid-cols-1 gap-2 text-center text-xs text-gray-700 sm:grid-cols-3 sm:gap-3 sm:text-sm">
            <div className="rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-white/60 sm:px-4 sm:py-3">
              {t('hero_qr_role1')}
            </div>
            <div className="rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-white/60 sm:px-4 sm:py-3">
              {t('hero_qr_role2')}
            </div>
            <div className="rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-white/60 sm:px-4 sm:py-3">
              {t('hero_qr_role3')}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 sm:text-sm">{t('hero_cta_footer')}</p>
      </div>
    </div>
  );
}
