// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';
import { issueMobileRefreshToken } from './mobileAuth';
import { issueTestMobileToken } from '../../tests/helpers/issueTestMobileToken';

const { mockGetServerSession, mockHeaders, mockFindUnique } = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockHeaders: vi.fn(),
  mockFindUnique: vi.fn(),
}));

vi.mock('next-auth/next', () => ({ getServerSession: mockGetServerSession }));
vi.mock('next/headers', () => ({ headers: mockHeaders }));
vi.mock('./auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: mockFindUnique,
    },
  },
}));

import { AuthenticationError, isAuthenticationError, requireSession } from './requireSession';

async function issueExpiredAccessToken(userId: string) {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ tokenType: 'mobile-access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer('forti')
    .setAudience('forti-mobile')
    .setIssuedAt(now - 120)
    .setExpirationTime(now - 60)
    .sign(new TextEncoder().encode(process.env.MOBILE_JWT_SECRET!));
}

describe('requireSession', () => {
  beforeEach(() => {
    process.env.MOBILE_JWT_SECRET = 'a'.repeat(64);
    mockHeaders.mockReturnValue({ get: () => null });
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.MOBILE_JWT_SECRET;
  });

  it('returns the cookie session when present', async () => {
    const session = { user: { id: 'u1' }, expires: '2030-01-01' };
    mockGetServerSession.mockResolvedValue(session);

    await expect(requireSession()).resolves.toBe(session);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('returns a session for a valid mobile bearer token', async () => {
    const { token } = await issueTestMobileToken('u2');

    mockHeaders.mockReturnValue({
      get: (name: string) => (name === 'authorization' ? `Bearer ${token}` : null),
    });
    mockFindUnique.mockResolvedValue({
      id: 'u2',
      email: 'rn@example.com',
      name: 'RN User',
      image: null,
    });

    const result = await requireSession();
    expect(result.user.id).toBe('u2');
    expect(result.user.email).toBe('rn@example.com');
    expect(new Date(result.expires).toString()).not.toBe('Invalid Date');
    expect(mockGetServerSession).not.toHaveBeenCalled();
  });

  it('prefers bearer auth over a cookie session when both are present', async () => {
    const { token } = await issueTestMobileToken('u-bearer');

    mockHeaders.mockReturnValue({
      get: () => `Bearer ${token}`,
    });
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u-cookie', email: 'cookie@example.com' },
      expires: '2030-01-01',
    });
    mockFindUnique.mockResolvedValue({
      id: 'u-bearer',
      email: 'bearer@example.com',
      name: 'Bearer User',
      image: null,
    });

    await expect(requireSession()).resolves.toMatchObject({ user: { id: 'u-bearer' } });
    expect(mockGetServerSession).not.toHaveBeenCalled();
  });

  it('throws AuthenticationError when the bearer token is invalid', async () => {
    mockHeaders.mockReturnValue({
      get: () => 'Bearer expired.token',
    });

    await expect(requireSession()).rejects.toBeInstanceOf(AuthenticationError);
    expect(mockGetServerSession).not.toHaveBeenCalled();
  });

  it('throws AuthenticationError when the bearer token is expired', async () => {
    const token = await issueExpiredAccessToken('u-expired');

    mockHeaders.mockReturnValue({
      get: () => `Bearer ${token}`,
    });
    mockFindUnique.mockResolvedValue({
      id: 'u-expired',
      email: 'expired@example.com',
      name: 'Expired User',
      image: null,
    });

    await expect(requireSession()).rejects.toBeInstanceOf(AuthenticationError);
    expect(mockGetServerSession).not.toHaveBeenCalled();
  });

  it('rejects a refresh token used as a bearer access token', async () => {
    const { token } = await issueMobileRefreshToken('u-refresh', 'session-1');

    mockHeaders.mockReturnValue({
      get: () => `Bearer ${token}`,
    });

    await expect(requireSession()).rejects.toBeInstanceOf(AuthenticationError);
    expect(mockGetServerSession).not.toHaveBeenCalled();
  });

  it('throws AuthenticationError when the bearer token user is missing', async () => {
    const { token } = await issueTestMobileToken('missing-user');

    mockHeaders.mockReturnValue({
      get: () => `Bearer ${token}`,
    });
    mockFindUnique.mockResolvedValue(null);

    await expect(requireSession()).rejects.toBeInstanceOf(AuthenticationError);
    expect(mockGetServerSession).not.toHaveBeenCalled();
  });

  it('returns the cookie session when no bearer token is present', async () => {
    const session = { user: { id: 'u-cookie' }, expires: '2030-01-01' };
    mockGetServerSession.mockResolvedValue(session);

    await expect(requireSession()).resolves.toBe(session);
  });

  it('throws AuthenticationError when neither cookie nor bearer auth is present', async () => {
    mockGetServerSession.mockResolvedValue(null);

    await expect(requireSession()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('ignores non-bearer authorization headers', async () => {
    const session = { user: { id: 'u-basic' }, expires: '2030-01-01' };
    mockHeaders.mockReturnValue({
      get: () => 'Basic abc.def',
    });
    mockGetServerSession.mockResolvedValue(session);

    await expect(requireSession()).resolves.toBe(session);
  });

  it('isAuthenticationError narrows correctly', () => {
    expect(isAuthenticationError(new AuthenticationError())).toBe(true);
    expect(isAuthenticationError(new Error('other'))).toBe(false);
  });
});
