'use client';

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Toolbar } from '@mui/material';
import CustomAppBar, { APPBAR_HEIGHT } from '@/components/CustomAppBar';

interface AppBarConfig {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

interface AppBarContextValue {
  setAppBar: (config: AppBarConfig) => void;
}

const AppBarContext = createContext<AppBarContextValue | null>(null);

export function AppBarProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState('Forti');
  const [showBack, setShowBack] = useState(false);
  const onBackRef = useRef<(() => void) | undefined>(undefined);
  // Portal requires the DOM to be available — false on SSR, true after hydration.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const setAppBar = useCallback(({ title, showBack = false, onBack }: AppBarConfig) => {
    setTitle(title);
    setShowBack(showBack);
    onBackRef.current = onBack;
  }, []);

  const bar = (
    <CustomAppBar
      title={title}
      showBack={showBack}
      onBack={showBack ? onBackRef.current : undefined}
      noSpacer={mounted}
    />
  );

  return (
    <AppBarContext.Provider value={{ setAppBar }}>
      {/* Before hydration, render inline (includes its own spacer Toolbar).
          After hydration, portal the fixed bar to document.body so it sits
          outside the Next.js route-transition container and never inherits
          its opacity during page navigation. The spacer below keeps content
          pushed down regardless. */}
      {mounted ? createPortal(bar, document.body) : bar}
      {mounted && <Toolbar sx={{ minHeight: APPBAR_HEIGHT }} />}
      {children}
    </AppBarContext.Provider>
  );
}

/**
 * Sets the AppBar title/showBack/onBack for the calling component.
 * Call at the top of any client component that owns a page view.
 * onBack is stored via ref and intentionally excluded from the effect deps —
 * it updates whenever title or showBack changes (which always co-occurs in practice).
 */
export function useAppBar({ title, showBack = false, onBack }: AppBarConfig) {
  const ctx = useContext(AppBarContext);
  if (!ctx) throw new Error('useAppBar must be used within AppBarProvider');
  const { setAppBar } = ctx;
  useLayoutEffect(() => {
    setAppBar({ title, showBack, onBack });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setAppBar, title, showBack]);
}
