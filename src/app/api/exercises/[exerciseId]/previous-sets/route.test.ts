import {describe, it, expect, vi, beforeEach} from 'vitest';
import {NextRequest} from 'next/server';
import {GET} from './route';

vi.mock('@/lib/prisma', () => ({
  default: {
    workout: {
      findUnique: vi.fn(),
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
const mockFindMany = prisma.workout.findMany as ReturnType<typeof vi.fn>;
const mockRequireSession = requireSession as ReturnType<typeof vi.fn>;

function makeRequest(
  exerciseId: string,
  currentWorkoutId = 99,
  currentWorkoutExerciseId = 10,
): [NextRequest, { params: Promise<{ exerciseId: string }> }] {
  const url = new URL(`http://localhost/api/exercises/${exerciseId}/previous-sets`);
  url.searchParams.set('currentWorkoutId', String(currentWorkoutId));
  url.searchParams.set('currentWorkoutExerciseId', String(currentWorkoutExerciseId));
  const req = new NextRequest(url.toString());
  const props = {params: Promise.resolve({exerciseId})};
  return [req, props];
}

const currentWorkout = {
  dateCompleted: null,
  exercises: [
    {id: 10},
    {id: 11},
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({user: {id: 'user-1'}});
  mockFindUnique.mockResolvedValue(currentWorkout);
});

describe('GET /api/exercises/[exerciseId]/previous-sets', () => {
  it('returns up to three matched duplicate instances in descending workout order', async () => {
    mockFindMany.mockResolvedValue([
      {
        dateCompleted: new Date('2026-01-14T12:00:00Z'),
        exercises: [
          {
            sets: [{order: 1, reps: 8, weight: 100, e1rm: 126.7}],
          },
          {
            sets: [{order: 1, reps: 12, weight: 80, e1rm: 112}],
          },
        ],
      },
      {
        dateCompleted: new Date('2026-01-07T12:00:00Z'),
        exercises: [
          {
            sets: [{order: 1, reps: 9, weight: 97.5, e1rm: 126.75}],
          },
          {
            sets: [{order: 1, reps: 10, weight: 77.5, e1rm: 103.3}],
          },
        ],
      },
    ]);

    const [req, props] = makeRequest('5', 99, 11);
    const res = await GET(req, props);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      workouts: [
        {
          completedAt: '2026-01-14T12:00:00.000Z',
          sets: [{order: 1, reps: 12, weight: 80, e1rm: 112}],
        },
        {
          completedAt: '2026-01-07T12:00:00.000Z',
          sets: [{order: 1, reps: 10, weight: 77.5, e1rm: 103.3}],
        },
      ],
    });
  });

  it('returns an empty history payload when no previous completed workout exists', async () => {
    mockFindMany.mockResolvedValue([]);

    const [req, props] = makeRequest('5', 99, 10);
    const res = await GET(req, props);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({workouts: []});
  });

  it('skips workouts that lack the same duplicate slot', async () => {
    mockFindMany.mockResolvedValue([
      {
        dateCompleted: new Date('2026-01-14T12:00:00Z'),
        exercises: [
          {
            sets: [{order: 1, reps: 8, weight: 100, e1rm: 126.7}],
          },
        ],
      },
      {
        dateCompleted: new Date('2026-01-07T12:00:00Z'),
        exercises: [
          {
            sets: [{order: 1, reps: 8, weight: 100, e1rm: 126.7}],
          },
          {
            sets: [{order: 1, reps: 11, weight: 75, e1rm: 102.5}],
          },
        ],
      },
    ]);

    const [req, props] = makeRequest('5', 99, 11);
    const res = await GET(req, props);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      workouts: [
        {
          completedAt: '2026-01-07T12:00:00.000Z',
          sets: [{order: 1, reps: 11, weight: 75, e1rm: 102.5}],
        },
      ],
    });
  });

  it('computes e1rm when it is missing on the previous set row', async () => {
    mockFindMany.mockResolvedValue([
      {
        dateCompleted: new Date('2026-01-14T12:00:00Z'),
        exercises: [
          {
            sets: [{order: 1, reps: 5, weight: 80, e1rm: null}],
          },
          {
            sets: [],
          },
        ],
      },
    ]);

    const [req, props] = makeRequest('5', 99, 10);
    const res = await GET(req, props);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      workouts: [
        {
          completedAt: '2026-01-14T12:00:00.000Z',
          sets: [{order: 1, reps: 5, weight: 80, e1rm: 93.33333333333334}],
        },
      ],
    });
  });

  it('returns 400 when current workout context is missing', async () => {
    const url = new URL('http://localhost/api/exercises/5/previous-sets');
    url.searchParams.set('currentWorkoutId', '99');
    const req = new NextRequest(url.toString());
    const props = {params: Promise.resolve({exerciseId: '5'})};

    const res = await GET(req, props);

    expect(res.status).toBe(400);
  });

  it('returns 400 when the current workout exercise does not match the workout duplicate list', async () => {
    const [req, props] = makeRequest('5', 99, 999);

    const res = await GET(req, props);

    expect(res.status).toBe(400);
  });

  it('filters by the logged-in user and completed workouts', async () => {
    mockFindMany.mockResolvedValue([]);

    const [req, props] = makeRequest('5', 42, 10);
    await GET(req, props);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dateCompleted: {not: null},
          week: {plan: {userId: 'user-1'}},
          exercises: {some: {exerciseId: 5}},
          id: {not: 42},
        }),
        orderBy: {dateCompleted: 'desc'},
        take: 3,
      }),
    );
  });

  it('adds an upper date bound when the current workout is already completed', async () => {
    mockFindUnique.mockResolvedValueOnce({dateCompleted: new Date('2026-01-15T12:00:00Z')});
    mockFindUnique.mockResolvedValueOnce(currentWorkout);
    mockFindMany.mockResolvedValue([]);

    const [req, props] = makeRequest('5', 42, 10);
    await GET(req, props);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dateCompleted: {not: null, lt: new Date('2026-01-15T12:00:00Z')},
        }),
      }),
    );
  });
});
