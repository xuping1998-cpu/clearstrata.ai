import { cn } from '@/lib/cn';

const PULSE = 'animate-pulse motion-reduce:animate-none';

export function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn(PULSE, 'rounded-md bg-gray-200/80', className)} aria-hidden />;
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn(PULSE, 'rounded-lg bg-gray-200/70', className)} aria-hidden />;
}

function MatterCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3">
      <SkeletonLine className="h-3 w-24" />
      <SkeletonLine className="mt-2 h-4 w-4/5" />
      <SkeletonLine className="mt-2 h-3 w-32" />
      <div className="mt-3 flex gap-2">
        <SkeletonBlock className="h-7 w-20 rounded-lg" />
        <SkeletonBlock className="h-7 w-16 rounded-lg" />
      </div>
    </div>
  );
}

export function MatterDetailPageSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <SkeletonLine className="h-4 w-32" />
      <SkeletonLine className="h-3 w-56" />
      <SkeletonLine className="h-8 w-3/4 max-w-lg" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
      <div className="flex gap-1 border-b border-gray-100 pb-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-8 w-16 rounded-md" />
        ))}
      </div>
      <SkeletonBlock className="h-36 w-full" />
      <SkeletonBlock className="h-48 w-full" />
    </div>
  );
}

export function FeedListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <MatterCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function FilteredFeedSkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: 2 }).map((_, i) => (
        <MatterCardSkeleton key={i} />
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

export function GovernanceHubPageSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]" aria-hidden>
      <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/40 p-4">
        <SkeletonLine className="h-3 w-28" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonLine className="h-4 w-40" />
            <FeedListSkeleton rows={i === 0 ? 2 : 1} />
          </div>
        ))}
      </div>
      <div className="hidden space-y-2 rounded-xl border border-gray-100 bg-white p-4 lg:block">
        <SkeletonLine className="h-3 w-24" />
        <SkeletonLine className="h-4 w-36" />
        <SkeletonBlock className="mt-2 h-9 w-full rounded-lg" />
        <SkeletonBlock className="h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function GovernanceCockpitPageSkeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)_300px]" aria-hidden>
      <div className="hidden rounded-xl border border-gray-200 bg-white lg:block">
        <SkeletonLine className="m-3 h-3 w-28" />
        <div className="flex flex-wrap gap-1 px-2 pb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-6 w-14 rounded-full" />
          ))}
        </div>
        <PipelineListSkeleton rows={3} />
      </div>
      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <SkeletonLine className="h-3 w-24" />
        <SkeletonLine className="h-7 w-2/3" />
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-6 w-12 rounded-md" />
          ))}
        </div>
        <SkeletonBlock className="h-40 w-full" />
      </div>
      <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
        <SkeletonLine className="h-3 w-32" />
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-20 w-full" />
      </div>
    </div>
  );
}

export function DashboardGovernanceHubCardSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonLine className="h-4 w-28" />
          <SkeletonLine className="h-3 w-44" />
          <SkeletonLine className="h-3 w-36" />
        </div>
        <SkeletonBlock className="h-8 w-24 rounded-lg" />
      </div>
      <div className="space-y-2 border-t border-gray-100 pt-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export function SidePanelSkeleton() {
  return (
    <div className="space-y-2 rounded-xl border border-gray-100 bg-white p-4" aria-hidden>
      <SkeletonLine className="h-3 w-24" />
      <SkeletonLine className="h-4 w-40" />
      <SkeletonLine className="h-4 w-32" />
    </div>
  );
}
