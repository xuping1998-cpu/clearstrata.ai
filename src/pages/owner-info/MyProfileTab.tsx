import { useLanguage } from '../../contexts/LanguageContext';
import { ResidentProfile } from './ResidentProfile';
import { OwnerInfoTab } from './OwnerInfoTab';

/** 业主信息「我的资料」：基本信息、单元信息两个区块。 */
export function MyProfileTab() {
  const { language } = useLanguage();
  const en = language === 'en';

  return (
    <div className="space-y-14">
      <section aria-labelledby="owner-profile-basic" className="space-y-4">
        <h2
          id="owner-profile-basic"
          className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-3"
        >
          {en ? 'Basic information' : '基本信息'}
        </h2>
        <ResidentProfile />
      </section>

      <section aria-labelledby="owner-profile-unit" className="space-y-4">
        <h2
          id="owner-profile-unit"
          className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-3"
        >
          {en ? 'Unit information' : '单元信息'}
        </h2>
        <OwnerInfoTab />
      </section>
    </div>
  );
}
