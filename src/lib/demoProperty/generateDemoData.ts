/**
 * 确定性演示楼数据生成器：同 seed 输出一致，不同 seed 略有差异。
 * 仅用于前端展示，不得写入 residents / property_members 或调用入楼 RPC。
 */

export type GenerateDemoDataInput = {
  /** 任意稳定字符串：邀请码、visitor id、property id 等 */
  seed: string;
  buildingName?: string;
  /** 用于生成房号分布，默认 36 */
  unitCount?: number;
};

export type DemoInvoiceGen = {
  id: string;
  vendor_name: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  status: string;
  risk_label: string;
  risk_level: 'normal' | 'warn' | 'high';
};

export type DemoMemberGen = {
  user_id: string;
  role: string;
  status: string;
  unit_no: string;
  email: string;
  full_name_en: string;
};

export type DemoNoticeGen = {
  title: string;
  body: string;
  date: string;
};

export type DemoVendorRiskGen = {
  vendor: string;
  scoreLabel: string;
  note: string;
};

export type GeneratedDemoData = {
  /** 本月总支出（加元，非分） */
  totalSpend: number;
  /** 类似楼盘平均支出 */
  averageComparableSpend: number;
  /** 异常支出总额 */
  abnormalSpend: number;
  /** 每户异常支出示意区间（加元/月），与 abnormalSpend、unitCount 同 seed 稳定 */
  perHouseholdAbnormalMonthlyLow: number;
  perHouseholdAbnormalMonthlyHigh: number;
  /** 财年预算占用 % */
  budgetUsedPct: number;
  /** 年初至今总支出（加元） */
  ytdSpend: number;
  invoiceItems: DemoInvoiceGen[];
  memberList: DemoMemberGen[];
  notices: DemoNoticeGen[];
  vendorRisks: DemoVendorRiskGen[];
  /** 与旧组件兼容（分） */
  monthSpendCents: number;
  anomalyCents: number;
  ytdSpendCents: number;
  buildingLabel: string;
};

function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0 || 1;
}

function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)]!;
}

function padInv(n: number, rnd: () => number): string {
  const y = 2026;
  const m = 1 + Math.floor(rnd() * 3);
  const d = 1 + Math.floor(rnd() * 28);
  const prefix = ['PB', 'TE', 'ES', 'SI', 'MU', 'HV'][n % 6]!;
  return `INV-${prefix}-${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}-${String(n).padStart(3, '0')}`;
}

const FIRST_NAMES = ['Serena', 'Ping Xu', 'Simon', 'Wei', 'Min', 'Chen', 'Jordan', 'Alex', 'Taylor', 'Morgan'];
const LAST_HINT = ['', '（业委会）', '', '', '（租户）'];

const ROLE_POOL: Array<'council' | 'owner' | 'viewer'> = ['council', 'owner', 'owner', 'owner', 'viewer', 'owner'];

const SEEDED_BUILDING_NAMES = [
  'Sunset Towers',
  'Maple Residences',
  'Vancouver Heights',
  'Cedar Court',
  'Harbourview Strata',
  'Granville Gardens',
  'Pacific Point',
  'Riverside Commons',
];

function pickBuildingNameFromSeed(seedStr: string): string {
  const idx = hashSeed(seedStr + '|bldg') % SEEDED_BUILDING_NAMES.length;
  return SEEDED_BUILDING_NAMES[idx]!;
}

/**
 * 根据 seed 生成整套演示数据。保证存在异常支出与偏高/超预算发票。
 */
