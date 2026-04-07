import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const SEO_TITLE = 'ClearStrata Pricing';
const SEO_DESCRIPTION =
  'Transparent strata management pricing for councils, admins, managers, and owners.';

function usePricingSeo() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = SEO_TITLE;

    let meta = document.querySelector('meta[name="description"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    const prevDesc = meta.getAttribute('content') || '';
    meta.setAttribute('content', SEO_DESCRIPTION);

    return () => {
      document.title = prevTitle;
      if (created && meta?.parentNode) {
        meta.parentNode.removeChild(meta);
      } else if (meta) {
        meta.setAttribute('content', prevDesc);
      }
    };
  }, []);
}

const starterFeatures = [
  'Basic invoice record management',
  'Owner-facing notice board',
  'Role-based access',
  'Activity history',
  'Email notifications',
];

const standardFeatures = [
  'AI-assisted invoice extraction',
  'Transparent expense records',
  'Notice publishing and dashboard alerts',
  'Audit trail and approval visibility',
  'Role-based access for council/admin/manager/owner',
  'File uploads and record history',
];

const premiumFeatures = [
  'Everything in Standard',
  'Spending analysis',
  'Exception/anomaly review',
  'Budget insight tools',
  'Priority support',
];

const faqItems: { q: string; a: string }[] = [
  {
    q: 'Is pricing billed monthly or yearly?',
    a: 'Pricing is shown annually per home for simplicity and predictability.',
  },
  {
    q: 'Do all owners need access?',
    a: 'No. Access can be granted based on role and building needs.',
  },
  {
    q: 'Is AI invoice extraction included?',
    a: 'It is included in Standard and Premium plans.',
  },
  {
    q: 'Can we start with one building?',
    a: 'Yes. ClearStrata is designed to start with a single community and expand over time.',
  },
  {
    q: 'Can pricing change after we onboard?',
    a: 'We aim for predictable annual terms; any changes would be communicated clearly before renewal.',
  },
];

