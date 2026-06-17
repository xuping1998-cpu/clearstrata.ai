/** AGM budget document helpers */

export type AgmBudgetDocumentStatus = 'pending_parse' | 'parsed' | 'approved';

export type AgmBudgetDraftLine = {
  category: string;
  amount: number;
};

export type AgmBudgetDocumentRow = {
  id: string;
  property_id: string;
  file_name: string;
  storage_path: string;
  status: AgmBudgetDocumentStatus | string;
  fiscal_year: number | null;
  parsed_draft: { fiscal_year?: number; lines?: AgmBudgetDraftLine[] } | AgmBudgetDraftLine[] | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export function agmBudgetStatusLabel(status: string | null | undefined, en: boolean): string {
  switch (status) {
    case 'pending_parse':
      return en ? 'Pending parse' : '待解析';
    case 'parsed':
      return en ? 'Parsed' : '已解析';
    case 'approved':
      return en ? 'Approved' : '已批准';
    default:
      return status ?? (en ? 'Unknown' : '未知');
  }
}

export function sanitizeAgmBudgetFileName(name: string): string {
  const base = name.replace(/[^\w.\-()+\s]/g, '_').replace(/\s+/g, '_');
  return base.slice(0, 120) || 'agm-budget.pdf';
}

export function buildAgmBudgetStoragePath(propertyId: string, fileName: string): string {
  const safe = sanitizeAgmBudgetFileName(fileName);
  return `agm-budgets/${propertyId}/${Date.now()}-${safe}`;
}

export function extractDraftLines(
  draft: AgmBudgetDocumentRow['parsed_draft'],
): AgmBudgetDraftLine[] {
  if (!draft) return [];
  if (Array.isArray(draft)) return draft;
  if (typeof draft === 'object' && Array.isArray(draft.lines)) return draft.lines;
  return [];
}

export function extractDraftFiscalYear(
  doc: Pick<AgmBudgetDocumentRow, 'fiscal_year' | 'parsed_draft'>,
): number | null {
  if (doc.fiscal_year != null) return doc.fiscal_year;
  const draft = doc.parsed_draft;
  if (draft && typeof draft === 'object' && !Array.isArray(draft) && draft.fiscal_year != null) {
    return draft.fiscal_year;
  }
  return null;
}
