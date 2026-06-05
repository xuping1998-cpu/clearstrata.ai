import { useProperty } from '../contexts/PropertyContext';

/**
 * At least one active property membership (from PropertyContext — no extra query).
 * Returns null while auth user or property context is not ready.
 */
export function useHasActivePropertyMembership(
  userId: string | undefined,
  propertyReady: boolean,
): boolean | null {
  const { memberships } = useProperty();

  if (!userId) return null;
  if (!propertyReady) return null;
  return memberships.length > 0;
}
