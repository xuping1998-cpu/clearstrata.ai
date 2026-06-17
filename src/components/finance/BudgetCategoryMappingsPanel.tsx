import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import {
  createBudgetCategoryMapping,
  deleteBudgetCategoryMapping,
  generateBudgetCategoryMappingSuggestions,
  hasApprovedAgmBudgetLines,
  listBudgetCategoryMappings,
  matchModeLabel,
  sourceTypeLabel,
  updateBudgetCategoryMapping,
  type BudgetCategoryMapping,
  type BudgetCategoryMappingMode,
  type BudgetCategoryMappingSourceType,
} from '../../features/finance/budgetCategoryMappings';
import { fetchAgmBudgetLines } from '../../features/finance/agmBudgetApi';
import { agmBudgetTypeLabel } from '../../features/finance/agmBudgetType';

type Props = {
  propertyId: string;
  fiscalYear: number;
  canManage: boolean;
  en: boolean;
};

const SOURCE_TYPES: BudgetCategoryMappingSourceType[] = [
  'invoice_vendor',
  'invoice_category',
  'bank_description',
  'bank_source',
  'procurement_vendor',
  'manual',
];

const MATCH_MODES: BudgetCategoryMappingMode[] = ['icontains', 'exact', 'regex'];

const emptyForm = {
  budget_category: '',
  budget_type: 'expense' as 'revenue' | 'expense',
  source_type: 'invoice_vendor' as BudgetCategoryMappingSourceType,
  match_pattern: '',
  match_mode: 'icontains' as BudgetCategoryMappingMode,
  confidence: 1,
};

