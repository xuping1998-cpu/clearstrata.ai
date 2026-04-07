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
    <div className="mb-2 sm:mb-2 rounded-2xl shadow-lg border border-emerald-100/80 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 overflow-hidden relative">
      <div
        className="pointer-events-none absolute -right-8 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-emerald-300/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-12 bottom-0 w-36 h-36 rounded-full bg-cyan-400/20 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-1/3 top-3 w-px h-16 bg-gradient-to-b from-emerald-200/0 via-emerald-200/40 to-emerald-200/0"
        aria-hidden
      />

      <div className="relative z-10 flex flex-col sm:flex-row items-stretch min-h-0 gap-2 sm:gap-3 p-2 sm:p-2.5 lg:p-3">
        {/* 左侧：正方形二维码区（略增大），移动端文案在上、码在下 */}
        <div className="order-2 sm:order-1 w-full sm:w-[26%] sm:min-w-[124px] shrink-0 flex sm:items-start justify-center">
          <div
            id="dashboard-promo-qr"
            className="bg-white/95 rounded-xl border border-gray-200/70 shadow-sm w-full max-w-[248px] sm:max-w-[220px] flex flex-col items-center p-2 sm:p-2.5"
          >
            <div className="w-full max-w-[188px] mx-auto aspect-square flex items-center justify-center overflow-hidden p-1">
              <img
                src={promoQr}
                alt=""
                className="h-full w-full max-h-full max-w-full object-contain"
                decoding="async"
              />
            </div>
            <div className="mt-1.5 w-full space-y-1.5 text-center">
              <p className="text-xl font-semibold leading-relaxed text-gray-900 sm:text-2xl">{t('hero_qr_role1')}</p>
              <p className="text-xl font-semibold leading-relaxed text-gray-900 sm:text-2xl">{t('hero_qr_role2')}</p>
              <p className="text-xl font-semibold leading-relaxed text-gray-900 sm:text-2xl">{t('hero_qr_role3')}</p>
            </div>
          </div>
        </div>

        <div className="order-1 sm:order-2 w-full sm:w-[74%] flex flex-col items-center text-center min-w-0 px-0 sm:px-1">
          <span className="inline-flex items-center rounded-full border border-emerald-200/80 bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
            {t('hero_badge')}
          </span>

          <h2 className="mt-1 font-bold text-gray-900 leading-[1.08]">
            <span className="block text-2xl sm:text-3xl lg:text-4xl">{t('hero_title_1')}</span>
            <span className="block text-2xl sm:text-3xl lg:text-4xl mt-0.5">
              {t('hero_title_2a')}
              <span className="text-emerald-700 drop-shadow-sm">15%</span>
            </span>
          </h2>

          <p className="mt-1 w-full max-w-xl text-base sm:text-lg lg:text-xl font-bold text-slate-800 leading-snug">
            {t('hero_lead')}
          </p>

          <p
            className={`mt-0.5 w-full max-w-4xl mx-auto text-[15px] sm:text-[16px] lg:text-[17px] font-normal text-slate-600 leading-[1.35] px-1 sm:px-0 ${
              en ? '' : 'md:whitespace-nowrap'
            }`}
          >
            {t('hero_subline')}
          </p>

          <div className="mt-1.5 flex w-full max-w-lg flex-col items-center gap-0.5 text-center">
            <button
              type="button"
              onClick={scrollToQr}
              className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#1D9E75] px-9 py-3.5 text-lg font-bold text-white shadow-[0_8px_28px_-4px_rgba(22,163,74,0.55),0_4px_12px_-2px_rgba(16,185,129,0.35)] ring-2 ring-white/50 transition-all duration-200 hover:bg-[#178a66] hover:shadow-[0_12px_36px_-4px_rgba(22,163,74,0.6),0_8px_20px_-4px_rgba(5,150,105,0.45)] hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              <QrCode className="size-6 shrink-0 sm:size-7" strokeWidth={2.4} aria-hidden />
              {t('hero_cta')}
            </button>
            <p className="text-[11px] sm:text-xs text-slate-500 leading-tight tracking-tight pt-0.5">
              {t('hero_cta_footer')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
