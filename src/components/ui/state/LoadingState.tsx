import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { MOTION_SPINNER } from '@/lib/ui/motionClasses';
import {
  DashboardGovernanceHubCardSkeleton,
  FeedListSkeleton,
  FilteredFeedSkeleton,
  GovernanceCockpitPageSkeleton,
  GovernanceHubPageSkeleton,
  MatterDetailPageSkeleton,
  PipelineListSkeleton,
  SidePanelSkeleton,
} from '@/components/ui/state/SkeletonBlocks';

export type LoadingVariant =
  | 'page'
  | 'feed'
  | 'pipeline'
  | 'inline'
  | 'panel'
  | 'hub'
  | 'cockpit'
  | 'dashboardCard'
  | 'filteredFeed';

export type LoadingStateProps = {
  langEn: boolean;
  variant?: LoadingVariant;
  label?: string;
  className?: string;
};

const DEFAULT_LABEL = {
  en: 'Loading…',
  zh: '加载中…',
};

function LoadingShell({
  text,
  className,
  children,
}: {
  text: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className} role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{text}</span>
      {children}
    </div>
  );
}

export function LoadingState({
  langEn,
  variant = 'inline',
  label,
  className,
}: LoadingStateProps) {
  const text = label ?? (langEn ? DEFAULT_LABEL.en : DEFAULT_LABEL.zh);

  if (variant === 'page') {
    return (
      <LoadingShell
        text={text}
        className={cn('mx-auto max-w-3xl px-4 py-6 sm:py-8', className)}
      >
        <MatterDetailPageSkeleton />
      </LoadingShell>
    );
  }

  if (variant === 'hub') {
    return (
      <LoadingShell text={text} className={cn(className)}>
        <GovernanceHubPageSkeleton />
      </LoadingShell>
    );
  }

  if (variant === 'cockpit') {
    return (
      <LoadingShell text={text} className={cn('mx-auto max-w-[1600px]', className)}>
        <GovernanceCockpitPageSkeleton />
      </LoadingShell>
    );
  }

  if (variant === 'dashboardCard') {
    return (
      <LoadingShell text={text} className={cn(className)}>
        <DashboardGovernanceHubCardSkeleton />
      </LoadingShell>
    );
  }

  if (variant === 'filteredFeed') {
    return (
      <LoadingShell text={text} className={cn('space-y-2', className)}>
        <FilteredFeedSkeleton />
      </LoadingShell>
    );
  }

  if (variant === 'feed') {
    return (
      <LoadingShell text={text} className={cn('space-y-2', className)}>
        <FeedListSkeleton />
      </LoadingShell>
    );
  }

  if (variant === 'pipeline') {
    return (
      <LoadingShell text={text} className={cn(className)}>
        <PipelineListSkeleton />
      </LoadingShell>
    );
  }

  if (variant === 'panel') {
    return (
      <LoadingShell text={text} className={cn(className)}>
        <SidePanelSkeleton />
      </LoadingShell>
    );
  }

  return (
    <div
      className={cn('flex items-center gap-2 text-sm text-gray-500', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className={cn('h-4 w-4 shrink-0', MOTION_SPINNER)} aria-hidden />
      <span>{text}</span>
    </div>
  );
}
