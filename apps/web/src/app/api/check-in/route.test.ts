import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockRequireSession,
  mockUserFindUnique,
  mockWeeklyCheckInFindUnique,
  mockWeeklyCheckInUpsert,
  mockWeeklyCheckInFindMany,
  mockWeeklyCheckInCount,
  mockWorkoutFindMany,
  mockNotifyCoachCheckInSubmitted,
  mockRecordAuditEvent,
} = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockWeeklyCheckInFindUnique: vi.fn(),
  mockWeeklyCheckInUpsert: vi.fn(),
  mockWeeklyCheckInFindMany: vi.fn(),
  mockWeeklyCheckInCount: vi.fn(),
  mockWorkoutFindMany: vi.fn(),
  mockNotifyCoachCheckInSubmitted: vi.fn(),
  mockRecordAuditEvent: vi.fn(),
}));

vi.mock('@lib/requireSession', () => ({
  requireSession: mockRequireSession,
}));

vi.mock('@lib/prisma', () => ({
  default: {
    user: {
      findUnique: mockUserFindUnique,
    },
    weeklyCheckIn: {
      findUnique: mockWeeklyCheckInFindUnique,
      upsert: mockWeeklyCheckInUpsert,
      findMany: mockWeeklyCheckInFindMany,
      count: mockWeeklyCheckInCount,
    },
    workout: {
      findMany: mockWorkoutFindMany,
    },
  },
}));

vi.mock('@lib/notifications', () => ({
  notifyCoachCheckInSubmitted: mockNotifyCoachCheckInSubmitted,
}));

vi.mock('@lib/auditEvents', () => ({
  recordAuditEvent: mockRecordAuditEvent,
}));

import { GET, POST } from './route';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/check-in', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeGetRequest(path = '/api/check-in') {
  return new NextRequest(`http://localhost${path}`);
}

function makeWeeklyCheckIn(overrides: Record<string, unknown> = {}) {
  return {
    id: 99,
    userId: 'user-1',
    weekStartDate: new Date('2026-04-20T00:00:00.000Z'),
    completedAt: new Date('2026-04-22T10:00:00.000Z'),
    energyLevel: 4,
    moodRating: null,
    stressLevel: null,
    sleepQuality: null,
    recoveryRating: null,
    adherenceRating: null,
    completedWorkouts: null,
    plannedWorkouts: null,
    weekReview: 'Solid week',
    coachMessage: null,
    goalsNextWeek: null,
    customResponses: null,
    templateSnapshot: null,
    coachNotes: null,
    coachResponseUrl: null,
    coachReviewedAt: null,
    frontPhotoUrl: null,
    backPhotoUrl: null,
    sidePhotoUrl: null,
    ...overrides,
  };
}

describe('POST /api/check-in', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserFindUnique.mockResolvedValue({
      name: 'Jeff',
      settings: null,
      coach: { id: 'coach-1', email: 'coach@example.com', name: 'Coach' },
    });
    mockWeeklyCheckInFindUnique.mockResolvedValue(null);
    mockWeeklyCheckInUpsert.mockResolvedValue(makeWeeklyCheckIn());
    mockNotifyCoachCheckInSubmitted.mockResolvedValue(undefined);
  });

  it('records a check-in submitted event after success', async () => {
    const res = await POST(makeRequest({ energyLevel: 4, weekReview: 'Solid week' }));

    expect(res.status).toBe(201);
    expect(mockRecordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: 'user-1',
      analyticsEvent: 'checkin_submitted',
      subjectType: 'weekly_check_in',
      subjectId: 99,
    }));
  });

  it('does not record telemetry for invalid ratings', async () => {
    const res = await POST(makeRequest({ energyLevel: 8 }));

    expect(res.status).toBe(400);
    expect(mockRecordAuditEvent).not.toHaveBeenCalled();
  });
});

