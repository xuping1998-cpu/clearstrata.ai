import { supabase } from '../../lib/supabase';
import type { AgmBudgetDraftLine } from './agmBudgetDocuments';

export async function fetchAgmBudgetDocuments(
  propertyId: string,
): Promise<import('./agmBudgetDocuments').AgmBudgetDocumentRow[]> {
  const { data, error } = await supabase
    .from('agm_budget_documents')
    .select(
      'id, property_id, file_name, storage_path, status, fiscal_year, parsed_draft, notes, created_by, created_at',
    )
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !data) return [];
  return data as import('./agmBudgetDocuments').AgmBudgetDocumentRow[];
}

export async function saveAgmBudgetDraft(
  documentId: string,
  fiscalYear: number,
  lines: AgmBudgetDraftLine[],
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('agm_budget_documents')
    .update({
      fiscal_year: fiscalYear,
      parsed_draft: { fiscal_year: fiscalYear, lines },
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  return { error: error?.message ?? null };
}

export async function approveAgmBudgetDocument(
  documentId: string,
  fiscalYear: number,
  lines: AgmBudgetDraftLine[],
): Promise<{ linesWritten: number; error: string | null }> {
  const payload = lines
    .filter((l) => l.category.trim().length > 0 && Number.isFinite(l.amount) && l.amount >= 0)
    .map((l) => ({
      category: l.category.trim(),
      amount: l.amount,
      budget_type: l.budget_type === 'revenue' ? 'revenue' : 'expense',
    }));

  const { data, error } = await supabase.rpc('approve_agm_budget_document', {
    p_document_id: documentId,
    p_fiscal_year: fiscalYear,
    p_lines: payload,
  });

  if (error) {
    return { linesWritten: 0, error: error.message };
  }

  const raw = data as { ok?: boolean; error?: string; lines_written?: number } | null;
  if (!raw?.ok) {
    return { linesWritten: 0, error: raw?.error ?? 'approve_failed' };
  }

  return { linesWritten: Number(raw.lines_written ?? 0), error: null };
}

export async function fetchAgmBudgetLines(
  propertyId: string,
  fiscalYear: number,
): Promise<{ category: string; budget_amount: number; budget_type: string }[]> {
  const { data, error } = await supabase
    .from('agm_budget_lines')
    .select('category, budget_amount, budget_type')
    .eq('property_id', propertyId)
    .eq('fiscal_year', fiscalYear)
    .order('category', { ascending: true });

  if (error || !data) return [];
  return data.map((r) => ({
    category: String(r.category),
    budget_amount: Number(r.budget_amount),
    budget_type: String(r.budget_type ?? 'expense'),
  }));
}
