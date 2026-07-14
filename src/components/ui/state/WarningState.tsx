import { AlertTriangle } from 'lucide-react';
import type { StateMessage } from '@/lib/ui/pageStateModel';
import { StateFrame } from '@/components/ui/state/StateFrame';

export type WarningStateProps = {
  langEn: boolean;
  title: StateMessage | string;
  description?: StateMessage | string;
  compact?: boolean;
  className?: string;
};

export function WarningState({ langEn, title, description, compact, className }: WarningStateProps) {
  return (
    <StateFrame
      langEn={langEn}
      title={title}
      description={description}
      tone="warning"
      icon={<AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden />}
      compact={compact}
      className={className}
      role="status"
    />
  );
}
