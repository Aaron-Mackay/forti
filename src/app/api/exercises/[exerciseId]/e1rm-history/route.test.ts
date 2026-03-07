import {describe, it, expect, vi, beforeEach} from 'vitest';
import {NextRequest} from 'next/server';
import {GET} from './route';

vi.mock('@/lib/prisma', () => ({
  default: {
    workoutExercise: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@lib/getLoggedInUser', () => ({
  default: vi.fn(),
}));

import prisma from '@/lib/prisma';
import getLoggedInUser from '@lib/getLoggedInUser';

const mockFindMany = prisma.workoutExercise.findMany as ReturnType<typeof vi.fn>;
const mockGetLoggedInUser = getLoggedInUser as ReturnType<typeof vi.fn>;

function makeRequest(exerciseId: string): [NextRequest, {params: Promise<{exerciseId: string}>}] {
  const req = new NextRequest(`http://localhost/api/exercises/${exerciseId}/e1rm-history`);
  return [req, {params: Promise.resolve({exerciseId})}];
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetLoggedInUser.mockResolvedValue({id: 'user-1'});
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
});
