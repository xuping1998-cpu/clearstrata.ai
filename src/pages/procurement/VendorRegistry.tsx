export const SERVICE_CATEGORIES = [
  { key: 'landscaping', zh: '景观绿化', en: 'Landscaping' },
  { key: 'cleaning', zh: '清洁服务', en: 'Cleaning' },
  { key: 'plumbing', zh: '水管维修', en: 'Plumbing' },
  { key: 'electrical', zh: '电气工程', en: 'Electrical' },
  { key: 'hvac', zh: '暖通空调', en: 'HVAC' },
  { key: 'roofing', zh: '屋顶维修', en: 'Roofing' },
  { key: 'painting', zh: '油漆涂装', en: 'Painting' },
  { key: 'elevator', zh: '电梯维保', en: 'Elevator' },
  { key: 'fire_safety', zh: '消防安全', en: 'Fire Safety' },
  { key: 'security', zh: '安防门禁', en: 'Security' },
  { key: 'waterproofing', zh: '防水工程', en: 'Waterproofing' },
  { key: 'general_maintenance', zh: '综合维修', en: 'General Maintenance' },
] as const;

export type ServiceCategoryKey = typeof SERVICE_CATEGORIES[number]['key'];

export function getCategoryLabel(key: string, lang: string): string {
  const cat = SERVICE_CATEGORIES.find(c => c.key === key);
  if (!cat) return key;
  return lang === 'en' ? cat.en : cat.zh;
}
