import {describe, it, expect, vi, beforeEach} from 'vitest';
import {NextRequest} from 'next/server';
import {GET} from './route';

vi.mock('@/lib/prisma', () => ({
  default: {
    workout: {
      findUnique: vi.fn(),
    },
    workoutExercise: {
      findFirst: vi.fn(),
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
const mockFindFirst = prisma.workoutExercise.findFirst as ReturnType<typeof vi.fn>;
const mockRequireSession = requireSession as ReturnType<typeof vi.fn>;

function makeRequest(exerciseId: string, currentWorkoutId?: number): [NextRequest, { params: Promise<{ exerciseId: string }> }] {
  const url = new URL(`http://localhost/api/exercises/${exerciseId}/previous-sets`);
  if (currentWorkoutId !== undefined) {
    url.searchParams.set('currentWorkoutId', String(currentWorkoutId));
  }
  const req = new NextRequest(url.toString());
  const props = {params: Promise.resolve({exerciseId})};
  return [req, props];
}

const mockSets = [
  {id: 1, workoutExerciseId: 10, order: 1, reps: 8, weight: 100},
  {id: 2, workoutExerciseId: 10, order: 2, reps: 8, weight: 100},
];

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({user: {id: 'user-1'}});
  mockFindUnique.mockResolvedValue({dateCompleted: null});
});

describe('GET /api/exercises/[exerciseId]/previous-sets', () => {
  it('returns sets from the most recent completed workout for the exercise', async () => {
    mockFindFirst.mockResolvedValue({id: 10, sets: mockSets});
    const [req, props] = makeRequest('5', 99);
    const res = await GET(req, props);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(mockSets);
  });

  it('returns an empty array when no previous completed workout exists', async () => {
    mockFindFirst.mockResolvedValue(null);
    const [req, props] = makeRequest('5', 99);
    const res = await GET(req, props);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('excludes the current workout from results', async () => {
    mockFindFirst.mockResolvedValue(null);
    const [req, props] = makeRequest('5', 42);
    await GET(req, props);
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workout: expect.objectContaining({
            id: {not: 42},
          }),
        }),
      })
    );
  });

  it('filters by the logged-in user', async () => {
    mockFindFirst.mockResolvedValue(null);
    const [req, props] = makeRequest('5', 42);
    await GET(req, props);
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          exerciseId: 5,
          workout: expect.objectContaining({
            week: {plan: {userId: 'user-1'}},
          }),
        }),
      })
    );
  });

  it('only considers workouts where dateCompleted is set', async () => {
    mockFindFirst.mockResolvedValue(null);
    const [req, props] = makeRequest('5');
    await GET(req, props);
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workout: expect.objectContaining({
            dateCompleted: {not: null},
          }),
        }),
      })
    );
  });

  it('returns 400 for a non-numeric exerciseId', async () => {
    const [req, props] = makeRequest('abc');
    const res = await GET(req, props);
    expect(res.status).toBe(400);
  });

  it('returns 400 for a zero or negative exerciseId', async () => {
    const [req, props] = makeRequest('0');
    const res = await GET(req, props);
    expect(res.status).toBe(400);
  });

  it('orders results by dateCompleted descending to get the most recent', async () => {
    mockFindFirst.mockResolvedValue({id: 10, sets: mockSets});
    const [req, props] = makeRequest('5', 99);
    await GET(req, props);
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: {workout: {dateCompleted: 'desc'}},
      })
    );
  });

  it('excludes workouts completed after the current workout when it is completed', async () => {
    const currentDate = new Date('2026-01-15T12:00:00Z');
    const setsFromA = [
      {id: 3, workoutExerciseId: 20, order: 1, reps: 5, weight: 80},
    ];
    mockFindUnique.mockResolvedValue({dateCompleted: currentDate});
    mockFindFirst.mockResolvedValue({id: 20, sets: setsFromA});

    const [req, props] = makeRequest('5', 2); // workout B = id 2
    const res = await GET(req, props);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(setsFromA);

    expect(mockFindFirst).toHaveBeenCalledWith(
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
    mockFindFirst.mockResolvedValue({id: 10, sets: mockSets});

    const [req, props] = makeRequest('5', 99);
    await GET(req, props);

    expect(mockFindFirst).toHaveBeenCalledWith(
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
