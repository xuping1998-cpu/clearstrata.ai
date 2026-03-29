import { supabase } from './supabase';
import type { AppMetadataRole } from './userRoleMetadata';

export async function invokeUpdateUserRole(userId: string, role: AppMetadataRole) {
  return supabase.functions.invoke('update-user-role', {
    body: { user_id: userId, role },
  });
}
