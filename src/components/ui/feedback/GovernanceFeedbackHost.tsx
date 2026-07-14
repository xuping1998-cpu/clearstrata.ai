import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import type { StateMessage } from '@/lib/ui/pageStateModel';
import { stateText } from '@/lib/ui/pageStateModel';

export type GovernanceFeedbackKind = 'success' | 'warning' | 'error' | 'info';

export type GovernanceFeedbackItem = {
  id: string;
  kind: GovernanceFeedbackKind;
  message: StateMessage | string;
  description?: StateMessage | string;
  undo?: () => void;
  undoLabel?: StateMessage;
};

const KIND_CLASS: Record<GovernanceFeedbackKind, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  error: 'border-red-200 bg-red-50 text-red-950',
  info: 'border-sky-200 bg-sky-50 text-sky-950',
};

const AUTO_DISMISS_MS: Record<GovernanceFeedbackKind, number> = {
  success: 4000,
  warning: 5000,
  error: 8000,
  info: 4000,
};

export type GovernanceFeedbackHostProps = {
  langEn: boolean;
  items: GovernanceFeedbackItem[];
  onDismiss: (id: string) => void;
};

export function GovernanceFeedbackHost({ langEn, items, onDismiss }: GovernanceFeedbackHostProps) {
  useEffect(() => {
    if (!items.length) return;
    const timers = items.map((item) =>
      window.setTimeout(() => onDismiss(item.id), AUTO_DISMISS_MS[item.kind]),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [items, onDismiss]);

  if (!items.length) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(100vw-2rem,22rem)] flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions"
    >
      {items.map((item) => (
        <div
          key={item.id}
          role={item.kind === 'error' ? 'alert' : 'status'}
          className={cn(
            'pointer-events-auto rounded-xl border px-3 py-2.5 shadow-lg transition-opacity duration-[250ms] motion-reduce:transition-none',
            KIND_CLASS[item.kind],
          )}
        >
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 text-sm font-semibold">{stateText(item.message, langEn)}</p>
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              className="shrink-0 rounded-md p-0.5 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clearstrata-ui-primary/40"
              aria-label={langEn ? 'Dismiss' : '关闭'}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          {item.description ? (
            <p className="mt-0.5 text-xs opacity-90">{stateText(item.description, langEn)}</p>
          ) : null}
          {item.undo ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-7 px-2"
              onClick={() => {
                item.undo?.();
                onDismiss(item.id);
              }}
            >
              {stateText(item.undoLabel ?? { en: 'Undo', zh: '撤销' }, langEn)}
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
