import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { Building2, Shield, Truck, Wrench, X } from 'lucide-react';

export type HomeServicesDashboardCardProps = {
  langEn: boolean;
};

type ServiceId = 'plumbing' | 'rental' | 'insurance' | 'moving';

/** 占位：后续替换为真实合作商信息 */
type PartnerDetail = {
  partner: string;
  contact: string;
  phoneDisplay: string;
  tel: string;
  email: string;
};

const DETAILS: Record<ServiceId, PartnerDetail> = {
  plumbing: {
    partner: 'Local Home Repair Partner',
    contact: 'Service Desk',
    phoneDisplay: '604-000-0000',
    tel: 'tel:+16040000000',
    email: 'repair@example.com',
  },
  rental: {
    partner: 'Rental Management Partner',
    contact: 'Rental Advisor',
    phoneDisplay: '604-000-0001',
    tel: 'tel:+16040000001',
    email: 'rental@example.com',
  },
  insurance: {
    partner: 'Insurance Broker Partner',
    contact: 'Insurance Advisor',
    phoneDisplay: '604-000-0002',
    tel: 'tel:+16040000002',
    email: 'insurance@example.com',
  },
  moving: {
    partner: 'Moving Partner',
    contact: 'Moving Coordinator',
    phoneDisplay: '604-000-0003',
    tel: 'tel:+16040000003',
    email: 'moving@example.com',
  },
};

type ServiceTile = {
  id: ServiceId;
  labelZh: string;
  labelEn: string;
  Icon: LucideIcon;
};

const SERVICES: readonly ServiceTile[] = [
  { id: 'plumbing', labelZh: '水电维修', labelEn: 'Plumbing & Electrical', Icon: Wrench },
  { id: 'rental', labelZh: '出租管理', labelEn: 'Rental Management', Icon: Building2 },
  { id: 'insurance', labelZh: '房屋保险', labelEn: 'Home Insurance', Icon: Shield },
  { id: 'moving', labelZh: '搬家服务', labelEn: 'Moving Services', Icon: Truck },
];

/**
 * 首页「居家服务」：服务卡片点开合作方联系方式（静态占位）。
 */
export function HomeServicesDashboardCard({ langEn }: HomeServicesDashboardCardProps) {
  const [openId, setOpenId] = useState<ServiceId | null>(null);

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openId]);

  const title = langEn ? 'Home Services' : '居家服务';
  const subtitle = langEn ? 'Make home matters easier' : '让家的事更省心';

  const copy = langEn
    ? {
        partnerLbl: 'Partner',
        contactLbl: 'Contact',
        phoneLbl: 'Phone',
        emailLbl: 'Email',
        noteLbl: 'Note',
        noteBody: 'Please contact the service provider directly',
        call: 'Call',
        emailBtn: 'Email',
        close: 'Close',
        overlay: 'Dismiss',
      }
    : {
        partnerLbl: '合作方',
        contactLbl: '联系人',
        phoneLbl: '电话',
        emailLbl: '邮箱',
        noteLbl: '备注',
        noteBody: '请直接联系服务商',
        call: '拨打电话',
        emailBtn: '发送邮件',
        close: '关闭',
        overlay: '关闭遮罩',
      };

  const openService = SERVICES.find((s) => s.id === openId);
  const detail = openId ? DETAILS[openId] : null;
  const modalTitle = openService ? (langEn ? openService.labelEn : openService.labelZh) : '';

  const modal =
    detail && openId
      ? createPortal(
          <div className="fixed inset-0 z-[380] flex items-end justify-center p-4 sm:items-center">
            <button
              type="button"
              className="absolute inset-0 bg-black/45"
              aria-label={copy.overlay}
              onClick={() => setOpenId(null)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="home-services-modal-title"
              className="relative z-10 max-h-[min(90vh,32rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-xl"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 id="home-services-modal-title" className="pr-8 text-lg font-bold text-gray-900">
                  {modalTitle}
                </h3>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                  onClick={() => setOpenId(null)}
                  aria-label={copy.close}
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>

              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{copy.partnerLbl}</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">{detail.partner}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{copy.contactLbl}</dt>
                  <dd className="mt-0.5 text-gray-900">{detail.contact}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{copy.phoneLbl}</dt>
                  <dd className="mt-0.5">
                    <a
                      href={detail.tel}
                      className="font-mono font-medium text-clearstrata-brand-800 underline-offset-2 hover:underline"
                    >
                      {detail.phoneDisplay}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{copy.emailLbl}</dt>
                  <dd className="mt-0.5 break-all">
                    <a
                      href={`mailto:${detail.email}`}
                      className="font-medium text-clearstrata-brand-800 underline-offset-2 hover:underline"
                    >
                      {detail.email}
                    </a>
                  </dd>
                </div>
                <div className="rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-gray-100">
                  <dt className="text-xs font-semibold text-gray-600">{copy.noteLbl}</dt>
                  <dd className="mt-1 text-gray-700">{copy.noteBody}</dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <a
                  href={detail.tel}
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-clearstrata-ui-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive"
                >
                  {copy.call}
                </a>
                <a
                  href={`mailto:${detail.email}`}
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-clearstrata-ui-softBorder bg-white px-4 py-2.5 text-sm font-semibold text-clearstrata-brand-900 hover:bg-clearstrata-brand-50"
                >
                  {copy.emailBtn}
                </a>
                <button
                  type="button"
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 sm:flex-none sm:min-w-[6rem]"
                  onClick={() => setOpenId(null)}
                >
                  {copy.close}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <section
        className="mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-4"
        aria-labelledby="home-services-heading"
        data-widget="home-services"
      >
        <div className="min-w-0">
          <h2 id="home-services-heading" className="text-base font-bold text-gray-900 sm:text-[17px]">
            {title}
          </h2>
          <p className="mt-px text-[13px] text-gray-600 sm:text-sm">{subtitle}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          {SERVICES.map(({ id, labelZh, labelEn, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setOpenId(id)}
              className={[
                'group flex min-h-[4.5rem] flex-col items-stretch justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-left shadow-sm sm:min-h-[5rem] lg:min-h-[5.25rem]',
                'outline-none ring-clearstrata-ui-primary/35 transition-colors',
                'hover:border-clearstrata-ui-softBorder hover:bg-clearstrata-ui-soft/50 hover:shadow-md',
                'focus-visible:ring-2 focus-visible:ring-offset-2',
                'active:scale-[0.99]',
              ].join(' ')}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-clearstrata-ui-soft ring-1 ring-clearstrata-ui-softBorder">
                <Icon className="h-5 w-5 text-clearstrata-brand-800" aria-hidden />
              </span>
              <span className="min-w-0 text-left text-[13px] font-semibold leading-snug text-gray-900 group-hover:text-clearstrata-brand-900">
                {langEn ? labelEn : labelZh}
              </span>
            </button>
          ))}
        </div>
      </section>
      {modal}
    </>
  );
}
