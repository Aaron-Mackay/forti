import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockSaveUserPlan, mockConfirmPermission, mockRecordAuditEvent, mockGetSessionActorUserId } = vi.hoisted(() => ({
  mockSaveUserPlan: vi.fn(),
  mockConfirmPermission: vi.fn(),
  mockRecordAuditEvent: vi.fn(),
  mockGetSessionActorUserId: vi.fn(),
}));

vi.mock('@lib/api', () => ({
  saveUserPlan: mockSaveUserPlan,
}));

vi.mock('@lib/confirmPermission', () => ({
  default: mockConfirmPermission,
}));

vi.mock('@lib/auditEvents', () => ({
  recordAuditEvent: mockRecordAuditEvent,
}));

vi.mock('@lib/sessionActor', () => ({
  getSessionActorUserId: mockGetSessionActorUserId,
}));

vi.mock('@lib/requireSession', () => ({
  isAuthenticationError: vi.fn(() => false),
  authenticationErrorResponse: vi.fn(() => Response.json({ error: 'Unauthorized' }, { status: 401 })),
}));

import { POST } from './route';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/plan', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/plan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirmPermission.mockResolvedValue(undefined);
    mockSaveUserPlan.mockResolvedValue(42);
    mockGetSessionActorUserId.mockResolvedValue('user-1');
  });

  it('records a plan-created event after a successful save', async () => {
    const res = await POST(makeRequest({
      id: 1,
      userId: 'user-1',
      order: 1,
      name: 'Plan',
      description: null,
      weeks: [
        { id: 11, order: 1, workouts: [{ id: 21, order: 1, name: 'Day 1', notes: null, exercises: [] }] },
      ],
    }));

    expect(res.status).toBe(200);
    expect(mockRecordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: 'user-1',
      analyticsEvent: 'plan_created',
      subjectType: 'plan',
      subjectId: 42,
      metadata: expect.objectContaining({
        targetUserId: 'user-1',
        weekCount: 1,
        workoutCount: 1,
      }),
    }));
  });
});
