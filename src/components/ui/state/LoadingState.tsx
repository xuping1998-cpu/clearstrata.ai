import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  FeedListSkeleton,
  MatterDetailPageSkeleton,
  PipelineListSkeleton,
  SkeletonLine,
} from '@/components/ui/state/SkeletonBlocks';

export type LoadingVariant = 'page' | 'feed' | 'pipeline' | 'inline' | 'panel';

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

export function LoadingState({
  langEn,
  variant = 'inline',
  label,
  className,
}: LoadingStateProps) {
  const text = label ?? (langEn ? DEFAULT_LABEL.en : DEFAULT_LABEL.zh);

  if (variant === 'page') {
    return (
      <div
        className={cn('mx-auto max-w-3xl px-4 py-6 sm:py-8', className)}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="sr-only">{text}</span>
        <MatterDetailPageSkeleton />
      </div>
    );
  }

  if (variant === 'feed') {
    return (
      <div className={cn('space-y-2', className)} role="status" aria-live="polite" aria-busy="true">
        <p className="text-sm text-gray-500">{text}</p>
        <FeedListSkeleton />
      </div>
    );
  }

  if (variant === 'pipeline') {
    return (
      <div className={cn(className)} role="status" aria-live="polite" aria-busy="true">
        <p className="px-3 pb-2 text-sm text-gray-500">{text}</p>
        <PipelineListSkeleton />
      </div>
    );
  }

  if (variant === 'panel') {
    return (
      <div
        className={cn('space-y-2 rounded-xl border border-gray-100 bg-white p-4', className)}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <SkeletonLine className="h-3 w-24" />
        <SkeletonLine className="h-4 w-40" />
        <SkeletonLine className="h-4 w-32" />
      </div>
    );
  }

  return (
    <div
      className={cn('flex items-center gap-2 text-sm text-gray-500', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      <span>{text}</span>
    </div>
  );
}
