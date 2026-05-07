import { AuthApiError, exchangeGoogleIdToken, refreshAccessToken, signOutMobileSession } from './authClient';
import { createAuthSessionController } from './createAuthSessionController';
import { clearStoredSession, readStoredSession, writeStoredSession } from './secureStorage';

export function createDefaultAuthSessionController() {
  return createAuthSessionController({
    clearStoredSession,
    exchangeGoogleIdToken,
    isTerminalRefreshError: (error) =>
      error instanceof AuthApiError && (error.status === 401 || error.status === 403),
    now: Date.now,
    readStoredSession,
    refreshAccessToken,
    signOutMobileSession,
    writeStoredSession,
  });
}
