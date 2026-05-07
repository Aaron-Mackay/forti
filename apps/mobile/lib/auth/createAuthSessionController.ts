import type { StoredAuthSession } from './storedSession';
import { type AuthState, type SignedOutReason } from './sessionTypes';

const REFRESH_LEEWAY_MS = 60_000;

type AccessTokenOptions = {
  forceRefresh?: boolean;
};

type Listener = (state: AuthState) => void;

type AuthSessionControllerDeps = {
  clearStoredSession: () => Promise<void>;
  exchangeGoogleIdToken: (idToken: string) => Promise<{
    accessToken: string;
    accessTokenExpiresAt: string;
    refreshToken: string;
    refreshTokenExpiresAt: string;
    user: StoredAuthSession['user'];
  }>;
  isTerminalRefreshError: (error: unknown) => boolean;
  now: () => number;
  readStoredSession: () => Promise<StoredAuthSession | null>;
  refreshAccessToken: (refreshToken: string) => Promise<{
    accessToken: string;
    accessTokenExpiresAt: string;
    refreshToken: string;
    refreshTokenExpiresAt: string;
    user: StoredAuthSession['user'];
  }>;
  signOutMobileSession: (refreshToken: string) => Promise<void>;
  writeStoredSession: (session: StoredAuthSession) => Promise<void>;
};

export type AuthSessionController = ReturnType<typeof createAuthSessionController>;

export function createAuthSessionController(deps: AuthSessionControllerDeps) {
  const now = deps.now;

  let state: AuthState = { status: 'loading', user: null, reason: null };
  let session: StoredAuthSession | null = null;
  let refreshPromise: Promise<StoredAuthSession | null> | null = null;
  const listeners = new Set<Listener>();

  function emit(nextState: AuthState) {
    state = nextState;
    for (const listener of listeners) {
      listener(nextState);
    }
  }

  async function persistSession(nextSession: StoredAuthSession) {
    session = nextSession;
    await deps.writeStoredSession(nextSession);
    emit({ status: 'signed-in', user: nextSession.user, reason: null });
  }

  async function clearSession(reason: SignedOutReason | null) {
    session = null;
    await deps.clearStoredSession();
    emit({ status: 'signed-out', user: null, reason });
  }

  async function refreshIfNeeded(options: AccessTokenOptions = {}): Promise<StoredAuthSession | null> {
    const current = session;
    if (!current) {
      return null;
    }

    const accessExpiresAt = Date.parse(current.accessTokenExpiresAt);
    const shouldRefresh = options.forceRefresh
      || !Number.isFinite(accessExpiresAt)
      || accessExpiresAt - now() <= REFRESH_LEEWAY_MS;

    if (!shouldRefresh) {
      return current;
    }

    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      try {
        const refreshed = await deps.refreshAccessToken(current.refreshToken);
        const nextSession: StoredAuthSession = {
          accessToken: refreshed.accessToken,
          accessTokenExpiresAt: refreshed.accessTokenExpiresAt,
          refreshToken: refreshed.refreshToken,
          refreshTokenExpiresAt: refreshed.refreshTokenExpiresAt,
          user: refreshed.user,
        };
        await persistSession(nextSession);
        return nextSession;
      } catch (error) {
        if (deps.isTerminalRefreshError(error)) {
          await clearSession('expired');
          return null;
        }
        throw error;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  }

  return {
    subscribe(listener: Listener) {
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
      };
    },
    getState() {
      return state;
    },
    async load() {
      const stored = await deps.readStoredSession();
      if (!stored) {
        emit({ status: 'signed-out', user: null, reason: null });
        return;
      }

      session = stored;
      emit({ status: 'signed-in', user: stored.user, reason: null });
    },
    async signInWithGoogleIdToken(idToken: string) {
      const result = await deps.exchangeGoogleIdToken(idToken);
      await persistSession({
        accessToken: result.accessToken,
        accessTokenExpiresAt: result.accessTokenExpiresAt,
        refreshToken: result.refreshToken,
        refreshTokenExpiresAt: result.refreshTokenExpiresAt,
        user: result.user,
      });
    },
    async signOut() {
      const current = session;
      if (current) {
        try {
          await deps.signOutMobileSession(current.refreshToken);
        } catch {
          // Clear local state even if remote revocation fails.
        }
      }
      await clearSession('manual');
    },
    async getAccessToken(options: AccessTokenOptions = {}) {
      const current = await refreshIfNeeded(options);
      return current?.accessToken ?? null;
    },
    async clear(reason: SignedOutReason | null = 'unknown') {
      await clearSession(reason);
    },
  };
}
