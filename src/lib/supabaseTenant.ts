/**
 * Multi-tenant client helpers: tenant tables must scope by `property_id`.
 * **RLS is authoritative** — this catches missing client filters early.
 *
 * Always pass `currentPropertyId` from `useProperty()` (or assert after guards).
 * Do not rely on global mutable state for tenant id (avoids React effect ordering bugs).
 */

/**
 * Throws if no property is selected. Use at the start of loaders:
 * `const pid = assertTenantPropertyId(currentPropertyId);`
 */
export function assertTenantPropertyId(propertyId: string | null | undefined): string {
  const id = propertyId?.trim();
  if (!id) {
    throw new Error('No property selected: tenant queries require currentPropertyId.');
  }
  return id;
}

/**
 * Apply `.eq('property_id', propertyId)` immediately after `.from(...).select|update|delete`.
 * Only for tables that expose `property_id`. Inserts should set `property_id` in the row body.
 */
export function withProperty<T extends { eq: (column: string, value: string) => T }>(
  query: T,
  propertyId: string | null | undefined,
): T {
  const id = assertTenantPropertyId(propertyId);
  return query.eq('property_id', id);
}
