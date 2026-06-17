import { supabase } from '../../lib/supabase';

export type BudgetCategoryMappingSourceType =
  | 'invoice_vendor'
  | 'invoice_category'
  | 'bank_description'
  | 'bank_source'
  | 'procurement_vendor'
  | 'manual';

export type BudgetCategoryMappingMode = 'icontains' | 'exact' | 'regex';

export type BudgetCategoryMapping = {
  id: string;
  property_id: string;
  fiscal_year: number;
  budget_line_id: string | null;
  budget_category: string;
  budget_type: 'revenue' | 'expense';
  source_type: BudgetCategoryMappingSourceType;
  match_pattern: string;
  match_mode: BudgetCategoryMappingMode;
  confidence: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type BudgetCategoryMappingInput = {
  property_id: string;
  fiscal_year: number;
  budget_line_id?: string | null;
  budget_category: string;
  budget_type: 'revenue' | 'expense';
  source_type: BudgetCategoryMappingSourceType;
  match_pattern: string;
  match_mode?: BudgetCategoryMappingMode;
  confidence?: number;
  is_active?: boolean;
};

export function sourceTypeLabel(source: BudgetCategoryMappingSourceType, en: boolean): string {
  const map: Record<BudgetCategoryMappingSourceType, [string, string]> = {
    invoice_vendor: ['Invoice vendor', '发票供应商'],
    invoice_category: ['Invoice category', '发票类别'],
    bank_description: ['Bank description', '银行描述'],
    bank_source: ['Bank source', '银行来源'],
    procurement_vendor: ['Procurement vendor', '采购供应商'],
    manual: ['Manual', '手动'],
  };
  const pair = map[source];
  return en ? pair[0] : pair[1];
}

export function matchModeLabel(mode: BudgetCategoryMappingMode, en: boolean): string {
  if (mode === 'exact') return en ? 'Exact' : '精确';
  if (mode === 'regex') return en ? 'Regex' : '正则';
  return en ? 'Contains' : '包含';
}

export async function listBudgetCategoryMappings(
  propertyId: string,
  fiscalYear: number,
): Promise<BudgetCategoryMapping[]> {
  const { data, error } = await supabase
    .from('budget_category_mappings')
    .select(
      'id, property_id, fiscal_year, budget_line_id, budget_category, budget_type, source_type, match_pattern, match_mode, confidence, is_active, created_at, updated_at',
    )
    .eq('property_id', propertyId)
    .eq('fiscal_year', fiscalYear)
    .order('budget_type', { ascending: true })
    .order('budget_category', { ascending: true })
    .order('source_type', { ascending: true });

  if (error || !data) return [];
  return data as BudgetCategoryMapping[];
}

export async function hasApprovedAgmBudgetLines(
  propertyId: string,
  fiscalYear: number,
): Promise<boolean> {
  const { count, error } = await supabase
    .from('agm_budget_lines')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId)
    .eq('fiscal_year', fiscalYear);

  return !error && (count ?? 0) > 0;
}

export async function createBudgetCategoryMapping(
  input: BudgetCategoryMappingInput,
): Promise<{ data: BudgetCategoryMapping | null; error: string | null }> {
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('budget_category_mappings')
    .insert({
      ...input,
      match_mode: input.match_mode ?? 'icontains',
      confidence: input.confidence ?? 1,
      is_active: input.is_active ?? true,
      created_by: user.user?.id ?? null,
    })
    .select(
      'id, property_id, fiscal_year, budget_line_id, budget_category, budget_type, source_type, match_pattern, match_mode, confidence, is_active, created_at, updated_at',
    )
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as BudgetCategoryMapping, error: null };
}

export async function updateBudgetCategoryMapping(
  id: string,
  patch: Partial<
    Pick<
      BudgetCategoryMapping,
      | 'budget_category'
      | 'budget_type'
      | 'source_type'
      | 'match_pattern'
      | 'match_mode'
      | 'confidence'
      | 'is_active'
      | 'budget_line_id'
    >
  >,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('budget_category_mappings').update(patch).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteBudgetCategoryMapping(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('budget_category_mappings').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export async function generateBudgetCategoryMappingSuggestions(
  propertyId: string,
  fiscalYear: number,
): Promise<{ count: number; error: string | null }> {
  const { data, error } = await supabase.rpc('generate_budget_category_mapping_suggestions', {
    p_property_id: propertyId,
    p_fiscal_year: fiscalYear,
  });
  if (error) return { count: 0, error: error.message };
  return { count: typeof data === 'number' ? data : Number(data ?? 0), error: null };
}
