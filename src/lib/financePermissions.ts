import type { Profile } from './supabase';

/** Approve / reject / mark paid / edit / delete (staff). */
export function canManageInvoiceWorkflow(profile: Profile | null): boolean {
  return profile?.role === 'council' || profile?.role === 'admin';
}

export function canDeleteInvoice(profile: Profile | null, uploadedBy: string): boolean {
  if (!profile) return false;
  if (profile.id === uploadedBy) return true;
  return canManageInvoiceWorkflow(profile) || profile.role === 'manager';
}
