import { Inbox } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import type { PageStateAction, StateMessage } from '@/lib/ui/pageStateModel';
import { stateText } from '@/lib/ui/pageStateModel';
import { StateFrame } from '@/components/ui/state/StateFrame';

export type EmptyStateProps = {
  langEn: boolean;
  title: StateMessage | string;
  description?: StateMessage | string;
  reason?: StateMessage | string;
  action?: PageStateAction;
  secondaryAction?: PageStateAction;
  compact?: boolean;
  className?: string;
  hideIcon?: boolean;
};

function renderAction(action: PageStateAction, langEn: boolean, variant: 'primary' | 'outline') {
  const label = stateText(action.label, langEn);
  if (action.to) {
    return (
      <ButtonLink to={action.to} variant={variant} size="sm">
        {label}
      </ButtonLink>
    );
  }
  if (action.href) {
    return (
      <a
        href={action.href}
        className={
          variant === 'primary'
            ? 'inline-flex min-h-8 items-center justify-center rounded-lg bg-clearstrata-ui-primary px-2.5 py-1 text-xs font-semibold text-white hover:bg-clearstrata-ui-primaryHover'
            : 'inline-flex min-h-8 items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-50'
        }
      >
        {label}
      </a>
    );
  }
  return (
    <Button type="button" variant={variant} size="sm" onClick={action.onClick}>
      {label}
    </Button>
  );
}

export function EmptyState({
  langEn,
  title,
  description,
  reason,
  action,
  secondaryAction,
  compact,
  className,
  hideIcon = false,
}: EmptyStateProps) {
  const actions =
    action || secondaryAction ? (
      <>
        {action ? renderAction(action, langEn, 'primary') : null}
        {secondaryAction ? renderAction(secondaryAction, langEn, 'outline') : null}
      </>
    ) : null;

  return (
    <StateFrame
      langEn={langEn}
      title={title}
      description={description}
      reason={reason}
      tone="neutral"
      icon={hideIcon ? undefined : <Inbox className="h-5 w-5 text-gray-500" aria-hidden />}
      actions={actions}
      compact={compact}
      className={className}
      role="status"
      titleAsHeading
    />
  );
}
