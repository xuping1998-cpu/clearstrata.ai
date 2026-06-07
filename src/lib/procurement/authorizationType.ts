export type ProcurementAuthorizationType =
  | 'small_unplanned'
  | 'emergency'
  | 'major_unplanned';

export const AUTHORIZATION_TYPE_OPTIONS: {
  value: ProcurementAuthorizationType;
  label: { en: string; zh: string };
  description: { en: string; zh: string };
}[] = [
  {
    value: 'small_unplanned',
    label: { en: 'Small unplanned purchase', zh: '小额计划外采购' },
    description: {
      en: 'Unplanned expenses up to $500. The manager may execute, but must upload invoices. Subject to AI market reference, repeat-purchase alerts and monthly audit oversight.',
      zh: '$500 以下计划外支出。经理可执行，但必须上传发票，接受 AI 市场参考、重复采购和月度审计监督。',
    },
  },
  {
    value: 'emergency',
    label: { en: 'Emergency event', zh: '突发事件' },
    description: {
      en: 'e.g. leaks, burst pipes, elevator outage, fire-safety faults. Arrange inspection, obtain quotes, notify council, and run AI market reference.',
      zh: '例如漏水、爆管、电梯停摆、消防故障。应先安排检查、形成报价、通知 Council，并进行 AI 市场参考。',
    },
  },
  {
    value: 'major_unplanned',
    label: { en: 'Major unplanned expense', zh: '重大计划外支出' },
    description: {
      en: 'Larger unplanned items that may affect the CRF or owner interests. Council resolution recommended; SGM when appropriate.',
      zh: '金额较大或可能影响 CRF / 业主利益的计划外项目。建议形成 Council 决议，必要时进入 SGM。',
    },
  },
];

export function parseEstimatedBudget(value: string | number | null | undefined): number {
  if (value == null || value === '') return 0;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : 0;
}

/** Suggested lane only — user may override. Priority assists recommendation; not used for enforcement. */
export function suggestAuthorizationType(params: {
  estimatedBudget: string | number | null | undefined;
  priority?: string | null;
  crfBalance?: number | null;
}): ProcurementAuthorizationType {
  const budget = parseEstimatedBudget(params.estimatedBudget);
  const crf = params.crfBalance != null ? Number(params.crfBalance) : null;

  if (budget > 0 && budget <= 500) return 'small_unplanned';
  if (params.priority === 'urgent') return 'emergency';
  if (crf != null && Number.isFinite(crf) && crf > 0 && budget > 0 && budget >= crf * 0.1) {
    return 'major_unplanned';
  }
  return 'major_unplanned';
}

export function isCrfSgmSuggested(
  estimatedBudget: string | number | null | undefined,
  crfBalance: number | null | undefined,
): boolean {
  const budget = parseEstimatedBudget(estimatedBudget);
  const crf = crfBalance != null ? Number(crfBalance) : null;
  if (budget <= 0 || crf == null || !Number.isFinite(crf) || crf <= 0) return false;
  return budget >= crf * 0.1;
}

export function getAuthorizationTypeLabel(
  type: string | null | undefined,
  languageEn: boolean,
): string {
  if (!type) {
    return languageEn ? 'Unclassified authorization' : '未分类授权';
  }
  const found = AUTHORIZATION_TYPE_OPTIONS.find((o) => o.value === type);
  if (!found) return type;
  return languageEn ? found.label.en : found.label.zh;
}

export function authorizationTypeBadgeClass(type: string | null | undefined): string {
  switch (type) {
    case 'small_unplanned':
      return 'bg-sky-100 text-sky-800';
    case 'emergency':
      return 'bg-orange-100 text-orange-800';
    case 'major_unplanned':
      return 'bg-violet-100 text-violet-800';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}
