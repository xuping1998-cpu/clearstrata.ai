import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { StateMessage } from '@/lib/ui/pageStateModel';
import { stateText } from '@/lib/ui/pageStateModel';
import { StateFrame } from '@/components/ui/state/StateFrame';

export type ErrorStateProps = {
  langEn: boolean;
  title: StateMessage | string;
  description?: StateMessage | string;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
};

export function ErrorState({
  langEn,
  title,
  description,
  onRetry,
  compact,
  className,
}: ErrorStateProps) {
  const actions = onRetry ? (
    <Button type="button" variant="outline" size="sm" onClick={onRetry}>
      {langEn ? 'Retry' : '重试'}
    </Button>
  ) : null;

  return (
    <StateFrame
      langEn={langEn}
      title={title}
      description={description}
      tone="danger"
      icon={<AlertCircle className="h-5 w-5 text-red-600" aria-hidden />}
      actions={actions}
      compact={compact}
      className={className}
      role="alert"
    />
  );
}
