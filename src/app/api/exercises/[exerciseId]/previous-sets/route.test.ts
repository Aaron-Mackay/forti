import {describe, it, expect, vi, beforeEach} from 'vitest';
import {NextRequest} from 'next/server';
import {GET} from './route';

vi.mock('@/lib/prisma', () => ({
  default: {
    workoutExercise: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@lib/getLoggedInUser', () => ({
  default: vi.fn(),
}));

import prisma from '@/lib/prisma';
import getLoggedInUser from '@lib/getLoggedInUser';

const mockFindFirst = prisma.workoutExercise.findFirst as ReturnType<typeof vi.fn>;
const mockGetLoggedInUser = getLoggedInUser as ReturnType<typeof vi.fn>;

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
  {id: 1, workoutExerciseId: 10, order: 1, reps: 8, weight: '100'},
  {id: 2, workoutExerciseId: 10, order: 2, reps: 8, weight: '100'},
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetLoggedInUser.mockResolvedValue({id: 'user-1'});
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
});
