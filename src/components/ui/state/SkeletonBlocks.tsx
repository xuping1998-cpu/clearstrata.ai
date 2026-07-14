import { cn } from '@/lib/cn';

export function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-gray-200/80', className)} aria-hidden />;
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-gray-200/70', className)} aria-hidden />;
}

export function MatterDetailPageSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <SkeletonLine className="h-4 w-32" />
      <SkeletonLine className="h-3 w-48" />
      <SkeletonLine className="h-8 w-3/4 max-w-lg" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
      <SkeletonBlock className="h-40 w-full" />
      <SkeletonBlock className="h-56 w-full" />
    </div>
  );
}

export function FeedListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}

export function PipelineListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-2" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
