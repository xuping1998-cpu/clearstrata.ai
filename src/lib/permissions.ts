const PLATFORM_ADMIN_APP_ROLES = new Set(['platform_admin', 'superadmin']);

/** Cross-property platform operators (`profiles.app_role`). DB check today allows `platform_admin`; `superadmin` reserved for future parity. */
export function isPlatformAdmin(profile?: { app_role?: string | null } | null) {
  const r = profile?.app_role;
  return typeof r === 'string' && PLATFORM_ADMIN_APP_ROLES.has(r);
}

