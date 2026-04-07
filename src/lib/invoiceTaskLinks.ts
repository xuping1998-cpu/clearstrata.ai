import { supabase } from './supabase';

export type LinkedTask = { taskId: string; title: string };

/** 发票 → 关联任务（invoices.related_task_id + task_invoices + manager_tasks.related_invoice_id） */
export async function fetchTasksForInvoice(
  invoiceId: string,
  propertyId: string,
): Promise<LinkedTask[]> {
  const map = new Map<string, string>();

  const { data: invMeta } = await supabase
    .from('invoices')
    .select('related_task_id')
    .eq('id', invoiceId)
    .eq('property_id', propertyId)
    .maybeSingle();

  if (invMeta?.related_task_id) {
    const { data: t } = await supabase
      .from('manager_tasks')
      .select('id, title')
      .eq('id', invMeta.related_task_id)
      .eq('property_id', propertyId)
      .maybeSingle();
    if (t) map.set(t.id, t.title || '—');
  }

  const { data: ti } = await supabase.from('task_invoices').select('task_id').eq('invoice_id', invoiceId);
  const taskIds = [...new Set((ti ?? []).map((x) => x.task_id))];

  if (taskIds.length > 0) {
    const { data: tasks } = await supabase
      .from('manager_tasks')
      .select('id, title, property_id')
      .in('id', taskIds)
      .eq('property_id', propertyId);
    for (const t of tasks ?? []) map.set(t.id, t.title || '—');
  }

  const { data: rel } = await supabase
    .from('manager_tasks')
    .select('id, title')
    .eq('property_id', propertyId)
    .eq('related_invoice_id', invoiceId);

  for (const t of rel ?? []) map.set(t.id, t.title || '—');

  return [...map.entries()].map(([taskId, title]) => ({ taskId, title }));
}

/** 批量：发票列表「来源」列 — 每张发票一个主任务标题 */
export async function fetchTaskTitleByInvoiceIds(
  propertyId: string,
  invoiceIds: string[],
): Promise<Map<string, LinkedTask>> {
  const out = new Map<string, LinkedTask>();
  if (invoiceIds.length === 0) return out;

  const { data: invDirect } = await supabase
    .from('invoices')
    .select('id, related_task_id')
    .in('id', invoiceIds)
    .eq('property_id', propertyId);

  const taskIds = new Set<string>();
  const invoiceToTaskFromColumn = new Map<string, string>();
  for (const row of invDirect ?? []) {
    if (row.related_task_id) {
      taskIds.add(row.related_task_id);
      if (!invoiceToTaskFromColumn.has(row.id)) invoiceToTaskFromColumn.set(row.id, row.related_task_id);
    }
  }

  const { data: ti } = await supabase
    .from('task_invoices')
    .select('invoice_id, task_id')
    .in('invoice_id', invoiceIds);

  const firstTaskByInvoice = new Map<string, string>();
  for (const row of ti ?? []) {
    taskIds.add(row.task_id);
    if (!firstTaskByInvoice.has(row.invoice_id)) firstTaskByInvoice.set(row.invoice_id, row.task_id);
  }

  const taskById = new Map<string, string>();
  if (taskIds.size > 0) {
    const { data: tasks } = await supabase
      .from('manager_tasks')
      .select('id, title, property_id')
      .in('id', [...taskIds])
      .eq('property_id', propertyId);
    for (const t of tasks ?? []) taskById.set(t.id, t.title || '—');
  }

  for (const [invId, tid] of invoiceToTaskFromColumn) {
    const title = taskById.get(tid);
    if (title != null) out.set(invId, { taskId: tid, title });
  }

  for (const [invId, tid] of firstTaskByInvoice) {
    if (out.has(invId)) continue;
    const title = taskById.get(tid);
    if (title != null) out.set(invId, { taskId: tid, title });
  }

  const { data: direct } = await supabase
    .from('manager_tasks')
    .select('id, title, related_invoice_id')
    .eq('property_id', propertyId)
    .in('related_invoice_id', invoiceIds);

  for (const r of direct ?? []) {
    if (r.related_invoice_id && !out.has(r.related_invoice_id)) {
      out.set(r.related_invoice_id, { taskId: r.id, title: r.title || '—' });
    }
  }

  return out;
}
