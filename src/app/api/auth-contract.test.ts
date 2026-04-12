import {beforeEach, describe, expect, it, vi} from 'vitest';

class AuthenticationError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'AuthenticationError';
  }
}

vi.mock('@lib/requireSession', () => ({
  AuthenticationError,
  requireSession: vi.fn(async () => {
    throw new AuthenticationError();
  }),
  isAuthenticationError: (error: unknown) => error instanceof AuthenticationError,
  authenticationErrorResponse: async () => {
    const {unauthenticatedResponse} = await import('@lib/apiResponses');
    return unauthenticatedResponse();
  },
}));

vi.mock('@lib/api', () => ({
  getUserData: vi.fn(),
  getUserEvents: vi.fn(),
  getUserMetrics: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    libraryAsset: {findMany: vi.fn()},
  },
}));

describe('protected route 401 contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a consistent 401 response shape across protected endpoints', async () => {
    const [{GET: getUserDataRoute}, {GET: getCalendarDataRoute}, {GET: getLibraryRoute}] = await Promise.all([
      import('./user-data/route'),
      import('./calendar-data/route'),
      import('./library/route'),
    ]);

    const responses = await Promise.all([getUserDataRoute(), getCalendarDataRoute(), getLibraryRoute(new Request('http://localhost') as never)]);

    for (const res of responses) {
      expect(res.status).toBe(401);
      await expect(res.json()).resolves.toMatchObject({code: 'UNAUTHENTICATED'});
    }
  });
});
