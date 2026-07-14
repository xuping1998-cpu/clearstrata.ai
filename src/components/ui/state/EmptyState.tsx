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
  compact?: boolean;
  className?: string;
};

export function EmptyState({
  langEn,
  title,
  description,
  reason,
  action,
  compact,
  className,
}: EmptyStateProps) {
  const actions = action ? (
    action.to ? (
      <ButtonLink to={action.to} variant="primary" size="sm">
        {stateText(action.label, langEn)}
      </ButtonLink>
    ) : action.href ? (
      <ButtonAnchorCompat href={action.href} label={stateText(action.label, langEn)} />
    ) : (
      <Button type="button" variant="primary" size="sm" onClick={action.onClick}>
        {stateText(action.label, langEn)}
      </Button>
    )
  ) : null;

  return (
    <StateFrame
      langEn={langEn}
      title={title}
      description={description}
      reason={reason}
      tone="neutral"
      icon={<Inbox className="h-5 w-5 text-gray-500" aria-hidden />}
      actions={actions}
      compact={compact}
      className={className}
      role="status"
    />
  );
}

function ButtonAnchorCompat({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex min-h-8 items-center justify-center rounded-lg bg-clearstrata-ui-primary px-2.5 py-1 text-xs font-semibold text-white hover:bg-clearstrata-ui-primaryHover"
    >
      {label}
    </a>
  );
}
