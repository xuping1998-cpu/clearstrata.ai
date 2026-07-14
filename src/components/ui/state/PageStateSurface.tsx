import type { ReactNode } from 'react';
import {
  resolvePrimaryPageState,
  sanitizeUserErrorMessage,
  type PageStateAction,
  type PageStateInput,
  type PartialFailure,
  type StateMessage,
  DEFAULT_ERROR,
} from '@/lib/ui/pageStateModel';
import { ArchivedState } from '@/components/ui/state/ArchivedState';
import { EmptyState } from '@/components/ui/state/EmptyState';
import { ErrorState } from '@/components/ui/state/ErrorState';
import { LoadingState, type LoadingVariant } from '@/components/ui/state/LoadingState';
import { OfflineState } from '@/components/ui/state/OfflineState';
import { PartialStateBanner } from '@/components/ui/state/PartialStateBanner';
import { PermissionState } from '@/components/ui/state/PermissionState';
import { RefreshingOverlay } from '@/components/ui/state/RefreshingOverlay';
import { WarningState } from '@/components/ui/state/WarningState';

export type PageStateSurfaceProps = PageStateInput & {
  langEn: boolean;
  children?: ReactNode;
  loadingVariant?: LoadingVariant;
  loadingLabel?: string;
  emptyTitle?: StateMessage | string;
  emptyDescription?: StateMessage | string;
  emptyReason?: StateMessage | string;
  emptyAction?: PageStateAction;
  permissionTitle?: StateMessage | string;
  permissionDescription?: StateMessage | string;
  errorFallback?: StateMessage;
  onRetry?: () => void;
  warningTitle?: StateMessage | string;
  warningDescription?: StateMessage | string;
  partialFailures?: PartialFailure[];
  className?: string;
  contentClassName?: string;
};

/**
 * Projects canonical PageState onto shared UI components.
 * Success / partial / refreshing / archived preserve `children`.
 */
export function PageStateSurface({
  langEn,
  children,
  loadingVariant = 'inline',
  loadingLabel,
  emptyTitle,
  emptyDescription,
  emptyReason,
  emptyAction,
  permissionTitle,
  permissionDescription,
  errorFallback = DEFAULT_ERROR,
  onRetry,
  warningTitle,
  warningDescription,
  partialFailures,
  className,
  contentClassName,
  ...input
}: PageStateSurfaceProps) {
  const primary = resolvePrimaryPageState({ ...input, partialFailures });

  if (primary === 'loading') {
    return <LoadingState langEn={langEn} variant={loadingVariant} label={loadingLabel} className={className} />;
  }

  if (primary === 'permission') {
    return (
      <PermissionState
        langEn={langEn}
        title={permissionTitle}
        description={permissionDescription}
        className={className}
      />
    );
  }

  if (primary === 'offline' && !input.hasContent) {
    return <OfflineState langEn={langEn} className={className} />;
  }

  if (primary === 'error' && !input.hasContent) {
    const safe = sanitizeUserErrorMessage(input.error, errorFallback);
    return (
      <ErrorState
        langEn={langEn}
        title={safe}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  if (primary === 'empty') {
    const title =
      emptyTitle ??
      (langEn ? 'Nothing here yet' : '暂无内容');
    return (
      <EmptyState
        langEn={langEn}
        title={title}
        description={emptyDescription}
        reason={emptyReason}
        action={emptyAction}
        className={className}
      />
    );
  }

  const showRefreshing = primary === 'refreshing' || Boolean(input.refreshing);
  const showArchived = primary === 'archived' || Boolean(input.archived);
  const showPartial = Boolean(partialFailures?.length);
  const inlineError =
    input.error && input.hasContent
      ? sanitizeUserErrorMessage(input.error, errorFallback)
      : null;

  return (
    <div className={className}>
      {input.offline && input.hasContent ? (
        <OfflineState langEn={langEn} className="mb-3" />
      ) : null}
      <div className={`relative ${contentClassName ?? ''}`}>
        {showRefreshing ? <RefreshingOverlay langEn={langEn} /> : null}
        {showArchived ? <ArchivedState langEn={langEn} className="mb-3" /> : null}
        {showPartial ? (
          <PartialStateBanner langEn={langEn} failures={partialFailures!} className="mb-3" />
        ) : null}
        {warningTitle ? (
          <WarningState
            langEn={langEn}
            title={warningTitle}
            description={warningDescription}
            compact
            className="mb-3"
          />
        ) : null}
        {inlineError ? (
          <ErrorState
            langEn={langEn}
            title={inlineError}
            onRetry={onRetry}
            compact
            className="mb-3"
          />
        ) : null}
        {children}
      </div>
    </div>
  );
}
