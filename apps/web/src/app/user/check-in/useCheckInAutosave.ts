import { useEffect, useEffectEvent, useRef } from 'react';
import type { SaveCheckInDraftRequest, SubmitCheckInRequest } from '@lib/contracts/checkIn';

export function useCheckInAutosave({
  enabled,
  payload,
  persist,
  setError,
  onSavingChange,
  onSaved,
  delayMs = 500,
}: {
  enabled: boolean;
  payload: SubmitCheckInRequest | SaveCheckInDraftRequest;
  persist: (payload: SubmitCheckInRequest | SaveCheckInDraftRequest) => Promise<void>;
  setError: (value: string) => void;
  onSavingChange?: (value: boolean) => void;
  onSaved?: () => void;
  delayMs?: number;
}) {
  const checkInSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialAutoSaveRunRef = useRef(false);
  const requestIdRef = useRef(0);
  const persistEvent = useEffectEvent(persist);
  const setErrorEvent = useEffectEvent(setError);
  const onSavingChangeEvent = useEffectEvent((value: boolean) => onSavingChange?.(value));
  const onSavedEvent = useEffectEvent(() => onSaved?.());

  useEffect(() => {
    return () => {
      if (checkInSaveTimeoutRef.current) {
        clearTimeout(checkInSaveTimeoutRef.current);
        checkInSaveTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (!hasInitialAutoSaveRunRef.current) {
      hasInitialAutoSaveRunRef.current = true;
      return;
    }

    if (checkInSaveTimeoutRef.current) clearTimeout(checkInSaveTimeoutRef.current);
    const requestId = ++requestIdRef.current;
    checkInSaveTimeoutRef.current = setTimeout(async () => {
      onSavingChangeEvent(true);
      try {
        await persistEvent(payload);
        if (requestId === requestIdRef.current) {
          onSavedEvent();
        }
      } catch {
        setErrorEvent('Failed to auto-save check-in');
      } finally {
        if (requestId === requestIdRef.current) {
          onSavingChangeEvent(false);
        }
        checkInSaveTimeoutRef.current = null;
      }
    }, delayMs);
  }, [delayMs, enabled, payload]);
}
