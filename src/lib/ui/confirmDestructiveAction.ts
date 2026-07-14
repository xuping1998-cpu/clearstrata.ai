import type { StateMessage } from '@/lib/ui/pageStateModel';
import { stateText } from '@/lib/ui/pageStateModel';

/**
 * @deprecated Prefer `DestructiveConfirmDialog` for Project One destructive actions (RC-007I).
 */
export function confirmDestructiveAction(langEn: boolean, message: StateMessage): boolean {
  return window.confirm(stateText(message, langEn));
}
