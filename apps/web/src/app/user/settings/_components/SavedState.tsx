'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSettings } from '@lib/providers/SettingsProvider';
import type { Settings, CustomMetricDef, TrackedE1rmExercise } from '@/types/settingsTypes';
import { signalTokens } from '@lib/signal/tokens';

const palette = signalTokens.surface.planning;

type SavedStateValue = {
  lastSavedAt: number | null;
  markSaved: () => void;
};

const SavedStateContext = createContext<SavedStateValue>({
  lastSavedAt: null,
  markSaved: () => {},
});

export function SavedStateProvider({ children }: { children: ReactNode }) {
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markSaved = useCallback(() => {
    setLastSavedAt(Date.now());
    if (announceTimer.current) clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => {
      setAnnouncement('Saved');
      announceTimer.current = setTimeout(() => setAnnouncement(''), 1200);
    }, 600);
  }, []);

  useEffect(() => () => {
    if (announceTimer.current) clearTimeout(announceTimer.current);
  }, []);

  const value = useMemo<SavedStateValue>(() => ({ lastSavedAt, markSaved }), [lastSavedAt, markSaved]);

  return (
    <SavedStateContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {announcement}
      </div>
    </SavedStateContext.Provider>
  );
}

export function useSavedState(): SavedStateValue {
  return useContext(SavedStateContext);
}

/**
 * Wraps the Settings provider mutations so each success bumps the saved indicator
 * and live-region announcement. Components inside Settings should prefer this
 * over `useSettings()` for write paths.
 */
export function useSettingsWithSaved() {
  const ctx = useSettings();
  const { markSaved } = useSavedState();

  const updateSetting = useCallback(
    async (key: keyof Settings, value: boolean | number | string) => {
      const ok = await ctx.updateSetting(key, value);
      if (ok) markSaved();
      return ok;
    },
    [ctx, markSaved],
  );

  const updateCustomMetrics = useCallback(
    async (defs: CustomMetricDef[]) => {
      await ctx.updateCustomMetrics(defs);
      markSaved();
    },
    [ctx, markSaved],
  );

  const updateTrackedE1rmExercises = useCallback(
    async (exercises: TrackedE1rmExercise[]) => {
      await ctx.updateTrackedE1rmExercises(exercises);
      markSaved();
    },
    [ctx, markSaved],
  );

  return {
    settings: ctx.settings,
    loading: ctx.loading,
    error: ctx.error,
    clearError: ctx.clearError,
    updateSetting,
    updateCustomMetrics,
    updateTrackedE1rmExercises,
  };
}

function formatRelative(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  if (diff < 5_000) return 'just now';
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  return new Date(ts).toLocaleTimeString();
}

export function SavedTimestampLabel({ fallback = 'Saved as you toggle' }: { fallback?: string }) {
  const { lastSavedAt } = useSavedState();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (lastSavedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [lastSavedAt]);

  const text = lastSavedAt === null ? fallback : `Saved · ${formatRelative(lastSavedAt, now)}`;

  return (
    <span
      style={{
        fontFamily: signalTokens.fontVar.mono,
        fontSize: 10,
        color: palette.inkLight,
        letterSpacing: '0.02em',
      }}
    >
      {text}
    </span>
  );
}
