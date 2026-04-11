export type AbnormalInvoiceItem = {
  id: string;
  vendor_name: string | null;
  total_amount: number | null;
  status: string | null;
  budget_anomaly_flag: string | null;
  invoice_date?: string | null;
  created_at?: string | null;
  /** Highest-priority open rule message from invoice_audit_results (V1). */
  audit_message_zh?: string | null;
  audit_message_en?: string | null;
  audit_rule_code?: string | null;
  audit_severity?: string | null;
};

export type AbnormalInvoicesResponse = {
  items: AbnormalInvoiceItem[];
};

export type DashboardKpi = {
  key: 'annual_budget' | 'annual_actual' | 'monthly_abnormal_invoices' | 'high_risk_alerts';
  label: string;
  value: string | number;
  hint?: string;
  link?: string;
};

export type DashboardKpisResponse = {
  items: DashboardKpi[];
};
