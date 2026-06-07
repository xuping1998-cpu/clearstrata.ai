import {
  embedContractTypeInDescription,
  extractContractTypeFromDescription,
  stripContractTypeFromDescription,
  type ComplianceContractType,
} from './complianceContractType';

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

export function normalizeComplianceContractMeta(
  partial?: Partial<ComplianceContractMeta> | null,
): ComplianceContractMeta {
  const p = partial ?? {};
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
  };
}

export function hasComplianceContractMetaContent(meta: ComplianceContractMeta): boolean {
  return Object.values(meta).some((v) => String(v).trim() !== '');
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

export type ContractSummaryFieldKey = keyof ComplianceContractMeta;

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
