// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockRequireSession,
  mockExerciseFindMany,
} = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockExerciseFindMany: vi.fn(),
}));

vi.mock('@lib/requireSession', () => ({
  authenticationErrorResponse: () => Response.json({ error: 'Authentication is required.' }, { status: 401 }),
  isAuthenticationError: () => false,
  requireSession: mockRequireSession,
}));

vi.mock('@lib/prisma', () => ({
  default: {
    exercise: {
      findMany: mockExerciseFindMany,
    },
  },
}));

import { GET } from './route';

function makeRequest(path = '/api/exercises') {
  return new NextRequest(`http://localhost${path}`);
}

describe('GET /api/exercises', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockExerciseFindMany.mockResolvedValue([]);
  });

  it('returns the visible exercise array with the existing default query shape', async () => {
    const exercises = [{ id: 1, name: 'Bench Press', createdByUserId: null }];
    mockExerciseFindMany.mockResolvedValue(exercises);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(exercises);
    expect(mockExerciseFindMany).toHaveBeenCalledWith({
      where: { OR: [{ createdByUserId: null }, { createdByUserId: 'user-1' }] },
      orderBy: { name: 'asc' },
    });
  });

  it('applies optional search, take, and skip without changing the response envelope', async () => {
    const exercises = [{ id: 2, name: 'Incline Bench Press', createdByUserId: 'user-1' }];
    mockExerciseFindMany.mockResolvedValue(exercises);

    const response = await GET(makeRequest('/api/exercises?search= bench &take=10&skip=5'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(exercises);
    expect(mockExerciseFindMany).toHaveBeenCalledWith({
      where: {
        AND: [
          { OR: [{ createdByUserId: null }, { createdByUserId: 'user-1' }] },
          { name: { contains: 'bench', mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: 10,
      skip: 5,
    });
  });

  it('rejects invalid pagination query values', async () => {
    const response = await GET(makeRequest('/api/exercises?take=1000'));

    expect(response.status).toBe(400);
    expect(mockExerciseFindMany).not.toHaveBeenCalled();
  });
});
