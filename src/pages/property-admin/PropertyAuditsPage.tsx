import { useProperty } from '../../contexts/PropertyContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { BackButton } from '../../components/BackButton';
import { PropertyEntryAuditPanel } from '../../features/property-entry/PropertyEntryAuditPanel';

export function PropertyAuditsPage() {
  const { currentPropertyId } = useProperty();
  const { language } = useLanguage();
  const en = language === 'en';

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <BackButton />
      <div className="mt-2 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{en ? 'Audit log' : '审计日志'}</h1>
        <p className="text-sm text-gray-600 mt-1 max-w-2xl">
          {en
            ? 'View property entry, review, and follow-up property action records.'
            : '查看入楼、审核与后续物业操作记录。'}
        </p>
      </div>

      {!currentPropertyId ? (
        <p className="text-sm text-gray-600">{en ? 'Please select a property first.' : '请先选择物业'}</p>
      ) : (
        <PropertyEntryAuditPanel />
      )}
    </div>
  );
}
