export { PageStateSurface } from '@/components/ui/state/PageStateSurface';
export { LoadingState, type LoadingVariant } from '@/components/ui/state/LoadingState';
export { RefreshingOverlay } from '@/components/ui/state/RefreshingOverlay';
export { EmptyState } from '@/components/ui/state/EmptyState';
export { ErrorState } from '@/components/ui/state/ErrorState';
export { WarningState } from '@/components/ui/state/WarningState';
export { PermissionState } from '@/components/ui/state/PermissionState';
export { OfflineState } from '@/components/ui/state/OfflineState';
export { ArchivedState } from '@/components/ui/state/ArchivedState';
export { PartialStateBanner } from '@/components/ui/state/PartialStateBanner';
export { StateFrame } from '@/components/ui/state/StateFrame';

export type {
  PageStateKind,
  PageState,
  PageStateInput,
  PageStateAction,
  PartialFailure,
  StateMessage,
} from '@/lib/ui/pageStateModel';

export {
  stateText,
  sanitizeUserErrorMessage,
  resolvePrimaryPageState,
  shouldBlockContent,
  DEFAULT_ERROR,
  DEFAULT_OFFLINE,
  DEFAULT_PERMISSION,
  DEFAULT_ARCHIVED,
} from '@/lib/ui/pageStateModel';
