import { useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import {
  COMPLIANCE_CONTRACT_TYPE_OPTIONS,
  type ComplianceContractType,
} from '@/lib/compliance/complianceContractType';
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_SUMMARY_FIELD_LABELS,
  EMPTY_COMPLIANCE_CONTRACT_META,
  normalizeComplianceContractMeta,
  parseContractDescription,
  resolveContractStatus,
  suggestContractStatus,
  type ComplianceContractMeta,
  type ComplianceContractStatus,
  type ContractSummaryFieldKey,
} from '@/lib/compliance/complianceContractMeta';

const SUMMARY_FIELD_KEYS: ContractSummaryFieldKey[] = [
  'vendorName',
  'startDate',
  'endDate',
  'autoRenewal',
  'terminationNotice',
  'fixedFee',
  'escalationClause',
  'serviceScope',
  'extraCharges',
];

const STATUS_OPTIONS: ComplianceContractStatus[] = [
  'active',
  'expiring',
  'terminated',
  'unknown',
];

export type ContractEditFormState = {
  title_zh: string;
  title_en: string;
  contract_type: ComplianceContractType | '';
  description_zh: string;
  description_en: string;
  status: ComplianceContractStatus;
  summary: ComplianceContractMeta;
};

type ComplianceDocLike = {
  id: string;
  title_en: string;
  title_zh?: string;
  description_en?: string;
  description_zh?: string;
};

function buildFormFromDoc(doc: ComplianceDocLike): ContractEditFormState {
  const parsed = parseContractDescription(doc.description_zh);
  const summary = normalizeComplianceContractMeta({
    ...(parsed.meta ?? {}),
    contractType: parsed.meta?.contractType || parsed.contractType || '',
  });
  const contractType = (parsed.contractType ||
    (summary.contractType as ComplianceContractType) ||
    '') as ComplianceContractType | '';

  return {
    title_zh: doc.title_zh?.trim() || doc.title_en?.trim() || '',
    title_en: doc.title_en?.trim() || '',
    contract_type: contractType,
    description_zh: parsed.visibleText,
    description_en: doc.description_en?.trim() || '',
    status: resolveContractStatus(summary),
    summary: {
      ...summary,
      contractType: contractType || summary.contractType,
    },
  };
}

