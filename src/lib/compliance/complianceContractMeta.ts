import {
  embedContractTypeInDescription,
  extractContractTypeFromDescription,
  stripContractTypeFromDescription,
  type ComplianceContractType,
} from './complianceContractType';

export type ComplianceContractStatus = 'active' | 'expiring' | 'terminated' | 'unknown';

export type ComplianceContractMeta = {
  vendorName: string;
  contractType: string;
  startDate: string;
  endDate: string;
  autoRenewal: string;
  terminationNotice: string;
  fixedFee: string;
  escalationClause: string;
  serviceScope: string;
  extraCharges: string;
  /** Ledger status; stored in contract-meta JSON (no dedicated DB column). */
  status?: string;
};

export const EMPTY_COMPLIANCE_CONTRACT_META: ComplianceContractMeta = {
  vendorName: '',
  contractType: '',
  startDate: '',
  endDate: '',
  autoRenewal: '',
  terminationNotice: '',
  fixedFee: '',
  escalationClause: '',
  serviceScope: '',
  extraCharges: '',
};

const CONTRACT_META_MARKER = '<!--clearstrata-contract-meta\n';

function optStr(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

const CONTRACT_STATUS_VALUES: ComplianceContractStatus[] = [
  'active',
  'expiring',
  'terminated',
  'unknown',
];

export function isComplianceContractStatus(v: string | null | undefined): v is ComplianceContractStatus {
  return CONTRACT_STATUS_VALUES.includes(v as ComplianceContractStatus);
}

export const CONTRACT_STATUS_LABELS: Record<
  ComplianceContractStatus,
  { en: string; zh: string }
> = {
  active: { en: 'Active', zh: '有效' },
  expiring: { en: 'Expiring', zh: '即将到期' },
  terminated: { en: 'Terminated', zh: '已终止' },
  unknown: { en: 'Pending review', zh: '待确认' },
};

export const CONTRACT_STATUS_BADGE_CLASS: Record<ComplianceContractStatus, string> = {
  active: 'bg-emerald-50 text-emerald-800',
  expiring: 'bg-amber-50 text-amber-900',
  terminated: 'bg-red-50 text-red-800',
  unknown: 'bg-slate-100 text-slate-700',
};

function parseDateOnlyLocal(iso: string): Date | null {
  const t = iso.trim();
  if (!t) return null;
  const d = new Date(`${t}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function isAutoRenewalEnabled(autoRenewal: string | null | undefined): boolean {
  const s = optStr(autoRenewal).toLowerCase();
  if (!s) return false;
  return (
    s === 'true' ||
    s === 'yes' ||
    s === 'y' ||
    s === '1' ||
    s.includes('auto') ||
    s.includes('自动') ||
    s === '是'
  );
}

/** Auto-suggest ledger status from term dates and auto-renewal (Council may override). */
export function suggestContractStatus(
  meta: Partial<ComplianceContractMeta> | null | undefined,
  refDate: Date = new Date(),
): ComplianceContractStatus {
  const end = optStr(meta?.endDate);
  if (!end) return 'unknown';

  const endD = parseDateOnlyLocal(end);
  if (!endD) return 'unknown';

  const today = startOfLocalDay(refDate);
  const endDay = startOfLocalDay(endD);

  if (today.getTime() > endDay.getTime()) {
    if (isAutoRenewalEnabled(meta?.autoRenewal)) return 'unknown';
    return 'terminated';
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntilEnd = Math.floor((endDay.getTime() - today.getTime()) / msPerDay);
  if (daysUntilEnd <= 30) return 'expiring';
  return 'active';
}

export function resolveContractStatus(
  meta: Partial<ComplianceContractMeta> | null | undefined,
  refDate: Date = new Date(),
): ComplianceContractStatus {
  const stored = optStr(meta?.status);
  if (isComplianceContractStatus(stored)) return stored;
  return suggestContractStatus(meta, refDate);
}

/** Map ledger status to compliance_docs.status for existing list stats. */
export function contractStatusToDocStatus(status: ComplianceContractStatus): string {
  if (status === 'terminated') return 'expired';
  if (status === 'expiring') return 'expiring';
  return 'valid';
}

export function normalizeComplianceContractMeta(
  partial?: Partial<ComplianceContractMeta> | null,
): ComplianceContractMeta {
  const p = partial ?? {};
  const statusRaw = optStr(p.status);
  return {
    vendorName: optStr(p.vendorName),
    contractType: optStr(p.contractType),
    startDate: optStr(p.startDate),
    endDate: optStr(p.endDate),
    autoRenewal: optStr(p.autoRenewal),
    terminationNotice: optStr(p.terminationNotice),
    fixedFee: optStr(p.fixedFee),
    escalationClause: optStr(p.escalationClause),
    serviceScope: optStr(p.serviceScope),
    extraCharges: optStr(p.extraCharges),
    status: isComplianceContractStatus(statusRaw) ? statusRaw : '',
  };
}

export function hasComplianceContractMetaContent(meta: ComplianceContractMeta): boolean {
  if (isComplianceContractStatus(optStr(meta.status))) return true;
  const { status: _status, ...fields } = meta;
  return Object.values(fields).some((v) => String(v).trim() !== '');
}

/** Summary card empty state — ledger status alone does not count as filled summary. */
export function hasComplianceContractSummaryContent(meta: ComplianceContractMeta): boolean {
  const { status: _status, ...fields } = meta;
  return Object.values(fields).some((v) => String(v).trim() !== '');
}

export function extractContractMetaFromDescription(
  description: string | null | undefined,
): ComplianceContractMeta | null {
  const s = description ?? '';
  const i = s.indexOf(CONTRACT_META_MARKER);
  if (i < 0) return null;
  const start = i + CONTRACT_META_MARKER.length;
  const end = s.indexOf('\n-->', start);
  if (end < 0) return null;
  const raw = s.slice(start, end).trim();
  try {
    const parsed = JSON.parse(raw) as Partial<ComplianceContractMeta>;
    const normalized = normalizeComplianceContractMeta(parsed);
    return hasComplianceContractMetaContent(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

export function stripContractMetaFromDescription(description: string | null | undefined): string {
  const s = description ?? '';
  const i = s.indexOf(CONTRACT_META_MARKER);
  if (i < 0) return s.trim();
  const end = s.indexOf('\n-->', i);
  if (end < 0) return s.trim();
  return `${s.slice(0, i)}${s.slice(end + '\n-->'.length)}`.replace(/^\s+|\s+$/g, '').trim();
}

/** Strip Phase Contract-1 type marker and Contract-2 meta marker; leave user-visible text only. */
export function stripAllContractMarkersFromDescription(
  description: string | null | undefined,
): string {
  return stripContractTypeFromDescription(stripContractMetaFromDescription(description));
}

export function embedContractMetaInDescription(
  description: string | null | undefined,
  meta: ComplianceContractMeta,
): string {
  /** Preserve existing contract-type block when layering meta on top. */
  const visible = stripContractMetaFromDescription(description ?? '');
  const payload = normalizeComplianceContractMeta(meta);
  if (!hasComplianceContractMetaContent(payload)) {
    return visible;
  }
  const block = `${CONTRACT_META_MARKER}${JSON.stringify(payload, null, 2)}\n-->`;
  return visible ? `${block}\n\n${visible}` : block;
}

/** Order: meta block → type block → visible user description. */
export function buildContractDescriptionZh(options: {
  userDescription: string | null | undefined;
  contractType?: ComplianceContractType | null;
  meta?: Partial<ComplianceContractMeta> | null;
}): string | null {
  const visible = stripAllContractMarkersFromDescription(options.userDescription ?? '');
  let metaPayload = normalizeComplianceContractMeta(options.meta);
  if (options.contractType && !metaPayload.contractType) {
    metaPayload = { ...metaPayload, contractType: options.contractType };
  }

  let result = visible;
  if (options.contractType) {
    result = embedContractTypeInDescription(result || null, options.contractType);
  }
  if (hasComplianceContractMetaContent(metaPayload)) {
    result = embedContractMetaInDescription(result, metaPayload);
  }

  return result.trim() || null;
}

export function parseContractDescription(description: string | null | undefined): {
  contractType: ComplianceContractType | null;
  meta: ComplianceContractMeta | null;
  visibleText: string;
} {
  return {
    contractType: extractContractTypeFromDescription(description),
    meta: extractContractMetaFromDescription(description),
    visibleText: stripAllContractMarkersFromDescription(description),
  };
}

export type ContractSummaryFieldKey = Exclude<keyof ComplianceContractMeta, 'status'>;

export const CONTRACT_SUMMARY_FIELD_LABELS: Record<
  ContractSummaryFieldKey,
  { en: string; zh: string }
> = {
  vendorName: { en: 'Vendor', zh: '供应商' },
  contractType: { en: 'Contract Type', zh: '合同类型' },
  startDate: { en: 'Start Date', zh: '开始日期' },
  endDate: { en: 'End Date', zh: '结束日期' },
  autoRenewal: { en: 'Auto Renewal', zh: '自动续约' },
  terminationNotice: { en: 'Termination Notice', zh: '终止通知期限' },
  fixedFee: { en: 'Fixed Fee', zh: '固定费用' },
  escalationClause: { en: 'Escalation Clause', zh: '涨价条款' },
  serviceScope: { en: 'Service Scope', zh: '服务范围' },
  extraCharges: { en: 'Extra Charges', zh: '额外收费条件' },
};
