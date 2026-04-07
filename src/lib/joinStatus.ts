import { resolveUserPropertyAccess } from './resolveUserPropertyAccess';

export type JoinStatusResult =
  | { type: 'member'; propertyId: string }
  | { type: 'pending'; propertyId: string }
  | { type: 'rejected'; propertyId: string | null; reason: string | null }
  | { type: 'none' };

/**
 * 与 `resolveUserPropertyAccess` 对齐；供 JoinPending / JoinRejected 等沿用原有 `member` 语义。
 */
export async function getJoinStatus(userId: string): Promise<JoinStatusResult> {
  const r = await resolveUserPropertyAccess(userId);
  if (r.type === 'single_property') {
    return { type: 'member', propertyId: r.propertyId };
  }
  if (r.type === 'multi_property') {
    return { type: 'member', propertyId: r.firstPropertyId };
  }
  if (r.type === 'pending') {
    return { type: 'pending', propertyId: r.propertyId };
  }
  if (r.type === 'rejected') {
    return { type: 'rejected', propertyId: r.propertyId, reason: r.reason };
  }
  return { type: 'none' };
}
