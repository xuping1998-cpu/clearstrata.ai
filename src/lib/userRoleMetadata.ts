import type { UserRole } from './supabase';

/** Values stored in `user_metadata.role` (Edge Function + JWT app metadata). */
export type AppMetadataRole = 'user' | 'council' | 'admin';

export function profileRoleToMetadataRole(role: UserRole): AppMetadataRole {
  if (role === 'council') return 'council';
  if (role === 'admin') return 'admin';
  return 'user';
}

export function metadataRoleToProfileRole(r: AppMetadataRole): UserRole {
  if (r === 'council') return 'council';
  if (r === 'admin') return 'admin';
  return 'owner';
}
