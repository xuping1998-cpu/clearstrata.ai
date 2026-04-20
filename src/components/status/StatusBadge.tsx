import type { ReactNode } from 'react';
import type { StatusTone } from './StatusTone';

const TONE_BADGE: Record<StatusTone, string> = {
  success:
    'border border-clearstrata-state-success-border bg-clearstrata-state-success-surface text-clearstrata-state-success-text',
  warning:
    'border border-clearstrata-state-warning-border bg-clearstrata-state-warning-surface text-clearstrata-state-warning-text',
  danger:
    'border border-clearstrata-state-danger-border bg-clearstrata-state-danger-surface text-clearstrata-state-danger-text',
  neutral:
    'border border-clearstrata-state-neutral-border bg-clearstrata-state-neutral-surface text-clearstrata-state-neutral-text',
};

const SIZE_CLASS: Record<'sm' | 'md', string> = {
  sm: 'text-[11px] leading-tight px-2 py-0.5 rounded-full font-medium gap-1',
  md: 'text-xs px-3 py-1.5 rounded-full font-medium gap-1.5',
};

export type StatusBadgeProps = {
  tone: StatusTone;
  size?: 'sm' | 'md';
  className?: string;
  children: ReactNode;
};

/** 行内状态标签：tone 样式内建，仅允许通过 className 做布局/间距扩展 */
export function StatusBadge({ tone, size = 'md', className = '', children }: StatusBadgeProps) {
  return (
    <span
      className={['inline-flex max-w-full items-center whitespace-nowrap', TONE_BADGE[tone], SIZE_CLASS[size], className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
