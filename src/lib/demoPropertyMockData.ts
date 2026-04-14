/**
 * 纯前端演示楼数据：不得用于真实 API 请求或持久化。
 * 字段形状贴近业务类型，便于表格/卡片直接渲染。
 */

export const DEMO_PROPERTY_MOCK_ID = '00000000-0000-4000-a000-000000000001';

export type DemoMemberRow = {
  user_id: string;
  role: string;
  status: string;
  unit_no: string | null;
  email: string;
  full_name_en: string;
};

export const DEMO_MEMBERS: DemoMemberRow[] = [
  {
    user_id: '10000000-0000-4000-a000-000000000001',
    role: 'council',
    status: 'active',
    unit_no: '1201',
    email: 'chair@demo.clearstrata',
    full_name_en: '张伟（业委会主任）',
  },
  {
    user_id: '10000000-0000-4000-a000-000000000002',
    role: 'owner',
    status: 'active',
    unit_no: '304',
    email: 'owner304@demo.clearstrata',
    full_name_en: '李敏',
  },
  {
    user_id: '10000000-0000-4000-a000-000000000003',
    role: 'owner',
    status: 'active',
    unit_no: '508',
    email: 'owner508@demo.clearstrata',
    full_name_en: '王强',
  },
  {
    user_id: '10000000-0000-4000-a000-000000000004',
    role: 'viewer',
    status: 'active',
    unit_no: 'B102',
    email: 'tenant@demo.clearstrata',
    full_name_en: '租户 Chen',
  },
];

export type DemoFinanceSnapshot = {
  monthSpendCents: number;
  anomalyCents: number;
  budgetUsedPct: number;
  ytdSpendCents: number;
};

export const DEMO_FINANCE: DemoFinanceSnapshot = {
  monthSpendCents: 8243000,
  anomalyCents: 1200000,
  budgetUsedPct: 118,
  ytdSpendCents: 48200000,
};

export type DemoInvoiceRow = {
  id: string;
  vendor_name: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  status: string;
  risk_label: string;
  risk_level: 'normal' | 'warn' | 'high';
};

export const DEMO_INVOICES: DemoInvoiceRow[] = [
  {
    id: 'a0000001-0000-4000-a000-000000000001',
    vendor_name: 'TELUS Communications',
    invoice_number: 'INV-TEL-2026-0312',
    invoice_date: '2026-03-12',
    total_amount: 383.73,
    status: 'verified',
    risk_label: '单价高于同类 23%',
    risk_level: 'warn',
  },
  {
    id: 'a0000001-0000-4000-a000-000000000002',
    vendor_name: 'Pacific Building Maintenance Ltd.',
    invoice_number: 'INV-PBM-2026-0288',
    invoice_date: '2026-03-08',
    total_amount: 12000,
    status: 'pending_review',
    risk_label: '超预算 · 未附三方比价',
    risk_level: 'high',
  },
  {
    id: 'a0000001-0000-4000-a000-000000000003',
    vendor_name: 'Elevator Services Inc.',
    invoice_number: 'INV-ESI-2026-0199',
    invoice_date: '2026-02-26',
    total_amount: 8500,
    status: 'paid',
    risk_label: '与历史均价一致',
    risk_level: 'normal',
  },
  {
    id: 'a0000001-0000-4000-a000-000000000004',
    vendor_name: 'Strata Insurance Brokers',
    invoice_number: 'INV-SIB-2026-0101',
    invoice_date: '2026-01-15',
    total_amount: 22450,
    status: 'verified',
    risk_label: '续保条款变更需公示',
    risk_level: 'warn',
  },
];

export function formatDemoCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
}

export function formatDemoCents(cents: number): string {
  return formatDemoCurrency(cents / 100);
}
