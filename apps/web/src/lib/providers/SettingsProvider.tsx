'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Settings, DEFAULT_SETTINGS, parseDashboardSettings, CustomMetricDef, ExerciseUnitOverride, TrackedE1rmExercise } from '@/types/settingsTypes';

interface SettingsContextValue {
  settings: Settings;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  updateSetting: (key: keyof Settings, value: boolean | number | string) => Promise<void>;
  updateCustomMetrics: (defs: CustomMetricDef[]) => Promise<void>;
  updateTrackedE1rmExercises: (exercises: TrackedE1rmExercise[]) => Promise<void>;
  setExerciseUnitOverride: (exerciseId: number, override: ExerciseUnitOverride | null) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);
const NOOP_ASYNC = async () => {};
const FALLBACK_SETTINGS_CONTEXT: SettingsContextValue = {
  settings: DEFAULT_SETTINGS,
  loading: true,
  error: null,
  clearError: () => {},
  updateSetting: NOOP_ASYNC,
  updateCustomMetrics: NOOP_ASYNC,
  updateTrackedE1rmExercises: NOOP_ASYNC,
  setExerciseUnitOverride: NOOP_ASYNC,
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const settingsRef = useRef(settings);

  // Keep settingsRef current so updateSetting always reads the latest value
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  useEffect(() => {
    fetch('/api/user/settings', { cache: 'no-store' })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        setSettings(parseDashboardSettings(data.settings));
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load settings.');
        setLoading(false);
      });
  }, []);

  const updateSetting = useCallback(async (key: keyof Settings, value: boolean | number | string) => {
    // Cancel any in-flight PATCH so the latest change always wins
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const prev = settingsRef.current;
    setSettings(s => ({ ...s, [key]: value }));
    setError(null);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { [key]: value } }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setSettings(prev);
      setError('Failed to save setting. Please try again.');
    }
  }, []); // Empty deps — reads latest settings via settingsRef to avoid stale closures

  const updateCustomMetrics = useCallback(async (defs: CustomMetricDef[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const prev = settingsRef.current;
    setSettings(s => ({ ...s, customMetrics: defs }));
    setError(null);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { customMetrics: defs } }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setSettings(prev);
      setError('Failed to save setting. Please try again.');
    }
  }, []);

  const updateTrackedE1rmExercises = useCallback(async (exercises: TrackedE1rmExercise[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const prev = settingsRef.current;
    setSettings(s => ({ ...s, trackedE1rmExercises: exercises }));
    setError(null);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { trackedE1rmExercises: exercises } }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setSettings(prev);
      setError('Failed to save setting. Please try again.');
    }
  }, []);

  const setExerciseUnitOverride = useCallback(async (exerciseId: number, override: ExerciseUnitOverride | null) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const prev = settingsRef.current;
    const next = { ...prev.exerciseUnitOverrides };
    if (override === null) {
      delete next[String(exerciseId)];
    } else {
      next[String(exerciseId)] = override;
    }
    setSettings(s => ({ ...s, exerciseUnitOverrides: next }));
    setError(null);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { exerciseUnitOverrides: next } }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setSettings(prev);
      setError('Failed to save setting. Please try again.');
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <SettingsContext.Provider value={{ settings, loading, error, clearError, updateSetting, updateCustomMetrics, updateTrackedE1rmExercises, setExerciseUnitOverride }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext) ?? FALLBACK_SETTINGS_CONTEXT;
}
