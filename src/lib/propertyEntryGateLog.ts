/** Console diagnostics for unified 入楼分流 (`submit_join_request` + `approve_join_request`). */

export function logPropertyEntryGate(stage: string, payload: Record<string, unknown>) {
  console.log(`[property-entry:${stage}]`, payload);
}

export function logPropertyEntrySubmitResult(opts: {
  userId: string | null | undefined;
  email: string | null | undefined;
  propertyId: string | null | undefined;
  unitNo: string | null | undefined;
  data: unknown;
  error: unknown;
}) {
  const row = (opts.data ?? null) as Record<string, unknown> | null;
  console.log('property entry — current user id', opts.userId ?? null);
  console.log('property entry — email', opts.email ?? null);
  console.log('property entry — property_id', opts.propertyId ?? row?.property_id ?? null);
  console.log('property entry — unit_no', opts.unitNo ?? row?.unit_no ?? null);
  const autoLabel =
    row?.auto_approve === 'passed' || row?.entry_path === 'auto_approved'
      ? 'passed'
      : row?.auto_approve === 'skipped'
        ? 'skipped'
        : 'failed';
  console.log('property entry — auto-approve', autoLabel);
  console.log('property entry — pending created', row?.pending_created === true);
  console.log('property entry — property_members upsert result', row?.property_members_upsert ?? null);
  console.log('property entry — residents bind/create result', row?.residents_bind ?? null);
  if (opts.error) console.log('property entry — rpc error', opts.error);
  if (row?.auto_fail_reason) console.log('property entry — auto_fail_reason', row.auto_fail_reason);
}

export function logPropertyEntryApproveResult(opts: {
  reviewerId: string | null | undefined;
  data: unknown;
  /** Optional overrides when RPC omits fields */
  unitNoFallback?: string | null;
}) {
  const row = (opts.data ?? null) as Record<string, unknown> | null;
  const email = (row?.target_email as string | null | undefined) ?? null;
  const unit = (row?.unit_no as string | null | undefined) ?? opts.unitNoFallback ?? null;
  console.log('property entry approve — reviewer id', opts.reviewerId ?? null);
  console.log('approve email', email ?? '—');
  console.log('unit_no', unit ?? '—');
  console.log('property entry — approve result', row ?? null);
  console.log('property entry — property_members upsert', row?.property_members_inserted ?? null);
  console.log('property_members inserted', row?.property_members_inserted === true);
  const resOutcome = row?.residents_outcome;
  const resLabel =
    resOutcome === 'created'
      ? 'residents created'
      : resOutcome === 'matched_bound' || resOutcome === 'matched_already_bound'
        ? `residents matched (${String(resOutcome)})`
        : resOutcome != null
          ? `residents outcome: ${String(resOutcome)}`
          : 'residents outcome: —';
  console.log(resLabel);
}