export function ComplianceContractEditModal(props: {
  open: boolean;
  doc: ComplianceDocLike | null;
  languageEn: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (form: ContractEditFormState) => Promise<void>;
}) {
  const { open, doc, languageEn: l, saving, onClose, onSave } = props;
  const [form, setForm] = useState<ContractEditFormState>(() => ({
    title_zh: '',
    title_en: '',
    contract_type: '',
    description_zh: '',
    description_en: '',
    status: 'unknown',
    summary: { ...EMPTY_COMPLIANCE_CONTRACT_META },
  }));

  useEffect(() => {
    if (open && doc) {
      setForm(buildFormFromDoc(doc));
    }
  }, [open, doc?.id]);

  const suggestedStatus = useMemo(
    () =>
      suggestContractStatus({
        ...form.summary,
        contractType: form.contract_type || form.summary.contractType,
      }),
    [form.summary, form.contract_type],
  );

  const patchSummary = (key: ContractSummaryFieldKey, value: string) => {
    setForm((prev) => ({
      ...prev,
      summary: { ...prev.summary, [key]: value },
    }));
  };

  const handleSubmit = async () => {
    if (!form.title_zh.trim()) {
      alert(l ? 'Please enter contract name' : '请输入合同名称');
      return;
    }
    if (!form.contract_type) {
      alert(l ? 'Please select contract type' : '请选择合同类型');
      return;
    }
    await onSave(form);
  };

  if (!open || !doc) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-900">
            {l ? 'Edit contract' : '编辑合同'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={saving}
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
            {l
              ? 'Update the contract ledger without replacing the PDF. To upload a new version, use Upload document and keep the previous file on record.'
              : '更新合同台账，不会替换原 PDF。如需上传新版合同，请使用「上传文件」新增一份，旧合同将保留。'}
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {l ? 'Contract name*' : '合同名称*'}
            </label>
            <input
              type="text"
              value={form.title_zh}
              onChange={(e) => setForm((prev) => ({ ...prev, title_zh: e.target.value }))}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-[#1D9E75] outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {l ? 'English title (optional)' : '英文标题（可选）'}
            </label>
            <input
              type="text"
              value={form.title_en}
              onChange={(e) => setForm((prev) => ({ ...prev, title_en: e.target.value }))}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-[#1D9E75] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {l ? 'Contract type*' : '合同类型*'}
            </label>
            <select
              value={form.contract_type}
              onChange={(e) => {
                const ct = e.target.value as ComplianceContractType;
                setForm((prev) => ({
                  ...prev,
                  contract_type: ct,
                  summary: { ...prev.summary, contractType: ct },
                }));
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
            >
              <option value="">{l ? '-- Select contract type --' : '-- 请选择合同类型 --'}</option>
              {COMPLIANCE_CONTRACT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {l ? opt.label.en : opt.label.zh}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {l ? 'Contract status' : '合同状态'}
            </label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value as ComplianceContractStatus,
                }))
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
            >
              {STATUS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {l ? CONTRACT_STATUS_LABELS[value].en : CONTRACT_STATUS_LABELS[value].zh}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              {l ? 'Suggested from term dates: ' : '根据期限自动建议：'}
              <span className="font-medium text-slate-700">
                {l
                  ? CONTRACT_STATUS_LABELS[suggestedStatus].en
                  : CONTRACT_STATUS_LABELS[suggestedStatus].zh}
              </span>
              {suggestedStatus !== form.status ? (
                <button
                  type="button"
                  className="ml-2 text-[#1D9E75] hover:underline"
                  onClick={() => setForm((prev) => ({ ...prev, status: suggestedStatus }))}
                >
                  {l ? 'Apply suggestion' : '采用建议'}
                </button>
              ) : null}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {l ? 'Description (Chinese)' : '中文描述'}
            </label>
            <textarea
              value={form.description_zh}
              onChange={(e) => setForm((prev) => ({ ...prev, description_zh: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {l ? 'Description (English)' : '英文描述'}
            </label>
            <textarea
              value={form.description_en}
              onChange={(e) => setForm((prev) => ({ ...prev, description_en: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
            />
          </div>

          <div className="rounded-xl border border-sky-200 bg-slate-50/80 px-4 py-4">
            <h3 className="text-sm font-semibold text-sky-900 mb-3">
              {l ? 'Contract summary' : '合同摘要'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SUMMARY_FIELD_KEYS.map((key) => {
                const labels = CONTRACT_SUMMARY_FIELD_LABELS[key];
                const isWide = key === 'serviceScope' || key === 'extraCharges';
                const isDate = key === 'startDate' || key === 'endDate';
                return (
                  <label
                    key={key}
                    className={`block text-sm ${isWide ? 'md:col-span-2' : ''}`}
                  >
                    <span className="font-medium text-gray-700">
                      {l ? labels.en : labels.zh}
                    </span>
                    {isDate ? (
                      <input
                        type="date"
                        value={form.summary[key]}
                        onChange={(e) => patchSummary(key, e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    ) : key === 'serviceScope' || key === 'extraCharges' || key === 'escalationClause' ? (
                      <textarea
                        value={form.summary[key]}
                        onChange={(e) => patchSummary(key, e.target.value)}
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    ) : (
                      <input
                        type="text"
                        value={form.summary[key]}
                        onChange={(e) => patchSummary(key, e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              {l ? 'Cancel' : '取消'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !form.title_zh.trim() || !form.contract_type}
              className="flex-1 px-6 py-3 bg-[#1D9E75] text-white rounded-lg hover:bg-[#178562] transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {l ? 'Saving...' : '保存中...'}
                </>
              ) : (
                l ? 'Save changes' : '保存'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
