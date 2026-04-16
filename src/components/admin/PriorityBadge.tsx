import type { PriorityLevel } from '@/features/admin/scorePropertyLeadPriority';

export function PriorityBadge({ level }: { level: PriorityLevel }) {
  const base = 'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold';
  if (level === 'high') return <span className={`${base} border-orange-200 bg-orange-50 text-orange-950`}>高</span>;
  if (level === 'medium') return <span className={`${base} border-amber-200 bg-amber-50 text-amber-950`}>中</span>;
  return <span className={`${base} border-gray-200 bg-gray-50 text-gray-800`}>低</span>;
}
