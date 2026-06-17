/** AGM budget line revenue vs expense classification */

export type AgmBudgetType = 'revenue' | 'expense';

const REVENUE_CATEGORY_PATTERNS: RegExp[] = [
  /^strata\s*fees?$/i,
  /^ev\s*charging$/i,
  /^keys?\s*\/?\s*fobs?$/i,
  /^move\s*in\s*\/?\s*out\s*charges?$/i,
  /^interest\s*income$/i,
];

/** Match known revenue categories (case-insensitive, flexible spacing). */
export function classifyAgmBudgetType(category: string): AgmBudgetType {
  const normalized = category.trim().replace(/\s+/g, ' ');
  for (const pattern of REVENUE_CATEGORY_PATTERNS) {
    if (pattern.test(normalized)) return 'revenue';
  }
  // Broader contains-match for AI-extracted labels
  const lower = normalized.toLowerCase();
  if (lower.includes('strata fee')) return 'revenue';
  if (lower.includes('ev charging')) return 'revenue';
  if (lower.includes('key') && lower.includes('fob')) return 'revenue';
  if (lower.includes('move in') && lower.includes('out')) return 'revenue';
  if (lower.includes('interest income')) return 'revenue';
  return 'expense';
}

export function agmBudgetTypeLabel(type: AgmBudgetType, en: boolean): string {
  if (type === 'revenue') return en ? 'Revenue' : '收入';
  return en ? 'Expense' : '支出';
}

export type AgmBudgetLineWithType = {
  category: string;
  amount: number;
  budget_type: AgmBudgetType;
};

export function normalizeAgmBudgetLine(
  line: Partial<AgmBudgetLineWithType> & { category?: string; amount?: number },
): AgmBudgetLineWithType {
  const category = String(line.category ?? '').trim();
  const amount = Number(line.amount ?? 0);
  const budget_type =
    line.budget_type === 'revenue' || line.budget_type === 'expense'
      ? line.budget_type
      : classifyAgmBudgetType(category);
  return { category, amount, budget_type };
}

export function sumAgmBudgetLines(lines: AgmBudgetLineWithType[]): {
  revenueTotal: number;
  expenseTotal: number;
  netBudget: number;
} {
  let revenueTotal = 0;
  let expenseTotal = 0;
  for (const line of lines) {
    const amt = Number.isFinite(line.amount) ? line.amount : 0;
    if (line.budget_type === 'revenue') revenueTotal += amt;
    else expenseTotal += amt;
  }
  return { revenueTotal, expenseTotal, netBudget: revenueTotal - expenseTotal };
}

export function applyAgmBudgetTypes<T extends { category: string; amount: number }>(
  lines: T[],
): (T & { budget_type: AgmBudgetType })[] {
  return lines.map((l) => ({
    ...l,
    budget_type: classifyAgmBudgetType(l.category),
  }));
}
