import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetServerSession, mockDecode, mockHeaders } = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockDecode: vi.fn(),
  mockHeaders: vi.fn(),
}));

vi.mock('next-auth/next', () => ({ getServerSession: mockGetServerSession }));
vi.mock('next-auth/jwt', () => ({ decode: mockDecode }));
vi.mock('next/headers', () => ({ headers: mockHeaders }));
vi.mock('./auth', () => ({ authOptions: {} }));

import { AuthenticationError, isAuthenticationError, requireSession } from './requireSession';

describe('requireSession', () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = 'test-secret';
    mockHeaders.mockReturnValue({ get: () => null });
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXTAUTH_SECRET;
  });

  it('returns the cookie session when present', async () => {
    const session = { user: { id: 'u1' }, expires: '2030-01-01' };
    mockGetServerSession.mockResolvedValue(session);

    await expect(requireSession()).resolves.toBe(session);
    expect(mockDecode).not.toHaveBeenCalled();
  });

  it('falls back to Bearer token when no cookie session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    mockHeaders.mockReturnValue({
      get: (name: string) => (name === 'authorization' ? 'Bearer abc.def' : null),
    });
    mockDecode.mockResolvedValue({
      id: 'u2',
      email: 'rn@example.com',
      name: 'RN User',
      picture: null,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const result = await requireSession();
    expect(result.user.id).toBe('u2');
    expect(result.user.email).toBe('rn@example.com');
    expect(mockDecode).toHaveBeenCalledWith({ token: 'abc.def', secret: 'test-secret' });
  });

  it('accepts case-insensitive bearer scheme', async () => {
    mockGetServerSession.mockResolvedValue(null);
    mockHeaders.mockReturnValue({
      get: () => 'bearer abc.def',
    });
    mockDecode.mockResolvedValue({ id: 'u3' });

    await expect(requireSession()).resolves.toMatchObject({ user: { id: 'u3' } });
  });

  it('throws AuthenticationError when decode returns null', async () => {
    mockGetServerSession.mockResolvedValue(null);
    mockHeaders.mockReturnValue({
      get: () => 'Bearer expired.token',
    });
    mockDecode.mockResolvedValue(null);

    await expect(requireSession()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('throws AuthenticationError when decode throws', async () => {
    mockGetServerSession.mockResolvedValue(null);
    mockHeaders.mockReturnValue({
      get: () => 'Bearer bad.token',
    });
    mockDecode.mockRejectedValue(new Error('jwe failed'));

    await expect(requireSession()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('throws AuthenticationError when neither cookie nor Bearer present', async () => {
    mockGetServerSession.mockResolvedValue(null);

    await expect(requireSession()).rejects.toBeInstanceOf(AuthenticationError);
    expect(mockDecode).not.toHaveBeenCalled();
  });

  it('ignores Authorization header when scheme is not Bearer', async () => {
    mockGetServerSession.mockResolvedValue(null);
    mockHeaders.mockReturnValue({
      get: () => 'Basic abc.def',
    });

    await expect(requireSession()).rejects.toBeInstanceOf(AuthenticationError);
    expect(mockDecode).not.toHaveBeenCalled();
  });

  it('ignores Bearer header when token has no id claim', async () => {
    mockGetServerSession.mockResolvedValue(null);
    mockHeaders.mockReturnValue({
      get: () => 'Bearer abc.def',
    });
    mockDecode.mockResolvedValue({ email: 'no-id@example.com' });

    await expect(requireSession()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('isAuthenticationError narrows correctly', () => {
    expect(isAuthenticationError(new AuthenticationError())).toBe(true);
    expect(isAuthenticationError(new Error('other'))).toBe(false);
  });
});
