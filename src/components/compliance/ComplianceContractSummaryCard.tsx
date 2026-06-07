import {
  CONTRACT_SUMMARY_FIELD_LABELS,
  hasComplianceContractMetaContent,
  normalizeComplianceContractMeta,
  type ComplianceContractMeta,
  type ContractSummaryFieldKey,
} from '@/lib/compliance/complianceContractMeta';
import { getContractTypeLabel } from '@/lib/compliance/complianceContractType';

const DISPLAY_FIELD_ORDER: ContractSummaryFieldKey[] = [
  'vendorName',
  'contractType',
  'startDate',
  'endDate',
  'autoRenewal',
  'terminationNotice',
  'fixedFee',
  'escalationClause',
  'serviceScope',
  'extraCharges',
];

function resolveFieldValue(
  key: ContractSummaryFieldKey,
  meta: ComplianceContractMeta,
  languageEn: boolean,
): string {
  const raw = meta[key]?.trim() ?? '';
  if (!raw) return '';
  if (key === 'contractType') {
    return getContractTypeLabel(raw, languageEn) ?? raw;
  }
  return raw;
}

export function ComplianceContractSummaryCard(props: {
  meta: ComplianceContractMeta;
  languageEn: boolean;
}) {
  const { meta, languageEn: l } = props;
  const normalized = normalizeComplianceContractMeta(meta);
  const hasContent = hasComplianceContractMetaContent(normalized);

  const rows = DISPLAY_FIELD_ORDER.map((key) => {
    const value = resolveFieldValue(key, normalized, l);
    if (!value) return null;
    const label = CONTRACT_SUMMARY_FIELD_LABELS[key];
    return {
      key,
      label: l ? label.en : label.zh,
      value,
    };
  }).filter((r): r is { key: ContractSummaryFieldKey; label: string; value: string } => r != null);

  return (
    <div className="mb-4 rounded-xl border border-sky-200 bg-slate-50/90 px-4 py-3">
      <h4 className="text-sm font-semibold text-sky-900 mb-2">
        {l ? 'Contract Summary' : '合同摘要'}
      </h4>
      {!hasContent || rows.length === 0 ? (
        <p className="text-xs leading-relaxed text-slate-600">
          {l
            ? 'No contract summary yet. Add vendor, term dates, auto-renewal, termination notice and service scope so invoice review and procurement authorization can reference this contract.'
            : '尚未填写合同摘要。请补充供应商、期限、自动续约、终止通知和服务范围，以便后续发票审核和采购授权引用。'}
        </p>
      ) : (
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {rows.map((row) => (
            <div key={row.key} className={row.key === 'serviceScope' || row.key === 'extraCharges' ? 'md:col-span-2' : ''}>
              <dt className="text-xs font-medium text-slate-500">{row.label}</dt>
              <dd className="text-slate-800 whitespace-pre-wrap break-words">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
