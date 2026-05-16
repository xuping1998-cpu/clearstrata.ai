import { Link } from 'react-router-dom';
import { ArrowLeft, Vote } from 'lucide-react';
import { useProperty } from '@/contexts/PropertyContext';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Deprecated route: owner petition / legacy hub replaced by unified `/voting`.
 * Keeps deep links and bookmarks from breaking; does not create new owner-requisitioned SGM.
 */
export function OwnerVotingCompatPage() {
  const { currentPropertyId } = useProperty();
  const { language } = useLanguage();
  const en = language === 'en';

  const votingHref = currentPropertyId?.trim()
    ? `/voting?${new URLSearchParams({ propertyId: currentPropertyId.trim() }).toString()}`
    : '/voting';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-clearstrata-ui-soft">
          <Vote className="h-7 w-7 text-clearstrata-ui-primary" aria-hidden />
        </div>
        <h1 className="text-xl font-bold text-gray-900">
          {en ? 'Meeting voting' : '会议投票'}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-gray-700">
          {en
            ? 'Meeting voting has been unified into the main voting list.'
            : '会议投票已统一至主会议投票列表。'}
        </p>
        <p className="mt-2 text-xs text-gray-500">
          {en
            ? 'Owner-initiated SGM petitions are no longer started from this page. Existing meetings remain accessible from the list.'
            : '业主联署 SGM 已不再从此页发起；已有会议仍可从投票列表打开查看。'}
        </p>
        <Link
          to={votingHref}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-clearstrata-ui-primary px-4 py-3 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive transition-colors"
        >
          {en ? 'Back to meeting voting' : '返回会议投票'}
        </Link>
        <Link
          to="/"
          className="mt-4 inline-flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {en ? 'Home' : '首页'}
        </Link>
      </div>
    </div>
  );
}
