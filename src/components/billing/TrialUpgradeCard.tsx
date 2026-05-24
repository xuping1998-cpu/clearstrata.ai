import { Link } from 'react-router-dom';
import { ArrowRight, Clock3 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TrialState } from '@/lib/subscription';

export function TrialUpgradeCard({
  state,
  daysLeft,
}: {
  state: TrialState;
  daysLeft: number;
}) {
  const { language } = useLanguage();
  const en = language === 'en';

  if (state !== 'expiring' && state !== 'expired') return null;

  const isExpired = state === 'expired';

  const title = isExpired
    ? en
      ? 'Trial ended'
      : '试用已结束'
    : en
      ? `${daysLeft} days left in your trial`
      : `你的试用还剩 ${daysLeft} 天`;
  const body = isExpired
    ? en
      ? 'You can still access the system for now, but we recommend upgrading soon to avoid service changes affecting normal use.'
      : '你仍可暂时访问系统，但建议尽快升级，避免后续服务调整影响正常使用。'
    : en
      ? 'Upgrade now to keep member invites, invoice audit, and budget management uninterrupted.'
      : '现在升级，可确保成员邀请、发票审计与预算管理不中断。';

  const cta = isExpired
    ? en
      ? 'View upgrade options'
      : '立即查看升级方案'
    : en
      ? 'Plan upgrade'
      : '准备升级';

  return (
    <div className="mb-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Clock3 className={isExpired ? 'h-4 w-4 text-amber-700' : 'h-4 w-4 text-rose-600'} />
            <p className="text-sm font-semibold text-gray-900">{title}</p>
          </div>
          <p className="mt-1 text-sm text-gray-700">{body}</p>
        </div>

        <div className="flex shrink-0">
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <Link
              to="/upgrade"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-clearstrata-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive active:scale-[0.99]"
            >
              {cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/pricing" className="text-xs font-semibold text-gray-600 hover:text-gray-900 text-center">
              {en ? 'View pricing →' : '查看定价 →'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
