import { useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const SEO_TITLE = 'Contact ClearStrata';
const SEO_DESCRIPTION =
  'Get in touch for a demo or questions about ClearStrata strata management.';

function useContactSeo() {
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

export function Contact() {
  useContactSeo();
  const { session } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [building, setBuilding] = useState('');
  const [units, setUnits] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const n = name.trim();
    const em = email.trim();
    if (!n || !em) {
      setError('Please fill in your name and email.');
      return;
    }
    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from('leads').insert({
        name: n,
        email: em,
        building: building.trim() || null,
        units: units.trim() || null,
        message: message.trim() || null,
      });
      if (insertError) {
        console.error('leads insert', insertError);
        setError('Something went wrong. Please try again or email us directly.');
        return;
      }
      setSuccess(true);
      setName('');
      setEmail('');
      setBuilding('');
      setUnits('');
      setMessage('');
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
      {!session && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-lg mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link to="/" className="text-xl font-bold text-[#1D9E75]">
              {language === 'en' ? 'clearstrata.ai' : '清涟.ai'}
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/pricing"
                className="text-sm font-medium text-gray-600 hover:text-[#1D9E75] transition-colors"
              >
                {t('nav_pricing')}
              </Link>
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

      <div className="max-w-lg mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="text-center mb-8">
          <p className="text-sm font-medium text-[#1D9E75] uppercase tracking-wide">ClearStrata</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Contact</h1>
          <p className="mt-2 text-sm text-gray-600">
            Request a demo or ask a question — we will get back to you soon.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          {success ? (
            <p className="text-center text-gray-800 font-medium py-6" role="status">
              Thank you! We will contact you shortly.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="lead-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-600">*</span>
                </label>
                <input
                  id="lead-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75] transition-colors"
                />
              </div>
              <div>
                <label htmlFor="lead-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  id="lead-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75] transition-colors"
                />
              </div>
              <div>
                <label htmlFor="lead-building" className="block text-sm font-medium text-gray-700 mb-1">
                  Building / Strata Name
                </label>
                <input
                  id="lead-building"
                  type="text"
                  autoComplete="organization"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75] transition-colors"
                />
              </div>
              <div>
                <label htmlFor="lead-units" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of units
                </label>
                <input
                  id="lead-units"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 48"
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75] transition-colors"
                />
              </div>
              <div>
                <label htmlFor="lead-message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  id="lead-message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75] transition-colors resize-y min-h-[100px]"
                />
              </div>

              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#1D9E75] text-white font-semibold py-3 text-sm hover:bg-[#188f6a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    Sending…
                  </>
                ) : (
                  'Send message'
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-8 text-sm text-gray-500">
          <Link to="/pricing" className="text-[#1D9E75] font-medium hover:underline">
            View pricing
          </Link>
        </p>
      </div>
    </div>
  );
}
