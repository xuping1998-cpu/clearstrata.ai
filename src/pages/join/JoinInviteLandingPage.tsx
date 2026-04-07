import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, CheckCircle2, ClipboardList, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { resolveJoinCodeFromProperties } from '../../lib/joinCodeResolve';

export default function JoinInviteLandingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { language } = useLanguage();
  const en = language === 'en';

  const code = searchParams.get('code')?.trim() ?? '';

  const [propertyName, setPropertyName] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'redirecting'>('loading');

  useEffect(() => {
    if (!code) {
      navigate('/join', { replace: true });
      return;
    }

    let cancelled = false;

    (async () => {
      setLoadState('loading');
      const result = await resolveJoinCodeFromProperties(code);
      if (cancelled) return;

      if (!result.ok) {
        setLoadState('redirecting');
        navigate(`/join/invalid?reason=${result.reason}`, { replace: true });
        return;
      }

      setPropertyName(result.property.name);
      setLoadState('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, [code, navigate]);

  const t = {
    heroTitle: en ? (n: string) => `Welcome to ${n}` : (n: string) => `欢迎加入 ${n}`,
    heroSub: en
      ? 'Submit your join request through ClearStrata, track review progress, and enter your property space after approval.'
      : '通过 ClearStrata 提交加入申请，查看审批进度，并在审核通过后进入您的物业专属空间。',
    heroHint: en
      ? 'This is the dedicated invite page for this property.'
      : '这是该物业的专属邀请页面。',
    ctaPrimary: en ? 'Apply to join' : '申请加入',
    ctaSecondary: en ? 'I already applied — view status' : '我已提交，查看状态',

    benefitsTitle: en ? 'After you join, you can' : '加入后，您可以获得',
    b1Title: en ? 'Clearer property information' : '物业信息更透明',
    b1Text: en
      ? 'View notices, records, and key updates — less confusion and fewer gaps.'
      : '查看公告、记录和关键信息，减少信息不对称。',
    b2Title: en ? 'A clearer application flow' : '申请流程更清晰',
    b2Text: en
      ? 'Track your request after submission instead of waiting without updates.'
      : '提交申请后可查看状态，避免反复沟通和等待不明。',
    b3Title: en ? 'Direct access after approval' : '审核通过后直接进入',
    b3Text: en
      ? 'Once approved, your property access is bound automatically.'
      : '审核通过后，系统会自动绑定您的物业访问权限。',

    reviewTitle: en ? 'About review' : '审核说明',
    reviewBody: en
      ? 'To protect property data and access, every join request is reviewed by property staff. Most are handled within 24 hours.'
      : '为保护物业信息和用户权限，所有加入申请都需要由物业管理员审核。通常会在 24 小时内完成处理。',

    helpText: en
      ? 'Invalid QR code, expired invite, or unsure if you submitted? Contact your property administrator, or sign in to check your application status.'
      : '二维码无效、邀请已失效，或不确定是否已提交成功？请联系物业管理员，或登录后查看申请状态。',
  };

  const goApply = () => {
    navigate(`/join?code=${encodeURIComponent(code)}`);
  };

  const goStatus = () => {
    if (session) {
      navigate('/join/pending');
    } else {
      navigate(`/?redirect=${encodeURIComponent('/join/pending')}`);
    }
  };

  if (!code) {
    return null;
  }

  if (loadState === 'loading' || loadState === 'redirecting') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 to-gray-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-[#1D9E75] animate-spin" aria-hidden />
        <p className="mt-4 text-sm text-gray-500">{en ? 'Loading…' : '加载中…'}</p>
      </div>
    );
  }

  const name = propertyName ?? (en ? 'this property' : '该物业');

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 to-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8 pb-12 sm:py-10">
        {/* Hero */}
        <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1D9E75] text-white mb-4 shadow-md mx-auto">
            <Building2 size={28} aria-hidden />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">{t.heroTitle(name)}</h1>
          <p className="mt-3 text-sm text-gray-600 leading-relaxed text-left">{t.heroSub}</p>
          <p className="mt-3 text-xs text-gray-500 leading-relaxed flex items-start gap-2 text-left rounded-xl bg-emerald-50/80 border border-emerald-100/80 px-3 py-2.5">
            <ShieldCheck className="w-4 h-4 text-[#1D9E75] shrink-0 mt-0.5" aria-hidden />
            <span>{t.heroHint}</span>
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={goApply}
              className="w-full py-3.5 rounded-xl bg-[#1D9E75] text-white font-semibold text-base hover:bg-[#178a66] shadow-sm"
            >
              {t.ctaPrimary}
            </button>
            <button
              type="button"
              onClick={goStatus}
              className="w-full py-3.5 rounded-xl border border-gray-200 bg-white text-gray-800 font-medium text-base hover:bg-gray-50"
            >
              {t.ctaSecondary}
            </button>
          </div>
        </section>

        {/* Benefits */}
        <section className="mt-6">
          <h2 className="text-base font-bold text-gray-900 mb-3 px-1">{t.benefitsTitle}</h2>
          <ul className="space-y-3">
            <li className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#1D9E75] shrink-0 mt-0.5" aria-hidden />
                <div className="text-left">
                  <p className="font-semibold text-gray-900 text-sm">{t.b1Title}</p>
                  <p className="mt-1 text-xs text-gray-600 leading-relaxed">{t.b1Text}</p>
                </div>
              </div>
            </li>
            <li className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex gap-3">
                <ClipboardList className="w-5 h-5 text-[#1D9E75] shrink-0 mt-0.5" aria-hidden />
                <div className="text-left">
                  <p className="font-semibold text-gray-900 text-sm">{t.b2Title}</p>
                  <p className="mt-1 text-xs text-gray-600 leading-relaxed">{t.b2Text}</p>
                </div>
              </div>
            </li>
            <li className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex gap-3">
                <ShieldCheck className="w-5 h-5 text-[#1D9E75] shrink-0 mt-0.5" aria-hidden />
                <div className="text-left">
                  <p className="font-semibold text-gray-900 text-sm">{t.b3Title}</p>
                  <p className="mt-1 text-xs text-gray-600 leading-relaxed">{t.b3Text}</p>
                </div>
              </div>
            </li>
          </ul>
        </section>

        {/* Review */}
        <section className="mt-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">{t.reviewTitle}</h2>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">{t.reviewBody}</p>
        </section>

        {/* Help */}
        <p className="mt-6 text-xs text-gray-500 leading-relaxed px-1 text-center">{t.helpText}</p>

        <p className="text-center text-xs text-gray-400 mt-8">ClearStrata</p>
      </div>
    </div>
  );
}
