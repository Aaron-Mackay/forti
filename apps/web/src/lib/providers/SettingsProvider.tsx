'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Settings, DEFAULT_SETTINGS, parseDashboardSettings, CustomMetricDef, ExerciseUnitOverride, TrackedE1rmExercise } from '@/types/settingsTypes';
import { getUserSettings, updateUserSettings } from '@lib/clientApi';

interface SettingsContextValue {
  settings: Settings;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  clearError: () => void;
  updateSetting: (key: keyof Settings, value: boolean | number | string) => Promise<boolean>;
  updateCustomMetrics: (defs: CustomMetricDef[]) => Promise<void>;
  updateTrackedE1rmExercises: (exercises: TrackedE1rmExercise[]) => Promise<void>;
  setExerciseUnitOverride: (exerciseId: number, override: ExerciseUnitOverride | null) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);
const NOOP_ASYNC = async () => {};
const NOOP_BOOLEAN_ASYNC = async () => false;
const FALLBACK_SETTINGS_CONTEXT: SettingsContextValue = {
  settings: DEFAULT_SETTINGS,
  loading: true,
  syncing: false,
  error: null,
  clearError: () => {},
  updateSetting: NOOP_BOOLEAN_ASYNC,
  updateCustomMetrics: NOOP_ASYNC,
  updateTrackedE1rmExercises: NOOP_ASYNC,
  setExerciseUnitOverride: NOOP_ASYNC,
};

const SETTINGS_STORAGE_KEY = 'forti:user-settings:v1';

function readCachedSettings(): Settings | null {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    return parseDashboardSettings(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeCachedSettings(next: Settings): void {
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage write failures
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const settingsRef = useRef(settings);

  // Keep settingsRef current so updateSetting always reads the latest value
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  useEffect(() => {
    const cachedSettings = readCachedSettings();
    if (cachedSettings) {
      setSettings(cachedSettings);
      setLoading(false);
      setSyncing(true);
    }

    getUserSettings()
      .then(data => {
        const next = parseDashboardSettings(data.settings);
        setSettings(prev => JSON.stringify(prev) === JSON.stringify(next) ? prev : next);
        writeCachedSettings(next);
        setLoading(false);
        setSyncing(false);
      })
      .catch(() => {
        setError('Failed to load settings.');
        setLoading(false);
        setSyncing(false);
      });
  }, []);

  const updateSetting = useCallback(async (key: keyof Settings, value: boolean | number | string) => {
    // Cancel any in-flight PATCH so the latest change always wins
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const prev = settingsRef.current;
    const optimistic = { ...prev, [key]: value };
    setSettings(optimistic);
    writeCachedSettings(optimistic);
    setError(null);
    try {
      await updateUserSettings({ [key]: value }, { signal: controller.signal });
      return true;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return false;
      }
      setSettings(prev);
      writeCachedSettings(prev);
      setError('Failed to save setting. Please try again.');
      return false;
    }
  }, []); // Empty deps — reads latest settings via settingsRef to avoid stale closures

  const updateCustomMetrics = useCallback(async (defs: CustomMetricDef[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const prev = settingsRef.current;
    const optimistic = { ...prev, customMetrics: defs };
    setSettings(optimistic);
    writeCachedSettings(optimistic);
    setError(null);
    try {
      await updateUserSettings({ customMetrics: defs }, { signal: controller.signal });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setSettings(prev);
      writeCachedSettings(prev);
      setError('Failed to save setting. Please try again.');
    }
  }, []);

  const updateTrackedE1rmExercises = useCallback(async (exercises: TrackedE1rmExercise[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const prev = settingsRef.current;
    const optimistic = { ...prev, trackedE1rmExercises: exercises };
    setSettings(optimistic);
    writeCachedSettings(optimistic);
    setError(null);
    try {
      await updateUserSettings({ trackedE1rmExercises: exercises }, { signal: controller.signal });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setSettings(prev);
      writeCachedSettings(prev);
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
    const optimistic = { ...prev, exerciseUnitOverrides: next };
    setSettings(optimistic);
    writeCachedSettings(optimistic);
    setError(null);
    try {
      await updateUserSettings({ exerciseUnitOverrides: next }, { signal: controller.signal });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setSettings(prev);
      writeCachedSettings(prev);
      setError('Failed to save setting. Please try again.');
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <SettingsContext.Provider value={{ settings, loading, syncing, error, clearError, updateSetting, updateCustomMetrics, updateTrackedE1rmExercises, setExerciseUnitOverride }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext) ?? FALLBACK_SETTINGS_CONTEXT;
}
