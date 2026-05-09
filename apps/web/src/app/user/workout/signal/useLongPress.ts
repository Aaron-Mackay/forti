import { useCallback, useEffect, useRef } from 'react';

const LONG_PRESS_MS = 500;

type Handlers = {
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerUp: (event: React.PointerEvent) => void;
  onPointerLeave: (event: React.PointerEvent) => void;
  onPointerCancel: (event: React.PointerEvent) => void;
  onClick: (event: React.MouseEvent) => void;
};

export function useLongPress(opts: { onShortPress: () => void; onLongPress: () => void }): Handlers {
  const { onShortPress, onLongPress } = opts;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredLongRef = useRef(false);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(() => {
    triggeredLongRef.current = false;
    clear();
    timerRef.current = setTimeout(() => {
      triggeredLongRef.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  }, [clear, onLongPress]);

  const onPointerUp = useCallback(() => {
    clear();
  }, [clear]);

  const onPointerLeave = useCallback(() => {
    clear();
    triggeredLongRef.current = false;
  }, [clear]);

  const onPointerCancel = useCallback(() => {
    clear();
    triggeredLongRef.current = false;
  }, [clear]);

  const onClick = useCallback(() => {
    if (triggeredLongRef.current) {
      triggeredLongRef.current = false;
      return;
    }
    onShortPress();
  }, [onShortPress]);

  return { onPointerDown, onPointerUp, onPointerLeave, onPointerCancel, onClick };
}
