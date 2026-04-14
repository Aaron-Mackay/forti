import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const { mockConfirmPermission, mockTransaction } = vi.hoisted(() => ({
  mockConfirmPermission: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('@lib/confirmPermission', () => ({
  default: mockConfirmPermission,
}));

vi.mock('@lib/prisma', () => ({
  default: {
    $transaction: mockTransaction,
  },
}));

vi.mock('@lib/exerciseQueries', () => ({
  findOrCreateExercise: vi.fn(),
}));

vi.mock('@lib/requireSession', () => ({
  isAuthenticationError: vi.fn(() => false),
  authenticationErrorResponse: vi.fn(() => Response.json({ error: 'Unauthorized' }, { status: 401 })),
}));

describe('POST /api/saveUserWorkoutData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirmPermission.mockResolvedValue(undefined);
    mockTransaction.mockResolvedValue(undefined);
  });

  it('uses the extended Prisma transaction timeout for large saves', async () => {
    const res = await POST(new Request('http://localhost/api/saveUserWorkoutData', {
      method: 'POST',
      body: JSON.stringify({
        id: 'user-1',
        plans: [],
      }),
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(res.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTransaction.mock.calls[0][1]).toEqual({ timeout: 15_000 });
  });
});
