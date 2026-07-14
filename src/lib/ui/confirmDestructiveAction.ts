import type { StateMessage } from '@/lib/ui/pageStateModel';
import { stateText } from '@/lib/ui/pageStateModel';

/** Browser confirm for destructive governance actions (RC-006G). */
export function confirmDestructiveAction(langEn: boolean, message: StateMessage): boolean {
  return window.confirm(stateText(message, langEn));
}
