'use client';

import { useEffect, useState } from 'react';
import { signalTokens } from '@lib/signal/tokens';

const BP = signalTokens.space.desktopBreakpointPx;

/**
 * Reports whether the viewport is at or above the Signal desktop breakpoint.
 * Defaults to `true` during SSR so the desktop layout is the safe fallback
 * (matches the rest of the Signal shell behavior).
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${BP}px)`);
    setIsDesktop(mq.matches);
    const listener = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  return isDesktop;
}