export function BudgetCategoryMappingsPanel({
  propertyId,
  fiscalYear,
  canManage,
  en,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [hasLines, setHasLines] = useState(false);
  const [rows, setRows] = useState<BudgetCategoryMapping[]>([]);
  const [categories, setCategories] = useState<{ category: string; budget_type: string }[]>([]);
  const [generating, setGenerating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [approved, mappings, lines] = await Promise.all([
      hasApprovedAgmBudgetLines(propertyId, fiscalYear),
      listBudgetCategoryMappings(propertyId, fiscalYear),
      fetchAgmBudgetLines(propertyId, fiscalYear),
    ]);
    setHasLines(approved);
    setRows(mappings);
    setCategories(lines.map((l) => ({ category: l.category, budget_type: l.budget_type })));
    setLoading(false);
  }, [propertyId, fiscalYear]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleGenerate = async () => {
    if (!canManage || generating) return;
    setGenerating(true);
    setMessage(null);
    const { count, error } = await generateBudgetCategoryMappingSuggestions(propertyId, fiscalYear);
    setGenerating(false);
    if (error) {
      setMessage({ ok: false, text: error });
      return;
    }
    await load();
    setMessage({
      ok: true,
      text: en ? `Generated ${count} mapping suggestion(s).` : `已生成 ${count} 条建议映射。`,
    });
  };

  const handleToggleActive = async (row: BudgetCategoryMapping) => {
    if (!canManage) return;
    setSavingId(row.id);
    const { error } = await updateBudgetCategoryMapping(row.id, { is_active: !row.is_active });
    setSavingId(null);
    if (error) {
      setMessage({ ok: false, text: error });
      return;
    }
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!canManage) return;
    if (!window.confirm(en ? 'Delete this mapping?' : '删除此映射？')) return;
    const { error } = await deleteBudgetCategoryMapping(id);
    if (error) {
      setMessage({ ok: false, text: error });
      return;
    }
    await load();
  };

  const handleFieldChange = async (
    row: BudgetCategoryMapping,
    field: keyof BudgetCategoryMapping,
    value: string | number | boolean,
  ) => {
    if (!canManage) return;
    setSavingId(row.id);
    const { error } = await updateBudgetCategoryMapping(row.id, { [field]: value } as never);
    setSavingId(null);
    if (error) {
      setMessage({ ok: false, text: error });
      return;
    }
    await load();
  };

  const handleAdd = async () => {
    if (!canManage || !form.budget_category.trim() || !form.match_pattern.trim()) return;
    const cat = categories.find((c) => c.category === form.budget_category);
    const { error } = await createBudgetCategoryMapping({
      property_id: propertyId,
      fiscal_year: fiscalYear,
      budget_category: form.budget_category.trim(),
      budget_type: (cat?.budget_type === 'revenue' ? 'revenue' : form.budget_type) as 'revenue' | 'expense',
      source_type: form.source_type,
      match_pattern: form.match_pattern.trim(),
      match_mode: form.match_mode,
      confidence: form.confidence,
      is_active: true,
    });
    if (error) {
      setMessage({ ok: false, text: error });
      return;
    }
    setForm(emptyForm);
    setShowAdd(false);
    await load();
    setMessage({ ok: true, text: en ? 'Mapping added.' : '映射已添加。' });
  };

  if (loading) {
    return (
      <section className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {en ? 'Loading budget mappings…' : '正在加载预算科目映射…'}
      </section>
    );
  }

  if (!hasLines) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 shadow-sm">
        {en
          ? 'Upload and approve an AGM budget before configuring category mappings.'
          : '请先上传并批准 AGM 预算，再配置预算科目映射。'}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {en ? 'Budget Category Mapping' : '预算科目映射'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {en
              ? 'Map vendors, bank descriptions, and income sources to AGM-approved budget categories for execution analysis.'
              : '将供应商、银行描述与收入来源映射到 AGM 批准预算科目，供预算执行分析使用。'}
          </p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={generating}
              onClick={() => void handleGenerate()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-800 hover:bg-violet-100 disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-4" aria-hidden />
              )}
              {generating
                ? en
                  ? 'Generating…'
                  : '生成中…'
                : en
                  ? 'Generate Suggestions'
                  : '生成建议映射'}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-clearstrata-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-clearstrata-brand-800"
            >
              <Plus className="size-4" aria-hidden />
              {en ? 'Add mapping' : '新增映射'}
            </button>
          </div>
        ) : null}
      </div>

      {message ? (
        <p className={`mt-3 text-sm ${message.ok ? 'text-green-800' : 'text-red-700'}`}>{message.text}</p>
      ) : null}

      {showAdd && canManage ? (
        <div className="mt-4 grid gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs text-gray-600">
            {en ? 'Budget category' : '预算科目'}
            <select
              className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
              value={form.budget_category}
              onChange={(e) => {
                const cat = categories.find((c) => c.category === e.target.value);
                setForm((f) => ({
                  ...f,
                  budget_category: e.target.value,
                  budget_type: cat?.budget_type === 'revenue' ? 'revenue' : 'expense',
                }));
              }}
            >
              <option value="">{en ? 'Select…' : '选择…'}</option>
              {categories.map((c) => (
                <option key={c.category} value={c.category}>
                  {c.category}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-600">
            {en ? 'Source type' : '来源类型'}
            <select
              className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
              value={form.source_type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  source_type: e.target.value as BudgetCategoryMappingSourceType,
                }))
              }
            >
              {SOURCE_TYPES.map((s) => (
                <option key={s} value={s}>
                  {sourceTypeLabel(s, en)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-600">
            {en ? 'Match pattern' : '匹配模式'}
            <input
              className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
              value={form.match_pattern}
              onChange={(e) => setForm((f) => ({ ...f, match_pattern: e.target.value }))}
            />
          </label>
          <label className="text-xs text-gray-600">
            {en ? 'Match mode' : '匹配方式'}
            <select
              className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
              value={form.match_mode}
              onChange={(e) =>
                setForm((f) => ({ ...f, match_mode: e.target.value as BudgetCategoryMappingMode }))
              }
            >
              {MATCH_MODES.map((m) => (
                <option key={m} value={m}>
                  {matchModeLabel(m, en)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={() => void handleAdd()}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
            >
              {en ? 'Save' : '保存'}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              {en ? 'Cancel' : '取消'}
            </button>
          </div>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          {en
            ? 'No mappings yet. Click Generate Suggestions to seed from AGM budget lines.'
            : '尚无映射。可点击「生成建议映射」从 AGM 预算科目自动生成。'}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-2 py-2 font-medium">{en ? 'Type' : '类型'}</th>
                <th className="px-2 py-2 font-medium">{en ? 'Category' : '科目'}</th>
                <th className="px-2 py-2 font-medium">{en ? 'Source' : '来源'}</th>
                <th className="px-2 py-2 font-medium">{en ? 'Pattern' : '匹配词'}</th>
                <th className="px-2 py-2 font-medium">{en ? 'Mode' : '方式'}</th>
                <th className="px-2 py-2 font-medium">{en ? 'Conf.' : '置信'}</th>
                <th className="px-2 py-2 font-medium">{en ? 'Active' : '启用'}</th>
                {canManage ? (
                  <th className="px-2 py-2 font-medium">{en ? 'Actions' : '操作'}</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const busy = savingId === row.id;
                return (
                  <tr key={row.id} className="border-b border-gray-100 align-middle">
                    <td className="px-2 py-2 text-xs">
                      {agmBudgetTypeLabel(row.budget_type, en)}
                    </td>
                    <td className="px-2 py-2 font-medium text-gray-900">{row.budget_category}</td>
                    <td className="px-2 py-2 text-gray-700">
                      {canManage ? (
                        <select
                          disabled={busy}
                          className="max-w-[9rem] rounded border border-gray-200 bg-white px-1 py-0.5 text-xs"
                          value={row.source_type}
                          onChange={(e) =>
                            void handleFieldChange(row, 'source_type', e.target.value)
                          }
                        >
                          {SOURCE_TYPES.map((s) => (
                            <option key={s} value={s}>
                              {sourceTypeLabel(s, en)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        sourceTypeLabel(row.source_type, en)
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {canManage ? (
                        <input
                          disabled={busy}
                          className="min-w-[8rem] rounded border border-gray-200 px-1 py-0.5 text-xs"
                          defaultValue={row.match_pattern}
                          onBlur={(e) => {
                            if (e.target.value !== row.match_pattern) {
                              void handleFieldChange(row, 'match_pattern', e.target.value);
                            }
                          }}
                        />
                      ) : (
                        row.match_pattern
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {canManage ? (
                        <select
                          disabled={busy}
                          className="rounded border border-gray-200 bg-white px-1 py-0.5 text-xs"
                          value={row.match_mode}
                          onChange={(e) =>
                            void handleFieldChange(row, 'match_mode', e.target.value)
                          }
                        >
                          {MATCH_MODES.map((m) => (
                            <option key={m} value={m}>
                              {matchModeLabel(m, en)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        matchModeLabel(row.match_mode, en)
                      )}
                    </td>
                    <td className="px-2 py-2 tabular-nums text-gray-700">
                      {Number(row.confidence).toFixed(2)}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        disabled={!canManage || busy}
                        onClick={() => void handleToggleActive(row)}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-500'
                        } disabled:opacity-50`}
                      >
                        {row.is_active ? (en ? 'On' : '开') : en ? 'Off' : '关'}
                      </button>
                    </td>
                    {canManage ? (
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleDelete(row.id)}
                          className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          aria-label={en ? 'Delete' : '删除'}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
