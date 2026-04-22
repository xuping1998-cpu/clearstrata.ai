/** Console diagnostics for unified 入楼：join_requests insert + `enter_property_by_invite`；审批见 `approve_join_request`。 */

export function logPropertyEntryGate(stage: string, payload: Record<string, unknown>) {
  console.log(`[property-entry:${stage}]`, payload);
}

/** Structured one-line logs for `propertyEntryUnified` (auto / pending / approve / reject). */
export function logUnifiedPropertyEntryLine(stage: string, payload: Record<string, unknown>) {
  console.log(`[property-entry-unified:${stage}]`, payload);
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
  console.log('property entry — unit_number', opts.unitNo ?? row?.unit_number ?? row?.unit_no ?? null);
  const kind = row?.kind != null ? String(row.kind) : '';
  const autoLabel =
    kind === 'auto_approved'
      ? 'passed'
      : kind === 'pending_submitted'
        ? 'pending'
        : kind === 'already_member'
          ? 'already_member'
          : row?.auto_approve === 'passed' || row?.entry_path === 'auto_approved'
            ? 'passed'
            : row?.auto_approve === 'skipped'
              ? 'skipped'
              : 'failed';
  console.log('property entry — submit kind', kind || '—');
  console.log('property entry — auto-approve', autoLabel);
  console.log('property entry — pending created', kind === 'pending_submitted' || row?.pending_created === true);
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
  const email =
    (row?.email as string | null | undefined) ??
    (row?.target_email as string | null | undefined) ??
    null;
  const unit = (row?.unit_no as string | null | undefined) ?? opts.unitNoFallback ?? null;
  const profileId =
    (row?.user_id as string | null | undefined) ??
    (row?.target_user_id as string | null | undefined) ??
    null;
  console.log('property entry approve — reviewer id', opts.reviewerId ?? null);
  console.log('approve email', email ?? '—');
  console.log('resolved profile id', profileId ?? '—');
  console.log('unit_no', unit ?? '—');
  console.log('property entry — approve result', row ?? null);
  const pmUpsert = row?.property_members_upserted ?? row?.property_members_inserted;
  console.log('property entry — property_members upsert result', pmUpsert ?? null);
  console.log('property entry — join_request status update result', row?.join_request_status_updated ?? null);
  console.log('property entry — final success', row?.success === true || row?.ok === true);
  const resOutcome = row?.residents_outcome;
  const resLabel =
    resOutcome === 'created'
      ? 'residents insert: created'
      : resOutcome === 'matched_bound' || resOutcome === 'matched_already_bound'
        ? `residents update: matched (${String(resOutcome)})`
        : resOutcome === 'updated_by_email_unit_changed'
          ? 'residents update: matched by email, unit updated'
          : resOutcome != null
            ? `residents outcome: ${String(resOutcome)}`
            : 'residents outcome: —';
  console.log(resLabel);
}
