import { WifiOff } from 'lucide-react';
import type { StateMessage } from '@/lib/ui/pageStateModel';
import { DEFAULT_OFFLINE } from '@/lib/ui/pageStateModel';
import { StateFrame } from '@/components/ui/state/StateFrame';

export type OfflineStateProps = {
  langEn: boolean;
  title?: StateMessage | string;
  description?: StateMessage | string;
  className?: string;
};

export function OfflineState({
  langEn,
  title,
  description = DEFAULT_OFFLINE,
  className,
}: OfflineStateProps) {
  const resolvedTitle =
    title ??
    (langEn ? 'You are offline' : '当前处于离线状态');

  return (
    <div className={className ?? 'mx-auto max-w-lg px-4 py-12'}>
      <StateFrame
        langEn={langEn}
        title={resolvedTitle}
        description={description}
        tone="offline"
        icon={<WifiOff className="h-5 w-5 text-gray-600" aria-hidden />}
        role="status"
      />
    </div>
  );
}
