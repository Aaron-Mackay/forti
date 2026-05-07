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

import {
  AuthApiError,
  exchangeGoogleIdToken,
  refreshAccessToken,
  signOutMobileSession,
} from './authClient';
import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
  type StoredAuthSession,
} from './secureStorage';

type AuthUser = StoredAuthSession['user'];

type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'signed-out'; user: null }
  | { status: 'signed-in'; user: AuthUser };

type AuthContextValue = AuthState & {
  signInWithGoogleIdToken: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const REFRESH_LEEWAY_MS = 60_000; // refresh 1 min before access expiry

export function AuthProvider({ children }: { children: ReactNode }) {
  const sessionRef = useRef<StoredAuthSession | null>(null);
  const refreshPromiseRef = useRef<Promise<StoredAuthSession | null> | null>(null);
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  const applySession = useCallback(async (session: StoredAuthSession) => {
    sessionRef.current = session;
    await writeStoredSession(session);
    setState({ status: 'signed-in', user: session.user });
  }, []);

  const clearSession = useCallback(async () => {
    sessionRef.current = null;
    await clearStoredSession();
    setState({ status: 'signed-out', user: null });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await readStoredSession();
      if (cancelled) return;
      if (!stored) {
        setState({ status: 'signed-out', user: null });
        return;
      }
      sessionRef.current = stored;
      setState({ status: 'signed-in', user: stored.user });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshIfNeeded = useCallback(async (): Promise<StoredAuthSession | null> => {
    const current = sessionRef.current;
    if (!current) return null;

    const accessExpiresAt = Date.parse(current.accessTokenExpiresAt);
    if (Number.isFinite(accessExpiresAt) && accessExpiresAt - Date.now() > REFRESH_LEEWAY_MS) {
      return current;
    }

    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const promise = (async () => {
      try {
        const refreshed = await refreshAccessToken(current.refreshToken);
        const next: StoredAuthSession = {
          accessToken: refreshed.accessToken,
          accessTokenExpiresAt: refreshed.accessTokenExpiresAt,
          refreshToken: refreshed.refreshToken,
          refreshTokenExpiresAt: refreshed.refreshTokenExpiresAt,
          user: refreshed.user,
        };
        await applySession(next);
        return next;
      } catch (err) {
        if (err instanceof AuthApiError && (err.status === 401 || err.status === 403)) {
          await clearSession();
        }
        throw err;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = promise;
    return promise;
  }, [applySession, clearSession]);

  const signInWithGoogleIdToken = useCallback(
    async (idToken: string) => {
      const result = await exchangeGoogleIdToken(idToken);
      await applySession({
        accessToken: result.accessToken,
        accessTokenExpiresAt: result.accessTokenExpiresAt,
        refreshToken: result.refreshToken,
        refreshTokenExpiresAt: result.refreshTokenExpiresAt,
        user: result.user,
      });
    },
    [applySession],
  );

  const signOut = useCallback(async () => {
    const current = sessionRef.current;
    if (current) {
      try {
        await signOutMobileSession(current.refreshToken);
      } catch {
        // best-effort; clear local state regardless
      }
    }
    await clearSession();
  }, [clearSession]);

  const getAccessToken = useCallback(async () => {
    const session = await refreshIfNeeded();
    return session?.accessToken ?? null;
  }, [refreshIfNeeded]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signInWithGoogleIdToken,
      signOut,
      getAccessToken,
    }),
    [state, signInWithGoogleIdToken, signOut, getAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
