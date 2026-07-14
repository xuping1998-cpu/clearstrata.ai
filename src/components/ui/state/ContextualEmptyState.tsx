import {
  getEmptyStateContent,
  resolveEmptyStateActions,
  type EmptyStateContentKey,
} from '@/lib/ui/emptyStateContent';
import type { PageStateAction } from '@/lib/ui/pageStateModel';
import { EmptyState } from '@/components/ui/state/EmptyState';

export type ContextualEmptyStateProps = {
  langEn: boolean;
  contentKey: EmptyStateContentKey;
  canCouncil?: boolean;
  propertyId?: string;
  searchQuery?: string;
  compact?: boolean;
  className?: string;
  /** Override resolved primary action (e.g. wire onClick for tab CTAs). */
  actionOverride?: PageStateAction;
  hideIcon?: boolean;
};

export function ContextualEmptyState({
  langEn,
  contentKey,
  canCouncil = false,
  propertyId,
  searchQuery,
  compact,
  className,
  actionOverride,
  hideIcon,
}: ContextualEmptyStateProps) {
  const content = getEmptyStateContent(contentKey, { propertyId, searchQuery });
  const { action, secondaryAction } = resolveEmptyStateActions(content, canCouncil);

  return (
    <EmptyState
      langEn={langEn}
      title={content.title}
      description={content.description}
      reason={content.reason}
      action={actionOverride ?? action}
      secondaryAction={secondaryAction}
      compact={compact}
      className={className}
      hideIcon={hideIcon}
    />
  );
}

/** Compact inline empty for tabs and lifecycle stage lines. */
export function TabEmptyState({
  langEn,
  title,
  description,
  action,
  className,
}: {
  langEn: boolean;
  title: string;
  description?: string;
  action?: PageStateAction;
  className?: string;
}) {
  return (
    <EmptyState
      langEn={langEn}
      title={title}
      description={description}
      action={action}
      compact
      hideIcon
      className={className}
    />
  );
}
