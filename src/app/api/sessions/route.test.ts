import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  default: {
    workout: {
      findFirst: vi.fn(),
    },
    trainingSession: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@lib/requireSession', () => ({
  requireSession: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { requireSession } from '@lib/requireSession';

const mockRequireSession = requireSession as ReturnType<typeof vi.fn>;
const mockFindWorkout = prisma.workout.findFirst as ReturnType<typeof vi.fn>;
const trainingSessionDelegate = (prisma as unknown as {
  trainingSession: { create: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }
}).trainingSession;
const mockCreate = trainingSessionDelegate.create;
const mockFindMany = trainingSessionDelegate.findMany;

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ user: { id: 'user-1' } });
});

describe('POST /api/sessions', () => {
  it('creates a cardio session', async () => {
    mockCreate.mockResolvedValue({
      id: 1,
      sessionType: 'cardio',
      status: 'completed',
      performedAt: new Date('2026-04-20T00:00:00.000Z'),
      workoutId: null,
      activityType: 'Run',
      durationSec: 1800,
      distanceM: 5000,
      avgPace: 360,
      avgHr: 145,
      calories: 320,
      notes: null,
    });

    const req = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionType: 'cardio',
        cardio: {
          activityType: 'Run',
          durationSec: 1800,
          distanceM: 5000,
          avgPace: 360,
          avgHr: 145,
          calories: 320,
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalled();
  });

  it('rejects cardio session without cardio payload', async () => {
    const req = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionType: 'cardio' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects workout session if workout is not owned', async () => {
    mockFindWorkout.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionType: 'workout',
        workoutId: 10,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/sessions', () => {
  it('returns filtered sessions', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 1,
        sessionType: 'cardio',
        status: 'planned',
        performedAt: new Date('2026-04-21T00:00:00.000Z'),
        workoutId: null,
        activityType: 'Bike',
        durationSec: 2400,
        distanceM: null,
        avgPace: null,
        avgHr: null,
        calories: null,
        notes: null,
      },
    ]);

    const req = new NextRequest('http://localhost/api/sessions?type=cardio&status=planned');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        sessionType: 'cardio',
        status: 'planned',
      }),
    }));
  });
});
