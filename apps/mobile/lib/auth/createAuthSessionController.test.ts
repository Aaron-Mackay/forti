import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthSessionController } from './createAuthSessionController';
import type { StoredAuthSession } from './storedSession';

class MockAuthApiError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
    this.name = 'MockAuthApiError';
  }
}

function buildStoredSession(overrides: Partial<StoredAuthSession> = {}): StoredAuthSession {
  return {
    accessToken: 'access-token',
    accessTokenExpiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    refreshToken: 'refresh-token',
    refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Forti User',
    },
    ...overrides,
  };
}

describe('createAuthSessionController', () => {
  const now = new Date('2026-05-07T10:00:00.000Z').getTime();

  const readStoredSession = vi.fn<() => Promise<StoredAuthSession | null>>();
  const writeStoredSession = vi.fn<(session: StoredAuthSession) => Promise<void>>();
  const clearStoredSession = vi.fn<() => Promise<void>>();
  const exchangeGoogleIdToken = vi.fn();
  const refreshAccessToken = vi.fn();
  const signOutMobileSession = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createController() {
    return createAuthSessionController({
      clearStoredSession,
      exchangeGoogleIdToken,
      isTerminalRefreshError: (error) =>
        error instanceof MockAuthApiError && (error.status === 401 || error.status === 403),
      now: () => now,
      readStoredSession,
      refreshAccessToken,
      signOutMobileSession,
      writeStoredSession,
    });
  }

  it('loads an existing stored session', async () => {
    readStoredSession.mockResolvedValue(buildStoredSession());
    const controller = createController();

    await controller.load();

    expect(controller.getState()).toEqual({
      status: 'signed-in',
      user: buildStoredSession().user,
      reason: null,
    });
  });

  it('refreshes an expiring access token', async () => {
    readStoredSession.mockResolvedValue(buildStoredSession({
      accessTokenExpiresAt: new Date(now + 10_000).toISOString(),
    }));
    refreshAccessToken.mockResolvedValue({
      accessToken: 'refreshed-access',
      accessTokenExpiresAt: new Date(now + 30 * 60_000).toISOString(),
      refreshToken: 'refreshed-refresh',
      refreshTokenExpiresAt: new Date(now + 7 * 24 * 60 * 60_000).toISOString(),
      user: buildStoredSession().user,
    });

    const controller = createController();
    await controller.load();

    await expect(controller.getAccessToken()).resolves.toBe('refreshed-access');
    expect(writeStoredSession).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'refreshed-access',
        refreshToken: 'refreshed-refresh',
      }),
    );
  });

  it('forces a refresh after a 401-triggered retry request', async () => {
    readStoredSession.mockResolvedValue(buildStoredSession());
    refreshAccessToken.mockResolvedValue({
      accessToken: 'forced-access',
      accessTokenExpiresAt: new Date(now + 30 * 60_000).toISOString(),
      refreshToken: 'forced-refresh',
      refreshTokenExpiresAt: new Date(now + 7 * 24 * 60 * 60_000).toISOString(),
      user: buildStoredSession().user,
    });

    const controller = createController();
    await controller.load();

    await expect(controller.getAccessToken({ forceRefresh: true })).resolves.toBe('forced-access');
    expect(refreshAccessToken).toHaveBeenCalledWith('refresh-token');
  });

  it('clears the session when refresh is rejected with 401', async () => {
    readStoredSession.mockResolvedValue(buildStoredSession({
      accessTokenExpiresAt: new Date(now - 1_000).toISOString(),
    }));
    refreshAccessToken.mockRejectedValue(new MockAuthApiError(401));

    const controller = createController();
    await controller.load();

    await expect(controller.getAccessToken()).resolves.toBeNull();
    expect(clearStoredSession).toHaveBeenCalledTimes(1);
    expect(controller.getState()).toEqual({
      status: 'signed-out',
      user: null,
      reason: 'expired',
    });
  });
});
