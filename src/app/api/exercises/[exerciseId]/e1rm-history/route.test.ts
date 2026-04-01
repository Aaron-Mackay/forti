import {describe, it, expect, vi, beforeEach} from 'vitest';
import {NextRequest} from 'next/server';
import {GET} from './route';

vi.mock('@/lib/prisma', () => ({
  default: {
    workout: {
      findUnique: vi.fn(),
    },
    workoutExercise: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@lib/requireSession', () => ({
  requireSession: vi.fn(),
  isAuthenticationError: (error: unknown) => error instanceof Error && error.name === 'AuthenticationError',
  authenticationErrorResponse: () => Response.json({ error: 'Unauthorized' }, { status: 401 }),
}));

import prisma from '@/lib/prisma';
import {requireSession} from '@lib/requireSession';

const mockFindUnique = prisma.workout.findUnique as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.workoutExercise.findMany as ReturnType<typeof vi.fn>;
const mockRequireSession = requireSession as ReturnType<typeof vi.fn>;

function makeRequest(exerciseId: string, currentWorkoutId?: number): [NextRequest, {params: Promise<{exerciseId: string}>}] {
  const url = new URL(`http://localhost/api/exercises/${exerciseId}/e1rm-history`);
  if (currentWorkoutId !== undefined) url.searchParams.set('currentWorkoutId', String(currentWorkoutId));
  return [new NextRequest(url.toString()), {params: Promise.resolve({exerciseId})}];
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({user: {id: 'user-1'}});
  mockFindUnique.mockResolvedValue({dateCompleted: null});
});

describe('GET /api/exercises/[exerciseId]/e1rm-history', () => {
  it('returns best e1rm per session sorted by date', async () => {
    const date1 = new Date('2025-01-10T00:00:00Z');
    const date2 = new Date('2025-02-10T00:00:00Z');
    mockFindMany.mockResolvedValue([
      {workout: {dateCompleted: date1}, sets: [{e1rm: 80}, {e1rm: 85}, {e1rm: 82}]},
      {workout: {dateCompleted: date2}, sets: [{e1rm: 90}, {e1rm: 88}]},
    ]);

    const [req, props] = makeRequest('5');
    const res = await GET(req, props);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([
      {date: date1.toISOString(), bestE1rm: 85},
      {date: date2.toISOString(), bestE1rm: 90},
    ]);
  });

  it('excludes sessions where all sets have null e1rm', async () => {
    mockFindMany.mockResolvedValue([
      {workout: {dateCompleted: new Date('2025-01-10')}, sets: [{e1rm: null}, {e1rm: null}]},
      {workout: {dateCompleted: new Date('2025-02-10')}, sets: [{e1rm: 90}]},
    ]);

    const [req, props] = makeRequest('5');
    const res = await GET(req, props);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].bestE1rm).toBe(90);
  });

  it('returns empty array when no completed sessions exist', async () => {
    mockFindMany.mockResolvedValue([]);
    const [req, props] = makeRequest('5');
    const res = await GET(req, props);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('returns 400 for invalid exerciseId', async () => {
    const [req, props] = makeRequest('abc');
    const res = await GET(req, props);
    expect(res.status).toBe(400);
  });

  it('excludes sessions completed on or after the current workout when it is completed', async () => {
    const currentDate = new Date('2026-01-15T12:00:00Z');
    mockFindUnique.mockResolvedValue({dateCompleted: currentDate});
    mockFindMany.mockResolvedValue([]);

    const [req, props] = makeRequest('5', 2);
    await GET(req, props);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workout: expect.objectContaining({
            dateCompleted: {not: null, lt: currentDate},
          }),
        }),
      })
    );
  });

  it('does not add a date upper-bound when the current workout is in-progress', async () => {
    mockFindUnique.mockResolvedValue({dateCompleted: null});
    mockFindMany.mockResolvedValue([]);

    const [req, props] = makeRequest('5', 2);
    await GET(req, props);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workout: expect.objectContaining({
            dateCompleted: {not: null},
          }),
        }),
      })
    );
  });
});
