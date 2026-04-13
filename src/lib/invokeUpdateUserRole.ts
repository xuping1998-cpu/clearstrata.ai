import { supabase } from './supabase';
import type { AppMetadataRole } from './userRoleMetadata';

/**
 * Updates auth metadata, `profiles.role`, and `property_members.role` for the given
 * `(property_id, user_id)` (Edge Function enforces explicit keys on `property_members`).
 */
export async function invokeUpdateUserRole(
  userId: string,
  role: AppMetadataRole,
  propertyId: string,
) {
  return supabase.functions.invoke('update-user-role', {
    body: { user_id: userId, role, property_id: propertyId },
  });
}
