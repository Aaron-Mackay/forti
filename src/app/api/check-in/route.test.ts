import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockRequireSession,
  mockUserFindUnique,
  mockWeeklyCheckInFindUnique,
  mockWeeklyCheckInUpsert,
  mockWeeklyCheckInFindMany,
  mockWeeklyCheckInCount,
  mockNotifyCoachCheckInSubmitted,
  mockRecordAuditEvent,
} = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockWeeklyCheckInFindUnique: vi.fn(),
  mockWeeklyCheckInUpsert: vi.fn(),
  mockWeeklyCheckInFindMany: vi.fn(),
  mockWeeklyCheckInCount: vi.fn(),
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
  },
}));

vi.mock('@lib/notifications', () => ({
  notifyCoachCheckInSubmitted: mockNotifyCoachCheckInSubmitted,
}));

vi.mock('@lib/auditEvents', () => ({
  recordAuditEvent: mockRecordAuditEvent,
}));

import { POST } from './route';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/check-in', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
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
