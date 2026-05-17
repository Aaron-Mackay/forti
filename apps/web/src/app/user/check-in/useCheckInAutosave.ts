import { useEffect, useRef } from 'react';
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
      onSavingChange?.(true);
      try {
        await persist(payload);
        if (requestId === requestIdRef.current) {
          onSaved?.();
        }
      } catch {
        setError('Failed to auto-save check-in');
      } finally {
        if (requestId === requestIdRef.current) {
          onSavingChange?.(false);
        }
        checkInSaveTimeoutRef.current = null;
      }
    }, delayMs);
  }, [delayMs, enabled, onSaved, onSavingChange, payload, persist, setError]);
}
