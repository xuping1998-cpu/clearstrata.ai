export type AbnormalInvoiceItem = {
  id: string;
  vendor_name: string | null;
  total_amount: number | null;
  status: string | null;
  budget_anomaly_flag: string | null;
  invoice_date?: string | null;
  created_at?: string | null;
  audit_message_zh?: string | null;
  audit_message_en?: string | null;
  audit_rule_code?: string | null;
  audit_severity?: string | null;
};

export type AbnormalInvoicesResponse = {
  items: AbnormalInvoiceItem[];
};

export type DashboardKpi = {
  key:
    | 'annual_budget'
    | 'annual_actual'
    | 'over_budget'
    | 'bypass_approval'
    | 'monthly_abnormal_invoices'
    | 'high_risk_alerts';
  label: string;
  value: string | number;
  hint?: string;
  link?: string;
};

/** Aggregated AI audit figures for the home dashboard (`invoice_ai_audit_results`). */
export type DashboardAiRiskSummary = {
  monthlyAbnormalInvoices: number;
  pendingRiskItems: number;
  highRiskCount: number;
  criticalRiskCount: number;
  /** FY-scoped invoices with AI risk_score > 0.6 */
  abnormalInvoiceCount: number;
  /** FY-scoped: hard constraint from annual_budgets vs category spend. */
  overBudgetCount: number;
  /** FY-scoped: paid without formal approval (approved=false). */
  bypassApprovalCount: number;
  lastUpdatedAt?: string | null;
};

export type DashboardKpisResponse = {
  items: DashboardKpi[];
  /** Present when AI results loaded; null if query failed. */
  aiRisk: DashboardAiRiskSummary | null;
};

/** Recent list row for home “异常发票” card (AI only). */
export type RecentAiAuditInvoiceItem = {
  invoice_id: string;
  vendor_name: string | null;
  total_amount: number | null;
  invoice_date: string | null;
  status: string | null;
  risk_level: string;
  risk_score: number;
  summary: string;
  over_budget?: boolean;
  bypass_approval?: boolean;
};
