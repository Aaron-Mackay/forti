'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Settings, DEFAULT_SETTINGS, parseDashboardSettings } from '@/types/settingsTypes';

interface SettingsContextValue {
  settings: Settings;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  updateSetting: (key: keyof Settings, value: boolean | number) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const settingsRef = useRef(settings);

  // Keep settingsRef current so updateSetting always reads the latest value
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  useEffect(() => {
    fetch('/api/user/settings')
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

  const updateSetting = useCallback(async (key: keyof Settings, value: boolean | number) => {
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

  const clearError = useCallback(() => setError(null), []);

  return (
    <SettingsContext.Provider value={{ settings, loading, error, clearError, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
