import { useEffect, useRef } from 'react';
import type { SubmitCheckInRequest } from '@lib/contracts/checkIn';

export function useCheckInAutosave({
  isEditing,
  payload,
  persistCheckIn,
  setError,
}: {
  isEditing: boolean;
  payload: SubmitCheckInRequest;
  persistCheckIn: (payload: SubmitCheckInRequest) => Promise<void>;
  setError: (value: string) => void;
}) {
  const checkInSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialAutoSaveRunRef = useRef(false);

  useEffect(() => {
    return () => {
      if (checkInSaveTimeoutRef.current) {
        clearTimeout(checkInSaveTimeoutRef.current);
        checkInSaveTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isEditing) return;
    if (!hasInitialAutoSaveRunRef.current) {
      hasInitialAutoSaveRunRef.current = true;
      return;
    }

    if (checkInSaveTimeoutRef.current) clearTimeout(checkInSaveTimeoutRef.current);
    checkInSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await persistCheckIn(payload);
      } catch {
        setError('Failed to auto-save check-in');
      } finally {
        checkInSaveTimeoutRef.current = null;
      }
    }, 500);
  }, [isEditing, payload, persistCheckIn, setError]);
}
