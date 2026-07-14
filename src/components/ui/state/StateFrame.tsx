import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { StateMessage } from '@/lib/ui/pageStateModel';
import { stateText } from '@/lib/ui/pageStateModel';

export type StateFrameProps = {
  langEn: boolean;
  title: StateMessage | string;
  description?: StateMessage | string;
  reason?: StateMessage | string;
  tone?: 'neutral' | 'danger' | 'warning' | 'permission' | 'offline' | 'archived';
  icon?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
  className?: string;
  role?: 'alert' | 'status';
  /** Use semantic heading for empty states (default h3). */
  titleAsHeading?: boolean;
};

const TONE_CLASS: Record<NonNullable<StateFrameProps['tone']>, string> = {
  neutral: 'border-gray-200 bg-gray-50/80 text-gray-800',
  danger: 'border-red-200 bg-red-50/80 text-red-900',
  warning: 'border-amber-200 bg-amber-50/80 text-amber-900',
  permission: 'border-sky-200 bg-sky-50/80 text-sky-900',
  offline: 'border-gray-300 bg-gray-100/90 text-gray-800',
  archived: 'border-slate-200 bg-slate-50/90 text-slate-800',
};

export function StateFrame({
  langEn,
  title,
  description,
  reason,
  tone = 'neutral',
  icon,
  actions,
  compact = false,
  className,
  role,
  titleAsHeading = false,
}: StateFrameProps) {
  const titleText = stateText(title, langEn);
  const TitleTag = titleAsHeading ? 'h3' : 'p';

  return (
    <div
      role={role}
      className={cn(
        'rounded-xl border',
        TONE_CLASS[tone],
        compact ? 'px-3 py-2.5' : 'px-4 py-4',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {icon ? <div className="mt-0.5 shrink-0">{icon}</div> : null}
        <div className="min-w-0 flex-1">
          <TitleTag className={cn('font-semibold', compact ? 'text-sm' : 'text-base')}>
            {titleText}
          </TitleTag>
          {description ? (
            <p className={cn('mt-1 text-gray-700', compact ? 'text-xs' : 'text-sm')}>
              {stateText(description, langEn)}
            </p>
          ) : null}
          {reason ? (
            <p className="mt-2 text-xs text-gray-600">
              <span className="font-semibold">{langEn ? 'Why: ' : '原因：'}</span>
              {stateText(reason, langEn)}
            </p>
          ) : null}
          {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}
