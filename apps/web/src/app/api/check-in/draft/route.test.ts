import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockRequireSession,
  mockUserFindUnique,
  mockWeeklyCheckInFindUnique,
  mockWeeklyCheckInUpsert,
} = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockWeeklyCheckInFindUnique: vi.fn(),
  mockWeeklyCheckInUpsert: vi.fn(),
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
    },
  },
}));

import { PATCH } from './route';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/check-in/draft', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('PATCH /api/check-in/draft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserFindUnique.mockResolvedValueOnce({ settings: null }).mockResolvedValueOnce({
      coach: {
        checkInTemplate: {
          version: 3,
          steps: [{
            id: 'step-1',
            title: 'Step 1',
            cards: [{
              id: 'card-1',
              kind: 'custom',
              columnSpan: 1,
              fields: [{ id: 'energy', type: 'rating', label: 'Energy', minScale: 1, maxScale: 5, required: true }],
            }],
          }],
        },
      },
    });
    mockWeeklyCheckInFindUnique.mockResolvedValue(null);
    mockWeeklyCheckInUpsert.mockResolvedValue({
      id: 99,
      userId: 'user-1',
      weekStartDate: new Date('2026-04-20T00:00:00.000Z'),
      completedAt: null,
      energyLevel: null,
      moodRating: null,
      stressLevel: null,
      sleepQuality: null,
      recoveryRating: null,
      adherenceRating: null,
      completedWorkouts: 1,
      plannedWorkouts: 2,
      weekReview: null,
      coachMessage: null,
      goalsNextWeek: null,
      customResponses: { energy: 3 },
      templateSnapshot: { version: 3, steps: [] },
      coachNotes: null,
      coachResponseUrl: null,
      coachReviewedAt: null,
      frontPhotoUrl: null,
      backPhotoUrl: null,
      sidePhotoUrl: null,
    });
  });

  it('creates or updates an unsubmitted weekly check-in draft', async () => {
    const res = await PATCH(makeRequest({
      customResponses: { energy: 3 },
      completedWorkouts: 1,
      plannedWorkouts: 2,
    }));

    expect(res.status).toBe(200);
    expect(mockWeeklyCheckInUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        customResponses: { energy: 3 },
      }),
      update: expect.objectContaining({
        completedAt: null,
        customResponses: { energy: 3 },
      }),
    }));
    await expect(res.json()).resolves.toEqual(expect.objectContaining({
      checkIn: expect.objectContaining({
        completedAt: null,
        frontPhotoUrl: null,
      }),
    }));
  });

  it('rejects saving a draft for an already submitted current check-in', async () => {
    mockUserFindUnique.mockReset();
    mockUserFindUnique.mockResolvedValueOnce({ settings: null }).mockResolvedValueOnce({
      coach: { checkInTemplate: { version: 3, steps: [{ id: 's1', title: 'Step', cards: [] }] } },
    });
    mockWeeklyCheckInFindUnique.mockResolvedValue({
      id: 77,
      completedAt: new Date('2026-04-21T10:00:00.000Z'),
    });

    const res = await PATCH(makeRequest({ customResponses: {} }));

    expect(res.status).toBe(409);
  });
});
