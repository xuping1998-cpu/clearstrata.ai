import type { ReactNode } from 'react';
import type { StatusTone } from './StatusTone';

const TONE_SOFT: Record<StatusTone, string> = {
  success:
    'border border-clearstrata-state-success-border bg-clearstrata-state-success-surface text-clearstrata-state-success-text',
  warning:
    'border border-clearstrata-state-warning-border bg-clearstrata-state-warning-surface text-clearstrata-state-warning-text',
  danger:
    'border border-clearstrata-state-danger-border bg-clearstrata-state-danger-surface text-clearstrata-state-danger-text',
  neutral:
    'border border-clearstrata-state-neutral-border bg-clearstrata-state-neutral-surface text-clearstrata-state-neutral-text',
};

const TONE_SOLID: Record<StatusTone, string> = {
  success: 'border border-transparent bg-clearstrata-state-success-solid text-clearstrata-state-success-onSolid',
  warning: 'border border-transparent bg-clearstrata-state-warning-solid text-clearstrata-state-warning-onSolid',
  danger: 'border border-transparent bg-clearstrata-state-danger-solid text-clearstrata-state-danger-onSolid',
  neutral: 'border border-transparent bg-clearstrata-state-neutral-solid text-clearstrata-state-neutral-onSolid',
};

export type StatusAlertProps = {
  tone: StatusTone;
  variant?: 'soft' | 'solid';
  title?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** 块级提示：tone 样式内建；solid 用于强调条/浮层（如 toast） */
export function StatusAlert({ tone, variant = 'soft', title, className = '', children }: StatusAlertProps) {
  const toneClass = variant === 'solid' ? TONE_SOLID[tone] : TONE_SOFT[tone];
  return (
    <div
      className={['rounded-xl px-4 py-3 text-sm', toneClass, className].filter(Boolean).join(' ')}
      role="status"
    >
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      <div className={title ? 'text-[inherit]' : undefined}>{children}</div>
    </div>
  );
}
