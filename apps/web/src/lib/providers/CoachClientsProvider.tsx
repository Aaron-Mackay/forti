'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSettings } from '@lib/providers/SettingsProvider';

interface CoachClient {
  id: string;
  name: string | null;
  email?: string | null;
  activePlanId?: number | null;
}

interface CoachClientsContextValue {
  clients: CoachClient[];
  loading: boolean;
}

const CoachClientsContext = createContext<CoachClientsContextValue | null>(null);
const FALLBACK_COACH_CLIENTS_CONTEXT: CoachClientsContextValue = {
  clients: [],
  loading: true,
};

export function CoachClientsProvider({ children }: { children: ReactNode }) {
  const { settings, loading: settingsLoading } = useSettings();
  const [clients, setClients] = useState<CoachClient[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (settingsLoading) return;
    if (!settings.coachModeActive) {
      setClients([]);
      return;
    }
    setLoading(true);
    fetch('/api/coach/clients')
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => setClients(data.clients ?? []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, [settingsLoading, settings.coachModeActive]);

  return (
    <CoachClientsContext.Provider value={{ clients, loading }}>
      {children}
    </CoachClientsContext.Provider>
  );
}

export function useCoachClients(): CoachClientsContextValue {
  return useContext(CoachClientsContext) ?? FALLBACK_COACH_CLIENTS_CONTEXT;
}
