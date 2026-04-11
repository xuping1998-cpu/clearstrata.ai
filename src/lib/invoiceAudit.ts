import { supabase } from './supabase';

export type RunInvoiceAuditResult = {
  audited_invoice_count: number;
  hit_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  fiscal_year: number;
  property_id: string;
};

function parseRunAudit(raw: unknown): RunInvoiceAuditResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  return {
    audited_invoice_count: Number(o.audited_invoice_count ?? 0),
    hit_count: Number(o.hit_count ?? 0),
    high_count: Number(o.high_count ?? 0),
    medium_count: Number(o.medium_count ?? 0),
    low_count: Number(o.low_count ?? 0),
    fiscal_year: Number(o.fiscal_year ?? 0),
    property_id: String(o.property_id ?? ''),
  };
}

/** Rebuild open rule-audit rows for a property + fiscal year (V1 rules). */
export async function runInvoiceAuditForProperty(
  propertyId: string,
  fiscalYear: number
): Promise<{ data: RunInvoiceAuditResult | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('run_invoice_audit_for_property', {
    p_property_id: propertyId,
    p_year: fiscalYear,
  });
  if (error) {
    return { data: null, error: new Error(error.message) };
  }
  return { data: parseRunAudit(data), error: null };
}
