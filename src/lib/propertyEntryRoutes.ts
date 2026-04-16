/** 营销/演示与真实物业入口的规范路径（避免 Demo 与 join 混淆） */
export const MARKETING_DEMO_PROPERTY_CODE = 'BCS3736';

export function demoEntryPath(propertyCode: string = MARKETING_DEMO_PROPERTY_CODE): string {
  return `/demo/${encodeURIComponent(propertyCode.trim())}`;
}

/** 真实物业成员入口（与 `/demo/:code` 的演示样板分离） */
export function realPropertyJoinPath(propertyCode: string): string {
  return `/join/${encodeURIComponent(propertyCode.trim())}`;
}
