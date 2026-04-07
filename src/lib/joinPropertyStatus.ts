/** Whether a property accepts public join requests via QR / invite (matches `properties.status`). */
export function isJoinableProperty(status?: string | null): boolean {
  const s = (status || '').toLowerCase();
  return s === 'active' || s === 'trial';
}
