import { ShieldAlert } from 'lucide-react';
import type { StateMessage } from '@/lib/ui/pageStateModel';
import { DEFAULT_PERMISSION } from '@/lib/ui/pageStateModel';
import { StateFrame } from '@/components/ui/state/StateFrame';

export type PermissionStateProps = {
  langEn: boolean;
  title?: StateMessage | string;
  description?: StateMessage | string;
  className?: string;
};

export function PermissionState({
  langEn,
  title = DEFAULT_PERMISSION,
  description,
  className,
}: PermissionStateProps) {
  return (
    <div className={className ?? 'mx-auto max-w-lg px-4 py-12'}>
      <StateFrame
        langEn={langEn}
        title={title}
        description={description}
        tone="permission"
        icon={<ShieldAlert className="h-5 w-5 text-sky-700" aria-hidden />}
        role="status"
      />
    </div>
  );
}
