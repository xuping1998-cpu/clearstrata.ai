import type { UserRole } from './supabase';

/** Values stored in `user_metadata.role` (Edge Function + JWT app metadata). */
export type AppMetadataRole = 'user' | 'council' | 'admin' | 'manager';

export function profileRoleToMetadataRole(role: UserRole): AppMetadataRole {
  if (role === 'council') return 'council';
  if (role === 'admin') return 'admin';
  if (role === 'manager') return 'manager';
  return 'user';
}

export function metadataRoleToProfileRole(r: AppMetadataRole): UserRole {
  if (r === 'council') return 'council';
  if (r === 'admin') return 'admin';
  if (r === 'manager') return 'manager';
  return 'owner';
}
