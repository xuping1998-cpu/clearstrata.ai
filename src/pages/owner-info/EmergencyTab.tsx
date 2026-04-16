import { useEffect, useState } from 'react';
import { Phone, Building2, Users } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useProperty } from '../../contexts/PropertyContext';
import { supabase } from '../../lib/supabase';

export function EmergencyTab({ embedded = false }: { embedded?: boolean }) {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const { currentPropertyId } = useProperty();
  const [ownerInfo, setOwnerInfo] = useState<{ emergency_contact_name?: string; emergency_contact_phone?: string } | null>(null);

  useEffect(() => {
    if (profile && currentPropertyId) {
      supabase
        .from('owner_info')
        .select('emergency_contact_name, emergency_contact_phone')
        .eq('user_id', profile.id)
        .eq('property_id', currentPropertyId)
        .maybeSingle()
        .then(({ data }) => setOwnerInfo(data));
    } else {
      setOwnerInfo(null);
    }
  }, [profile, currentPropertyId]);

  const shellClass = embedded ? 'space-y-6' : 'bg-white rounded-xl shadow-sm p-8';

  return (
    <div className={shellClass}>
      {!embedded && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {language === 'en' ? 'Emergency Contacts' : '紧急联系人'}
          </h2>
          <p className="text-gray-600">
            {language === 'en'
              ? 'Important contacts for emergencies and building management'
              : '紧急情况和楼宇管理的重要联系方式'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ContactCard color="red" icon={<Phone size={24} />} title={language === 'en' ? 'Emergency Services' : '紧急服务'} number="911" subtitle={language === 'en' ? 'Police, Fire, Ambulance' : '警察、消防、救护车'} />
        <ContactCard color="blue" icon={<Building2 size={24} />} title={language === 'en' ? 'Strata Manager' : '物业经理'} number="604-555-0100" subtitle="manager@clearstrata.com" detail={language === 'en' ? 'Mon-Fri: 9AM - 5PM' : '周一至周五：9AM - 5PM'} />
        <ContactCard color="green" icon={<Users size={24} />} title={language === 'en' ? 'Property Manager' : '物业经理'} number="604-555-0150" subtitle="manager@clearstrata.com" detail={language === 'en' ? '24/7 Emergency Line' : '24/7 紧急热线'} />
        <ContactCard color="orange" icon={<Phone size={24} />} title={language === 'en' ? 'Security' : '保安'} number="604-555-0175" subtitle={language === 'en' ? 'Front Desk / Security Office' : '前台 / 保安室'} detail={language === 'en' ? '24/7 Available' : '24/7 服务'} />
      </div>

      {ownerInfo?.emergency_contact_name && (
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            {language === 'en' ? 'Your Emergency Contact' : '您的紧急联系人'}
          </h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="bg-gray-600 text-white p-3 rounded-lg"><Users size={24} /></div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-1">{ownerInfo.emergency_contact_name}</h4>
                {ownerInfo.emergency_contact_phone && (
                  <p className="text-lg font-bold text-gray-700 mb-2">{ownerInfo.emergency_contact_phone}</p>
                )}
                <p className="text-sm text-gray-600">
                  {language === 'en' ? 'This contact will be reached in case of unit emergencies' : '在单元紧急情况下将联系此人'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContactCard({ color, icon, title, number, subtitle, detail }: {
  color: string;
  icon: React.ReactNode;
  title: string;
  number: string;
  subtitle: string;
  detail?: string;
}) {
  const colorMap: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', iconBg: 'bg-red-600' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', iconBg: 'bg-blue-600' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', iconBg: 'bg-green-600' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', iconBg: 'bg-orange-600' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`${c.bg} border ${c.border} rounded-lg p-6`}>
      <div className="flex items-start gap-4">
        <div className={`${c.iconBg} text-white p-3 rounded-lg`}>{icon}</div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
          <p className={`text-2xl font-bold ${c.text} mb-2`}>{number}</p>
          <p className="text-sm text-gray-600">{subtitle}</p>
          {detail && <p className="text-xs text-gray-500 mt-2">{detail}</p>}
        </div>
      </div>
    </div>
  );
}
