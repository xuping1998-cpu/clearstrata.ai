import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const ADMIN_MAIL = 'mailto:clearstrata.ai@outlook.com';

type ReasonKey = 'invalid' | 'expired' | 'default';

function resolveReason(raw: string | null): ReasonKey {
  if (raw === 'invalid' || raw === 'expired') return raw;
  return 'default';
}

export default function JoinInvalidPage() {
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const en = language === 'en';
  const reason = resolveReason(searchParams.get('reason')?.trim() ?? null);

  const copy =
    reason === 'invalid'
      ? {
          title: en ? 'Invitation not recognized' : '未识别到有效邀请',
          body: en
            ? 'This QR code or link is not valid. Please contact your property administrator for the correct link.'
            : '该二维码或邀请链接无效，请联系物业管理员获取正确链接。',
        }
      : reason === 'expired'
        ? {
            title: en ? 'Invitation no longer valid' : '邀请已失效',
            body: en
              ? 'This link is not available right now. Please contact your property administrator for a new one.'
              : '该邀请链接当前不可用，请联系物业管理员重新获取。',
          }
        : {
            title: en ? "We can't process this invitation" : '当前无法处理邀请',
            body: en
              ? 'Please try again later or contact your property administrator.'
              : '请稍后再试，或联系物业管理员。',
          };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 to-gray-50 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 mb-4">
          <AlertCircle className="w-8 h-8" strokeWidth={1.75} aria-hidden />
        </div>
        <h1 className="text-xl font-bold text-gray-900">{copy.title}</h1>
        <p className="mt-3 text-sm text-gray-600 leading-relaxed">{copy.body}</p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex justify-center items-center px-6 py-3 rounded-xl bg-[#1D9E75] text-white font-semibold hover:bg-[#178a66]"
          >
            {en ? 'Back to home' : '返回首页'}
          </Link>
          <a
            href={ADMIN_MAIL}
            className="inline-flex justify-center items-center px-6 py-3 rounded-xl border border-gray-200 text-gray-800 font-medium hover:bg-gray-50"
          >
            {en ? 'Contact administrator' : '联系管理员'}
          </a>
        </div>
      </div>
    </div>
  );
}
