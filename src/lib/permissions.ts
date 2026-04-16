export function isPlatformAdmin(profile?: { app_role?: string | null } | null) {
  return profile?.app_role === 'platform_admin';
}

