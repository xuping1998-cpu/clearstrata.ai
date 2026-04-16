import { supabase } from './supabase';
import { checkApproval } from './approvalCheck';
import { checkBudget } from './budgetCheck';

export { checkApproval } from './approvalCheck';
export { checkBudget } from './budgetCheck';

async function hasInvoiceAiAuditRow(invoiceId: string, propertyId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('invoice_ai_audits')
    .select('id')
    .eq('invoice_id', invoiceId)
    .eq('property_id', propertyId)
    .maybeSingle();
  if (error) {
    console.warn('[invoice AI audit] exists check failed', invoiceId, error.message);
    return false;
  }
  return data != null;
}

export type InvoiceAuditRowInput = {
  id: string;
  property_id: string;
  fiscal_year: number | null;
  budget_category_id: string | null;
  total_amount: number | unknown;
  status: string;
  approved?: boolean | null;
};

/**
 * Client-side hybrid preview (hard flags). Server-side source of truth is Edge `run-invoice-ai-audit`.
 */
export async function runInvoiceAuditPreview(invoice: InvoiceAuditRowInput) {
  const [budgetInfo, approvalInfo] = await Promise.all([checkBudget(invoice), checkApproval(invoice)]);
  return { budgetInfo, approvalInfo };
}

/**
 * Runs full AI audit + persists `invoice_ai_audits` / `invoice_ai_audit_results` (incl. over_budget, bypass_approval).
 */
export async function runInvoiceAudit(
  invoiceId: string,
  propertyId: string,
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('run-invoice-ai-audit', {
    body: { invoice_id: invoiceId, property_id: propertyId },
  });
  if (error) {
    return { success: false, error: error.message };
  }
  const payload = data as { success?: boolean; error?: string } | null;
  if (payload && payload.success === false) {
    return { success: false, error: payload.error ?? 'AUDIT_FAILED' };
  }
  return { success: true };
}

/**
 * After a row is inserted into `invoices`, run AI audit in the background (non-blocking).
 * Results sync to `invoice_ai_audit_results` via DB trigger on `invoice_ai_audits`.
 */
export function scheduleInvoiceAiAuditAfterInsert(invoiceId: string, propertyId: string): void {
  console.info('[invoice upload] success', { invoiceId, propertyId, next: 'schedule AI audit' });

  void (async () => {
    try {
      const exists = await hasInvoiceAiAuditRow(invoiceId, propertyId);
      if (exists) {
        console.info('[invoice AI audit] auto trigger skipped — row already exists', { invoiceId });
        return;
      }

      console.info('[invoice AI audit] auto trigger invoke', { invoiceId, propertyId });
      const { data, error } = await supabase.functions.invoke('run-invoice-ai-audit', {
        body: { invoice_id: invoiceId, property_id: propertyId },
      });

      if (error) {
        console.warn('[invoice AI audit] invoke failed', { invoiceId, message: error.message });
        return;
      }

      const payload = data as { success?: boolean; error?: string } | null;
      if (payload && payload.success === false) {
        console.warn('[invoice AI audit] edge reported failure', { invoiceId, payload });
        return;
      }

      console.info('[invoice AI audit] invoke success', { invoiceId });
    } catch (e) {
      console.warn('[invoice AI audit] auto trigger error', { invoiceId, e });
    }
  })();
}
