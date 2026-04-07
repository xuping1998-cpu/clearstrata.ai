/**
 * Invoice rule-audit engine codes (DB: invoice_anomalies.rule_code).
 * Extensible: add AI_* codes later without breaking rules_v1.
 */
export const INVOICE_AUDIT_RULE_CODES = {
  NO_QUOTE: 'no_quote',
  AMOUNT_GT_QUOTE_110: 'amount_gt_quote_110',
  NO_BUDGET_CATEGORY: 'no_budget_category',
  DUPLICATE_INVOICE: 'duplicate_invoice',
  VENDOR_PRICE_SPIKE: 'vendor_price_spike',
} as const;

export type InvoiceAuditRuleCode =
  (typeof INVOICE_AUDIT_RULE_CODES)[keyof typeof INVOICE_AUDIT_RULE_CODES];

export type InvoiceAuditSummary = {
  version?: number;
  engine?: string;
  evaluated_at?: string;
  severity?: 'none' | 'low' | 'medium' | 'high';
  rule_codes?: string[];
  counts?: { high?: number; medium?: number; low?: number };
  extensible?: { ai_rules?: unknown[] };
};
