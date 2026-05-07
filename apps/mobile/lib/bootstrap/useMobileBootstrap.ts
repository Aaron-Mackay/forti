import { useEffect, useState } from 'react';
import type { UserProfile, UserSettings } from '@forti/shared';

import { useAuth } from '@/lib/auth/AuthContext';
import { createMobileApiClient, MobileApiError } from '@/lib/api/mobileApiClient';
import { getUserProfile, getUserSettings } from '@/lib/api/accountApi';
import { getApiBaseUrl } from '@/lib/auth/apiBaseUrl';

type MobileBootstrapState =
  | { status: 'loading'; error: null; profile: null; settings: null }
  | { status: 'ready'; error: null; profile: UserProfile; settings: UserSettings }
  | { status: 'error'; error: string; profile: null; settings: null };

export function useMobileBootstrap() {
  const auth = useAuth();
  const [state, setState] = useState<MobileBootstrapState>({
    status: 'loading',
    error: null,
    profile: null,
    settings: null,
  });

  useEffect(() => {
    if (auth.status !== 'signed-in') {
      setState({ status: 'loading', error: null, profile: null, settings: null });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading', error: null, profile: null, settings: null });

    const client = createMobileApiClient({
      getAccessToken: auth.getAccessToken,
      getBaseUrl: getApiBaseUrl,
    });

    void Promise.all([getUserProfile(client), getUserSettings(client)])
      .then(([profile, settings]) => {
        if (cancelled) return;
        setState({ status: 'ready', error: null, profile, settings });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof MobileApiError ? error.message : 'Unable to load account bootstrap data.';
        setState({ status: 'error', error: message, profile: null, settings: null });
      });

    return () => {
      cancelled = true;
    };
  }, [auth]);

  return state;
}
