import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockUserFindMany,
  mockTrainingSessionGroupBy,
  mockMetricGroupBy,
  mockWeeklyCheckInFindMany,
  mockNotificationFindMany,
  mockEventFindMany,
} = vi.hoisted(() => ({
  mockUserFindMany: vi.fn(),
  mockTrainingSessionGroupBy: vi.fn(),
  mockMetricGroupBy: vi.fn(),
  mockWeeklyCheckInFindMany: vi.fn(),
  mockNotificationFindMany: vi.fn(),
  mockEventFindMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findMany: mockUserFindMany,
    },
    trainingSession: {
      groupBy: mockTrainingSessionGroupBy,
    },
    metric: {
      groupBy: mockMetricGroupBy,
    },
    weeklyCheckIn: {
      findMany: mockWeeklyCheckInFindMany,
    },
    event: {
      findMany: mockEventFindMany,
    },
    notification: {
      findMany: mockNotificationFindMany,
    },
  },
}));

import { getCoachClientHealthSummary, getCoachHomeData } from '@/lib/coachService';

describe('getCoachClientHealthSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-27T10:00:00.000Z'));
  });

  it('returns health summaries with statuses, risk flags, and unread notification counts', async () => {
    mockUserFindMany.mockResolvedValue([
      { id: 'client-a', name: 'Alice', activePlan: { id: 5, name: 'Spring Cut' } },
      { id: 'client-b', name: 'Ben', activePlan: null },
    ]);

    mockTrainingSessionGroupBy.mockResolvedValue([
      { userId: 'client-a', _max: { performedAt: new Date('2026-04-26T00:00:00.000Z') } },
      { userId: 'client-b', _max: { performedAt: new Date('2026-04-18T00:00:00.000Z') } },
    ]);

    mockMetricGroupBy.mockResolvedValue([
      { userId: 'client-a', _max: { date: new Date('2026-04-25T00:00:00.000Z') } },
      { userId: 'client-b', _max: { date: null } },
    ]);

    mockWeeklyCheckInFindMany
      .mockResolvedValueOnce([
        { userId: 'client-a', completedAt: new Date('2026-04-27T09:00:00.000Z') },
      ])
      .mockResolvedValueOnce([
        { userId: 'client-a', coachReviewedAt: new Date('2026-04-27T09:30:00.000Z') },
        { userId: 'client-b', coachReviewedAt: null },
      ])
      .mockResolvedValueOnce([
        { id: 100, userId: 'client-a' },
        { id: 200, userId: 'client-b' },
      ]);

    mockNotificationFindMany.mockResolvedValue([
      { url: '/user/coach/check-ins/100' },
      { url: '/user/coach/check-ins/200' },
      { url: '/user/coach/check-ins/200' },
      { url: '/user/coach/check-ins/not-a-number' },
    ]);

    const summaries = await getCoachClientHealthSummary('coach-1');

    expect(summaries).toEqual([
      expect.objectContaining({
        clientId: 'client-a',
        currentWeekCheckInStatus: 'submitted',
        latestCoachReviewStatus: 'reviewed',
        unreadClientNotifications: 1,
        riskFlags: [],
      }),
      expect.objectContaining({
        clientId: 'client-b',
        currentWeekCheckInStatus: 'pending',
        latestCoachReviewStatus: 'awaiting_review',
        unreadClientNotifications: 2,
        riskFlags: ['No check-in this week', 'No workout in 7 days'],
      }),
    ]);
  });

  it('returns an empty list without additional queries when no clients exist', async () => {
    mockUserFindMany.mockResolvedValue([]);

    const summaries = await getCoachClientHealthSummary('coach-1');

    expect(summaries).toEqual([]);
    expect(mockTrainingSessionGroupBy).not.toHaveBeenCalled();
    expect(mockNotificationFindMany).not.toHaveBeenCalled();
  });
});

describe('getCoachHomeData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-09T10:00:00.000Z'));
  });

  it('builds the coach inbox with submitted check-ins and maintenance tasks', async () => {
    mockUserFindMany.mockResolvedValue([
      {
        id: 'client-a',
        name: 'Alice',
        activePlan: { id: 11, name: 'Spring Cut', lastActivityDate: new Date('2026-05-05T00:00:00.000Z') },
      },
      {
        id: 'client-b',
        name: 'Ben',
        activePlan: { id: 22, name: 'Offseason', lastActivityDate: new Date('2026-04-15T00:00:00.000Z') },
      },
      {
        id: 'client-c',
        name: 'Cara',
        activePlan: null,
      },
    ]);

    mockWeeklyCheckInFindMany.mockResolvedValue([
      {
        id: 301,
        userId: 'client-a',
        weekStartDate: new Date('2026-05-04T00:00:00.000Z'),
        completedAt: new Date('2026-05-08T13:00:00.000Z'),
        user: { id: 'client-a', name: 'Alice' },
      },
    ]);

    mockEventFindMany.mockResolvedValue([
      { userId: 'client-a', endDate: new Date('2026-05-13T00:00:00.000Z') },
      { userId: 'client-b', endDate: new Date('2026-06-01T00:00:00.000Z') },
    ]);

    const data = await getCoachHomeData('coach-1');

    expect(data).toEqual({
      summary: {
        clientCount: 3,
        submittedCheckInCount: 1,
        maintenanceCount: 3,
      },
      submittedCheckIns: [
        {
          checkInId: 301,
          clientId: 'client-a',
          clientName: 'Alice',
          weekStartDate: new Date('2026-05-04T00:00:00.000Z'),
          completedAt: new Date('2026-05-08T13:00:00.000Z'),
        },
      ],
      planMaintenance: [
        expect.objectContaining({
          clientId: 'client-c',
          kind: 'no_active_plan',
        }),
        expect.objectContaining({
          clientId: 'client-a',
          kind: 'block_ending',
          daysUntilBlockEnd: 4,
        }),
        expect.objectContaining({
          clientId: 'client-b',
          kind: 'plan_stale',
          staleDays: 24,
        }),
      ],
    });
  });

  it('returns empty arrays when the coach has no clients', async () => {
    mockUserFindMany.mockResolvedValue([]);

    const data = await getCoachHomeData('coach-1');

    expect(data).toEqual({
      summary: {
        clientCount: 0,
        submittedCheckInCount: 0,
        maintenanceCount: 0,
      },
      submittedCheckIns: [],
      planMaintenance: [],
    });
    expect(mockWeeklyCheckInFindMany).not.toHaveBeenCalled();
    expect(mockEventFindMany).not.toHaveBeenCalled();
  });
});