describe('GET /api/check-in', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserFindUnique.mockResolvedValue({ settings: null });
    mockWeeklyCheckInCount.mockResolvedValue(2);
  });

  it('batches workout enrichment for returned history rows', async () => {
    const firstCheckIn = makeWeeklyCheckIn({
      id: 101,
      weekStartDate: new Date('2026-04-06T00:00:00.000Z'),
      frontPhotoUrl: 'front-key',
    });
    const secondCheckIn = makeWeeklyCheckIn({
      id: 102,
      weekStartDate: new Date('2026-04-13T00:00:00.000Z'),
    });
    mockWeeklyCheckInFindMany.mockResolvedValue([firstCheckIn, secondCheckIn]);

    mockWorkoutFindMany
      .mockResolvedValueOnce([
        {
          id: 202,
          dateCompleted: new Date('2026-04-15T12:00:00.000Z'),
          weekId: 22,
          week: { planId: 2002 },
        },
        {
          id: 201,
          dateCompleted: new Date('2026-04-08T12:00:00.000Z'),
          weekId: 11,
          week: { planId: 1001 },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 301,
          name: 'Push',
          dateCompleted: new Date('2026-04-08T12:00:00.000Z'),
          weekId: 11,
          week: { order: 1, planId: 1001 },
          exercises: [
            {
              sets: [
                { id: 1, reps: 8, isDropSet: false, parentSetId: null, order: 1 },
                { id: 2, reps: null, isDropSet: false, parentSetId: null, order: 2 },
              ],
              exercise: { category: 'resistance', primaryMuscles: ['chest'] },
            },
          ],
        },
        {
          id: 302,
          name: 'Pull',
          dateCompleted: new Date('2026-04-15T12:00:00.000Z'),
          weekId: 22,
          week: { order: 2, planId: 2002 },
          exercises: [
            {
              sets: [
                { id: 3, reps: 10, isDropSet: false, parentSetId: null, order: 1 },
                { id: 4, reps: 8, isDropSet: true, parentSetId: 3, order: 2 },
              ],
              exercise: { category: 'resistance', primaryMuscles: ['lats'] },
            },
          ],
        },
      ]);

    const res = await GET(makeGetRequest('/api/check-in?limit=10&offset=0'));

    expect(res.status).toBe(200);
    expect(mockWorkoutFindMany).toHaveBeenCalledTimes(2);
    expect(mockWorkoutFindMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({
        week: { plan: { userId: 'user-1' } },
        dateCompleted: {
          gte: new Date('2026-04-06T00:00:00.000Z'),
          lt: new Date('2026-04-20T00:00:00.000Z'),
        },
      }),
    }));
    expect(mockWorkoutFindMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { weekId: { in: [11, 22] } },
    }));

    const body = await res.json();
    expect(body.total).toBe(2);
    expect(body.checkIns[0]).toEqual(expect.objectContaining({
      id: 101,
      frontPhotoUrl: '/api/check-in/photos/101/front',
      activePlanId: 1001,
      workoutSummaries: [
        expect.objectContaining({
          workoutId: 301,
          workoutName: 'Push',
          completedSets: 1,
          plannedSets: 2,
          muscleDoneSets: [{ muscle: 'chest', doneSets: 1 }],
        }),
      ],
    }));
    expect(body.checkIns[1]).toEqual(expect.objectContaining({
      id: 102,
      activePlanId: 2002,
      workoutSummaries: [
        expect.objectContaining({
          workoutId: 302,
          workoutName: 'Pull',
          completedSets: 2,
          plannedSets: 2,
          muscleDoneSets: [{ muscle: 'lats', doneSets: 1.5 }],
        }),
      ],
    }));
  });

  it('does not query workouts when no history rows are returned', async () => {
    mockWeeklyCheckInFindMany.mockResolvedValue([]);
    mockWeeklyCheckInCount.mockResolvedValue(0);

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    expect(mockWorkoutFindMany).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toEqual({ checkIns: [], total: 0 });
  });
});