export function generateDemoData(input: GenerateDemoDataInput): GeneratedDemoData {
  const seedStr = input.seed.trim() || 'default-demo-seed';
  const rnd = mulberry32(hashSeed(seedStr));
  const buildingLabel = input.buildingName?.trim() || pickBuildingNameFromSeed(seedStr);

  // 本月总支出：约 7.8万–12.9 万加元
  const totalSpend = Math.round(78000 + rnd() * 51000);
  // 对标盘略低，制造「我们可能偏高」感
  const avgFactor = 0.72 + rnd() * 0.14;
  const averageComparableSpend = Math.round(totalSpend * avgFactor);
  // 异常：10%–22%，下限避免过小
  const abnormalSpend = Math.max(8200, Math.round(totalSpend * (0.1 + rnd() * 0.12)));
  const budgetUsedPct = Math.min(132, Math.round(96 + rnd() * 28));
  const ytdSpend = Math.round(totalSpend * (3.6 + rnd() * 1.4));

  const cap = Math.max(16, Math.min(120, input.unitCount ?? 48));
  const shareUnits = Math.max(28, Math.min(96, cap));
  const rawPer = abnormalSpend / shareUnits;
  let perHouseholdAbnormalMonthlyLow = Math.round(rawPer * (0.42 + rnd() * 0.12));
  let perHouseholdAbnormalMonthlyHigh = Math.round(rawPer * (0.68 + rnd() * 0.22));
  perHouseholdAbnormalMonthlyLow = Math.max(200, Math.min(520, perHouseholdAbnormalMonthlyLow));
  perHouseholdAbnormalMonthlyHigh = Math.max(
    perHouseholdAbnormalMonthlyLow + 40,
    Math.min(600, Math.max(perHouseholdAbnormalMonthlyHigh, perHouseholdAbnormalMonthlyLow + 80)),
  );

  const monthSpendCents = totalSpend * 100;
  const anomalyCents = abnormalSpend * 100;
  const ytdSpendCents = ytdSpend * 100;

  // 固定结构 + 金额抖动，保证 TELUS / 清洁 / 电梯 与风险标签
  const telAmt = Math.round((360 + rnd() * 90) * 100) / 100;
  const cleanAmt = Math.round(13200 + rnd() * 4200);
  const elevAmt = Math.round(15200 + rnd() * 4800);
  const insAmt = Math.round(19800 + rnd() * 6000);
  const utilAmt = Math.round(2800 + rnd() * 900);

  const invoices: DemoInvoiceGen[] = [
    {
      id: `inv-${hashSeed(seedStr + '1').toString(16)}`,
      vendor_name: 'TELUS Communications',
      invoice_number: padInv(1, rnd),
      invoice_date: '2026-03-02',
      total_amount: telAmt,
      status: 'verified',
      risk_label: '偏高',
      risk_level: 'warn',
    },
    {
      id: `inv-${hashSeed(seedStr + '2').toString(16)}`,
      vendor_name: 'Pacific Building Maintenance Ltd.',
      invoice_number: padInv(2, rnd),
      invoice_date: '2026-03-08',
      total_amount: cleanAmt,
      status: 'pending_review',
      risk_label: '超预算',
      risk_level: 'high',
    },
    {
      id: `inv-${hashSeed(seedStr + '3').toString(16)}`,
      vendor_name: 'Elevator Services Inc.',
      invoice_number: padInv(3, rnd),
      invoice_date: '2026-02-26',
      total_amount: elevAmt,
      status: 'paid',
      risk_label: '偏高',
      risk_level: 'warn',
    },
    {
      id: `inv-${hashSeed(seedStr + '4').toString(16)}`,
      vendor_name: 'Strata Insurance Brokers',
      invoice_number: padInv(4, rnd),
      invoice_date: '2026-01-18',
      total_amount: insAmt,
      status: 'verified',
      risk_label: rnd() > 0.45 ? '条款变更需公示' : '续保核对中',
      risk_level: rnd() > 0.55 ? 'warn' : 'normal',
    },
    {
      id: `inv-${hashSeed(seedStr + '5').toString(16)}`,
      vendor_name: 'Metro Utilities Gas & Electric',
      invoice_number: padInv(5, rnd),
      invoice_date: '2026-03-14',
      total_amount: utilAmt,
      status: 'verified',
      risk_label: '与预算接近',
      risk_level: 'normal',
    },
  ];

  if (rnd() > 0.35) {
    const extra = Math.round(4200 + rnd() * 3800);
    invoices.push({
      id: `inv-${hashSeed(seedStr + '6').toString(16)}`,
      vendor_name: pick(['Landscape Pro Ltd.', 'Secure Access Systems', 'HVAC North Ltd.'], rnd),
      invoice_number: padInv(6, rnd),
      invoice_date: '2026-03-01',
      total_amount: extra,
      status: 'pending_review',
      risk_label: rnd() > 0.5 ? '偏高' : '超预算',
      risk_level: rnd() > 0.5 ? 'warn' : 'high',
    });
  }

  const baseUnits = [
    '101', '109', '112', '1201', '204', '508', '715', '1508', '88', 'B102', '1602', '305', '412', '908',
  ];
  const rot = hashSeed(seedStr + 'unitsrot') % baseUnits.length;

  const nMembers = Math.min(8, Math.max(4, 4 + Math.floor(rnd() * Math.min(5, 2 + cap / 40))));
  const members: DemoMemberGen[] = [];
  for (let i = 0; i < nMembers; i++) {
    const unit = baseUnits[(rot + i) % baseUnits.length]!;

    const fn = FIRST_NAMES[(i + hashSeed(seedStr + String(i))) % FIRST_NAMES.length]!;
    const hint = LAST_HINT[(i + hashSeed(seedStr + 'h')) % LAST_HINT.length]!;
    const role = i === 0 ? 'council' : ROLE_POOL[(i + hashSeed(seedStr + 'r')) % ROLE_POOL.length]!;

    const part = (hashSeed(seedStr + 'm' + i) >>> 0).toString(16).padStart(12, '0').slice(0, 12);
    members.push({
      user_id: `10000000-0000-4000-a000-${part}`,
      role,
      status: 'active',
      unit_no: unit,
      email: `demo${i}@${hashSeed(seedStr + 'e' + i).toString(16).slice(0, 8)}.clearstrata`,
      full_name_en: `${fn}${hint}`,
    });
  }

  const notices: DemoNoticeGen[] = [
    {
      title: '本月公共电费公示',
      body: '管理处已上传分项读数，业主可于「财务报表」中查看明细（演示数据）。',
      date: '2026-03-10',
    },
    {
      title: '清洁合同续签说明',
      body: '业委会正在比选三家供应商，欢迎业主在下次会议前提交意见（演示数据）。',
      date: '2026-03-05',
    },
  ];
  if (rnd() > 0.4) {
    notices.push({
      title: '电梯年检提醒',
      body: '年检费用已计入本月支出，请关注异常标记中的电梯类目（演示数据）。',
      date: '2026-02-28',
    });
  }

  const vendorRisks: DemoVendorRiskGen[] = [
    {
      vendor: 'Pacific Building Maintenance Ltd.',
      scoreLabel: '偏高',
      note: '合同单价较同类楼盘高约 ' + (8 + Math.floor(rnd() * 12)) + '%（演示）。',
    },
    {
      vendor: 'TELUS Communications',
      scoreLabel: '关注',
      note: '用量波动正常，建议核对捆绑服务项（演示）。',
    },
    {
      vendor: 'Elevator Services Inc.',
      scoreLabel: '中等',
      note: '维修频次与楼龄匹配，建议保留维保记录备查（演示）。',
    },
  ];

  return {
    totalSpend,
    averageComparableSpend,
    abnormalSpend,
    perHouseholdAbnormalMonthlyLow,
    perHouseholdAbnormalMonthlyHigh,
    budgetUsedPct,
    ytdSpend,
    invoiceItems: invoices,
    memberList: members,
    notices,
    vendorRisks,
    monthSpendCents,
    anomalyCents,
    ytdSpendCents,
    buildingLabel,
  };
}
