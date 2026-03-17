'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
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
    const prev = settings;
    setSettings(s => ({ ...s, [key]: value }));
    setError(null);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { [key]: value } }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setSettings(prev);
      setError('Failed to save setting. Please try again.');
    }
  }, [settings]);

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
