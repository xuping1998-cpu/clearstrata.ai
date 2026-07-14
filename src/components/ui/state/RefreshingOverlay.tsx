import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { MOTION_PANEL, MOTION_SPINNER } from '@/lib/ui/motionClasses';

export type RefreshingOverlayProps = {
  langEn: boolean;
  label?: string;
  className?: string;
};

export function RefreshingOverlay({ langEn, label, className }: RefreshingOverlayProps) {
  const text = label ?? (langEn ? 'Updating…' : '正在更新…');
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-2',
        MOTION_PANEL,
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/95 px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm">
        <Loader2 className={cn('h-3.5 w-3.5', MOTION_SPINNER)} aria-hidden />
        {text}
      </span>
    </div>
  );
}
