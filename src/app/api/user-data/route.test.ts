// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetServerSession,
  mockHeaders,
  mockFindUnique,
  mockGetUserData,
} = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockHeaders: vi.fn(),
  mockFindUnique: vi.fn(),
  mockGetUserData: vi.fn(),
}));

vi.mock('next-auth/next', () => ({ getServerSession: mockGetServerSession }));
vi.mock('next/headers', () => ({ headers: mockHeaders }));
vi.mock('../../../lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: mockFindUnique,
    },
  },
}));
vi.mock('@lib/userService', () => ({
  getUserData: mockGetUserData,
}));

import { GET } from './route';
import { issueTestMobileToken } from '../../../../tests/helpers/issueTestMobileToken';

describe('GET /api/user-data auth parity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MOBILE_JWT_SECRET = 'a'.repeat(64);
    mockHeaders.mockReturnValue({ get: () => null });
  });

  it('returns the same payload for cookie and bearer auth', async () => {
    const userData = {
      id: 'user-1',
      name: 'Parity User',
      plans: [],
      userExerciseNotes: [],
    };

    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com', name: 'Parity User', image: null },
      expires: '2030-01-01T00:00:00.000Z',
    });
    mockGetUserData.mockResolvedValue(userData);

    const cookieResponse = await GET();

    expect(cookieResponse.status).toBe(200);
    await expect(cookieResponse.json()).resolves.toEqual(userData);
    expect(mockGetUserData).toHaveBeenCalledWith('user-1');

    vi.clearAllMocks();

    const { token } = await issueTestMobileToken('user-1');
    mockHeaders.mockReturnValue({
      get: (name: string) => (name === 'authorization' ? `Bearer ${token}` : null),
    });
    mockGetServerSession.mockResolvedValue({
      user: { id: 'cookie-user', email: 'cookie@example.com' },
      expires: '2030-01-01T00:00:00.000Z',
    });
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Parity User',
      image: null,
    });
    mockGetUserData.mockResolvedValue(userData);

    const bearerResponse = await GET();

    expect(bearerResponse.status).toBe(200);
    await expect(bearerResponse.json()).resolves.toEqual(userData);
    expect(mockGetUserData).toHaveBeenCalledWith('user-1');
    expect(mockGetServerSession).not.toHaveBeenCalled();
  });
});
