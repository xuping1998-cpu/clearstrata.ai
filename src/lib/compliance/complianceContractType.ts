export type ComplianceContractType =
  | 'elevator_maintenance'
  | 'landscaping'
  | 'waste_management'
  | 'cleaning'
  | 'fire_protection'
  | 'plumbing_electrical'
  | 'security'
  | 'property_management'
  | 'telecommunications'
  | 'insurance_related'
  | 'other';

export const COMPLIANCE_CONTRACT_TYPE_OPTIONS: {
  value: ComplianceContractType;
  label: { en: string; zh: string };
}[] = [
  { value: 'elevator_maintenance', label: { en: 'Elevator maintenance', zh: '电梯维保' } },
  { value: 'landscaping', label: { en: 'Landscaping', zh: '景观绿化' } },
  { value: 'waste_management', label: { en: 'Waste management', zh: '垃圾清运' } },
  { value: 'cleaning', label: { en: 'Cleaning', zh: '清洁服务' } },
  { value: 'fire_protection', label: { en: 'Fire protection', zh: '消防防护' } },
  { value: 'plumbing_electrical', label: { en: 'Plumbing & electrical', zh: '水电工程' } },
  { value: 'security', label: { en: 'Security', zh: '安防门禁' } },
  { value: 'property_management', label: { en: 'Property management', zh: '物业管理' } },
  { value: 'telecommunications', label: { en: 'Telecommunications', zh: '电信网络' } },
  { value: 'insurance_related', label: { en: 'Insurance-related', zh: '保险相关' } },
  { value: 'other', label: { en: 'Other', zh: '其他' } },
];

const CONTRACT_TYPE_MARKER = '<!--clearstrata-contract-type\n';

export function getContractTypeLabel(
  value: string | null | undefined,
  languageEn: boolean,
): string | null {
  if (!value) return null;
  const found = COMPLIANCE_CONTRACT_TYPE_OPTIONS.find((o) => o.value === value);
  if (!found) return value;
  return languageEn ? found.label.en : found.label.zh;
}

export function extractContractTypeFromDescription(
  description: string | null | undefined,
): ComplianceContractType | null {
  const s = description ?? '';
  const i = s.indexOf(CONTRACT_TYPE_MARKER);
  if (i < 0) return null;
  const start = i + CONTRACT_TYPE_MARKER.length;
  const end = s.indexOf('\n-->', start);
  if (end < 0) return null;
  const raw = s.slice(start, end).trim();
  const valid = COMPLIANCE_CONTRACT_TYPE_OPTIONS.some((o) => o.value === raw);
  return valid ? (raw as ComplianceContractType) : null;
}

export function stripContractTypeFromDescription(description: string | null | undefined): string {
  const s = description ?? '';
  const i = s.indexOf(CONTRACT_TYPE_MARKER);
  if (i < 0) return s.trim();
  const end = s.indexOf('\n-->', i);
  if (end < 0) return s.trim();
  return `${s.slice(0, i)}${s.slice(end + '\n-->'.length)}`.replace(/^\s+|\s+$/g, '').trim();
}

/** Persists contract type in description_zh without a dedicated DB column (UI-only phase). */
export function embedContractTypeInDescription(
  description: string | null | undefined,
  contractType: ComplianceContractType,
): string {
  const visible = stripContractTypeFromDescription(description ?? '');
  const block = `${CONTRACT_TYPE_MARKER}${contractType}\n-->`;
  return visible ? `${block}\n\n${visible}` : block;
}
