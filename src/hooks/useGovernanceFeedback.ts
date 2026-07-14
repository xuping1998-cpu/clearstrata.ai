import { useCallback, useMemo, useState } from 'react';
import type { GovernanceFeedbackItem, GovernanceFeedbackKind } from '@/components/ui/feedback/GovernanceFeedbackHost';
import {
  GOVERNANCE_FEEDBACK,
  type GovernanceFeedbackKey,
} from '@/lib/ui/governanceFeedbackMessages';
import type { StateMessage } from '@/lib/ui/pageStateModel';

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useGovernanceFeedback() {
  const [items, setItems] = useState<GovernanceFeedbackItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (
      kind: GovernanceFeedbackKind,
      message: StateMessage | string,
      options?: Pick<GovernanceFeedbackItem, 'description' | 'undo' | 'undoLabel'>,
    ) => {
      const id = newId();
      setItems((prev) => [...prev.slice(-2), { id, kind, message, ...options }]);
      return id;
    },
    [],
  );

  const notifyKey = useCallback(
    (kind: GovernanceFeedbackKind, key: GovernanceFeedbackKey, options?: Pick<GovernanceFeedbackItem, 'undo' | 'undoLabel'>) => {
      return push(kind, GOVERNANCE_FEEDBACK[key], options);
    },
    [push],
  );

  const notifySuccess = useCallback(
    (key: GovernanceFeedbackKey) => notifyKey('success', key),
    [notifyKey],
  );

  const notifyError = useCallback(
    (message?: StateMessage | string) =>
      push('error', message ?? GOVERNANCE_FEEDBACK.actionFailed),
    [push],
  );

  return useMemo(
    () => ({ items, dismiss, push, notifySuccess, notifyError, notifyKey }),
    [items, dismiss, push, notifySuccess, notifyError, notifyKey],
  );
}
