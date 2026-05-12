import { useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

/** Canonical keys for home-services partner rows (future DB enum / CHECK). */
export type ExternalHomeServiceType =
  | 'plumbing_electrical'
  | 'rental_management'
  | 'home_insurance'
  | 'moving_services';

export type ExternalContactPlaceholderRow = {
  service_type: ExternalHomeServiceType;
  partner_name: string;
  contact_name: string;
  phone: string;
  email: string;
  note: string;
  is_active: boolean;
};

const SERVICE_LABELS: Record<ExternalHomeServiceType, { zh: string; en: string }> = {
  plumbing_electrical: { zh: '水电维修', en: 'Plumbing & Electrical' },
  rental_management: { zh: '出租管理', en: 'Rental Management' },
  home_insurance: { zh: '房屋保险', en: 'Home Insurance' },
  moving_services: { zh: '搬家服务', en: 'Moving Services' },
};

const STATIC_ROWS: ExternalContactPlaceholderRow[] = [
  {
    service_type: 'plumbing_electrical',
    partner_name: '示例水电服务商',
    contact_name: '张工',
    phone: '(604) 555-0101',
    email: 'dispatch@example-plumbing.test',
    note: '占位：紧急工单通道 — 后续入库',
    is_active: true,
  },
  {
    service_type: 'rental_management',
    partner_name: '示例租赁托管',
    contact_name: 'Lisa Chen',
    phone: '(604) 555-0102',
    email: 'leasing@example-rental.test',
    note: '占位：长租 / Airbnb 协调',
    is_active: true,
  },
  {
    service_type: 'home_insurance',
    partner_name: '示例房屋保险经纪',
    contact_name: 'Mike Patel',
    phone: '(604) 555-0103',
    email: 'strata@example-insurance.test',
    note: '占位：保单续期提醒',
    is_active: true,
  },
  {
    service_type: 'moving_services',
    partner_name: '示例搬家公司',
    contact_name: '调度中心',
    phone: '(604) 555-0104',
    email: 'bookings@example-moving.test',
    note: '占位：电梯时段预约',
    is_active: false,
  },
];

/**
 * Platform-only placeholder for 居家服务合作方联系人。
 *
 * TODO: Persist via Supabase — propose table `home_service_external_contacts` (or platform-managed JSON keyed by `service_type`)
 * with columns: service_type, partner_name, contact_name, phone, email, note, is_active, updated_at; RLS restricted to `is_platform_admin()`.
 */
export function ExternalContactsAdminTab() {
  const { language } = useLanguage();
  const en = language === 'en';

  const rows = useMemo(() => STATIC_ROWS, []);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-medium">{en ? 'Static preview (no save yet)' : '当前为静态占位（不会保存）'}</p>
        <p className="mt-1 text-amber-900/90">
          {en
            ? 'TODO: Wire to database (e.g. home_service_external_contacts) with platform_admin-only RLS.'
            : 'TODO：后续接入数据库（建议表 home_service_external_contacts），RLS 仅 platform_admin。'}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-[720px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
              <th className="px-3 py-2.5">{en ? 'Service type' : '服务类型'}</th>
              <th className="px-3 py-2.5">{en ? 'Partner' : '合作方名称'}</th>
              <th className="px-3 py-2.5">{en ? 'Contact' : '联系人'}</th>
              <th className="px-3 py-2.5">{en ? 'Phone' : '电话'}</th>
              <th className="px-3 py-2.5">{en ? 'Email' : '邮箱'}</th>
              <th className="px-3 py-2.5">{en ? 'Note' : '备注'}</th>
              <th className="px-3 py-2.5">{en ? 'Active' : '启用'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.service_type} className="border-b border-gray-100 last:border-b-0">
                <td className="px-3 py-3 font-medium text-gray-900">
                  {en ? SERVICE_LABELS[row.service_type].en : SERVICE_LABELS[row.service_type].zh}
                </td>
                <td className="px-3 py-3 text-gray-800">
                  <span className="block max-w-[160px] truncate" title={row.partner_name}>
                    {row.partner_name}
                  </span>
                </td>
                <td className="px-3 py-3 text-gray-800">{row.contact_name}</td>
                <td className="px-3 py-3 whitespace-nowrap text-gray-800">{row.phone}</td>
                <td className="px-3 py-3 text-gray-800">
                  <span className="block max-w-[200px] truncate" title={row.email}>
                    {row.email}
                  </span>
                </td>
                <td className="px-3 py-3 text-gray-600">
                  <span className="block max-w-[220px] truncate" title={row.note}>
                    {row.note}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      row.is_active ? 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-400 line-through'
                    }`}
                  >
                    {row.is_active ? (en ? 'Yes' : '是') : en ? 'No' : '否'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
