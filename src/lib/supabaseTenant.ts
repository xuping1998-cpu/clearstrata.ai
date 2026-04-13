/**
 * Tenant scope for PostgREST builders. Only use on tables that define `property_id`.
 * Prefer chaining immediately after `.from(...).select(...)` / `.update(...)` / `.delete()`.
 * Inserts should set `property_id` on the row payload; do not use this helper on bare `.insert()` unless your client’s builder supports `.eq` on that chain.
 *
 * Typed loosely on purpose: Supabase’s generic query builder otherwise triggers “excessively deep” TS instantiation when composed.
 */
export function withProperty<T extends { eq: (column: string, value: string) => T }>(
  query: T,
  propertyId: string | null | undefined,
): T {
  if (propertyId == null || String(propertyId).trim() === '') {
    throw new Error('withProperty: propertyId is required for tenant-scoped queries');
  }
  return query.eq('property_id', propertyId);
}
