/**
 * Canonical URL for public invite codes (`property_invite_codes`):
 * matches `QrPropertyEntryPage` + `submitUnifiedPropertyEntry` + `resolve_public_invite_code`.
 */
export function buildPublicInviteEntryUrl(
  origin: string,
  propertyId: string,
  inviteCode: string,
  source: string = 'qr',
): string {
  const base = origin.replace(/\/$/, '');
  const q = new URLSearchParams({
    propertyId: propertyId.trim(),
    inviteCode: inviteCode.trim(),
    source: source.trim() || 'qr',
  });
  return `${base}/entry?${q.toString()}`;
}
