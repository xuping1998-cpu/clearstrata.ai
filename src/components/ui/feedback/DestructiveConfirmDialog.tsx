import { useEffect, useId, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { MOTION_DIALOG } from '@/lib/ui/motionClasses';
import type { StateMessage } from '@/lib/ui/pageStateModel';
import { stateText } from '@/lib/ui/pageStateModel';

export type DestructiveConfirmDialogProps = {
  open: boolean;
  langEn: boolean;
  title: StateMessage;
  message: StateMessage;
  confirmLabel?: StateMessage;
  cancelLabel?: StateMessage;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Native `<dialog>` confirmation for destructive Project One actions (RC-007I).
 * Replaces window.confirm for archive and similar flows.
 */
export function DestructiveConfirmDialog({
  open,
  langEn,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: DestructiveConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      cancelRef.current?.focus();
    }
    if (!open && el.open) {
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={`fixed inset-0 z-[100] m-auto max-w-md rounded-2xl border border-gray-200 bg-white p-0 shadow-xl backdrop:bg-black/40 open:flex open:flex-col ${MOTION_DIALOG}`}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClose={onCancel}
    >
      <div className="border-b border-gray-100 px-5 py-4">
        <h2 id={titleId} className="text-base font-bold text-gray-900">
          {stateText(title, langEn)}
        </h2>
        <p id={descId} className="mt-2 text-sm text-gray-700">
          {stateText(message, langEn)}
        </p>
      </div>
      <div className="flex flex-wrap justify-end gap-2 px-5 py-4">
        <Button ref={cancelRef} type="button" variant="secondary" size="md" onClick={onCancel}>
          {stateText(cancelLabel ?? { en: 'Cancel', zh: '取消' }, langEn)}
        </Button>
        <Button type="button" variant="danger" size="md" onClick={onConfirm}>
          {stateText(confirmLabel ?? { en: 'Confirm', zh: '确认' }, langEn)}
        </Button>
      </div>
    </dialog>
  );
}
