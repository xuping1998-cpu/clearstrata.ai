import { Archive } from 'lucide-react';
import type { StateMessage } from '@/lib/ui/pageStateModel';
import { DEFAULT_ARCHIVED } from '@/lib/ui/pageStateModel';
import { StateFrame } from '@/components/ui/state/StateFrame';

export type ArchivedStateProps = {
  langEn: boolean;
  title?: StateMessage | string;
  description?: StateMessage | string;
  compact?: boolean;
  className?: string;
};

export function ArchivedState({
  langEn,
  title = DEFAULT_ARCHIVED,
  description,
  compact = true,
  className,
}: ArchivedStateProps) {
  return (
    <StateFrame
      langEn={langEn}
      title={title}
      description={description}
      tone="archived"
      icon={<Archive className="h-4 w-4 text-slate-600" aria-hidden />}
      compact={compact}
      className={className}
      role="status"
    />
  );
}