export function Pricing() {
  usePricingSeo();
  const { session } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();

  return (
    <div className="min-h-full bg-gray-50">
      {!session && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link to="/" className="text-xl font-bold text-[#1D9E75]">
              {language === 'en' ? 'clearstrata.ai' : '清涟.ai'}
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={toggleLanguage}
                className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium text-gray-800"
              >
                {language === 'en' ? '中文' : 'EN'}
              </button>
              <Link
                to="/"
                className="text-sm font-medium text-gray-700 hover:text-[#1D9E75] transition-colors"
              >
                {t('auth_login')}
              </Link>
            </div>
          </div>
        </header>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-16 sm:space-y-20">
        {/* Page title (visible) */}
        <div className="border-b border-gray-200 pb-6">
          <p className="text-sm font-medium text-[#1D9E75] uppercase tracking-wide">
            ClearStrata
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-bold text-gray-900">Pricing</h1>
        </div>

        {/* Hero */}
        <section className="text-center max-w-3xl mx-auto space-y-6">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
            Make every strata expense transparent and accountable
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            AI-assisted invoice review, owner visibility, and audit-ready records — designed for
            modern strata communities.
          </p>
          <p className="text-base text-gray-700 font-medium leading-relaxed max-w-2xl mx-auto bg-white rounded-lg border border-gray-200 px-5 py-4 shadow-sm">
            If the platform helps reduce even a small percentage of unnecessary spending, it can
            more than pay for itself.
          </p>
        </section>

        {/* Pricing cards */}
        <section aria-labelledby="pricing-tiers">
          <h2 id="pricing-tiers" className="sr-only">
            Pricing tiers
          </h2>
          <div className="grid gap-6 lg:gap-8 lg:grid-cols-3 items-stretch">
            {/* Starter */}
            <article className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Starter</h3>
              <p className="mt-1 text-sm text-gray-500">Best for pilot buildings</p>
              <p className="mt-6">
                <span className="text-3xl font-bold text-gray-900">$30</span>
                <span className="text-gray-600"> / home / year</span>
              </p>
              <ul className="mt-8 space-y-3 flex-1">
                {starterFeatures.map((f) => (
                  <li key={f} className="flex gap-3 text-sm text-gray-700">
                    <Check className="shrink-0 w-5 h-5 text-[#1D9E75]" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </article>

            {/* Standard — Most Popular */}
            <article className="relative flex flex-col rounded-xl border-2 border-[#1D9E75] bg-white p-6 sm:p-8 shadow-md lg:scale-[1.02] lg:z-10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#1D9E75] text-white text-xs font-semibold px-3 py-1 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" aria-hidden />
                  Most Popular
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mt-2">Standard</h3>
              <p className="mt-1 text-sm text-gray-500">Best for active strata communities</p>
              <p className="mt-6">
                <span className="text-3xl font-bold text-gray-900">$50</span>
                <span className="text-gray-600"> / home / year</span>
              </p>
              <ul className="mt-8 space-y-3 flex-1">
                {standardFeatures.map((f) => (
                  <li key={f} className="flex gap-3 text-sm text-gray-700">
                    <Check className="shrink-0 w-5 h-5 text-[#1D9E75]" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </article>

            {/* Premium */}
            <article className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Premium</h3>
              <p className="mt-1 text-sm text-gray-500">Best for advanced oversight</p>
              <p className="mt-6">
                <span className="text-3xl font-bold text-gray-900">$80</span>
                <span className="text-gray-600"> / home / year</span>
              </p>
              <ul className="mt-8 space-y-3 flex-1">
                {premiumFeatures.map((f) => (
                  <li key={f} className="flex gap-3 text-sm text-gray-700">
                    <Check className="shrink-0 w-5 h-5 text-[#1D9E75]" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        {/* Value props */}
        <section aria-labelledby="why-clearstrata">
          <h2 id="why-clearstrata" className="text-2xl font-bold text-gray-900 text-center mb-10">
            Why communities choose ClearStrata
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="rounded-lg bg-white border border-gray-200 p-6 text-center sm:text-left">
              <h3 className="font-semibold text-gray-900">Reduce waste</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Spot unclear, duplicated, or questionable expenses earlier.
              </p>
            </div>
            <div className="rounded-lg bg-white border border-gray-200 p-6 text-center sm:text-left">
              <h3 className="font-semibold text-gray-900">Improve transparency</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Give owners visibility into records, notices, and decisions.
              </p>
            </div>
            <div className="rounded-lg bg-white border border-gray-200 p-6 text-center sm:text-left">
              <h3 className="font-semibold text-gray-900">Save time</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Replace scattered emails and manual tracking with one shared system.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-2xl font-bold text-gray-900 text-center mb-8">
            Frequently asked questions
          </h2>
          <div className="max-w-2xl mx-auto space-y-3">
            {faqItems.map((item) => (
              <details
                key={item.q}
                className="group rounded-lg border border-gray-200 bg-white px-4 py-3 open:shadow-sm"
              >
                <summary className="cursor-pointer list-none font-medium text-gray-900 flex justify-between items-center gap-4 [&::-webkit-details-marker]:hidden">
                  <span>{item.q}</span>
                  <span className="text-gray-400 text-xl leading-none group-open:rotate-45 transition-transform select-none">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed pb-1">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section
          className="rounded-2xl bg-[#1D9E75] text-white px-6 py-10 sm:px-10 sm:py-12 text-center"
          aria-labelledby="cta-heading"
        >
          <h2 id="cta-heading" className="text-xl sm:text-2xl font-bold leading-snug max-w-2xl mx-auto">
            Start with one building. Prove the value. Expand with confidence.
          </h2>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
            <Link
              to="/contact"
              className="inline-flex justify-center items-center rounded-lg bg-white text-[#1D9E75] font-semibold px-6 py-3 text-sm hover:bg-gray-100 transition-colors"
            >
              Request a demo
            </Link>
            <Link
              to="/contact"
              className="inline-flex justify-center items-center rounded-lg border-2 border-white text-white font-semibold px-6 py-3 text-sm hover:bg-white/10 transition-colors"
            >
              Contact us
            </Link>
          </div>
        </section>

        {/* Space for future zh locale copy — structure ready; strings stay EN for now */}
      </div>
    </div>
  );
}
