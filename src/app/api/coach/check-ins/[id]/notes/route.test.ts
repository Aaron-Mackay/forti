import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockRequireSession,
  mockWeeklyCheckInUpdate,
  mockUserFindUnique,
  mockNotifyClientCoachFeedback,
  mockGetCoachCheckInById,
  mockRecordAuditEvent,
} = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockWeeklyCheckInUpdate: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockNotifyClientCoachFeedback: vi.fn(),
  mockGetCoachCheckInById: vi.fn(),
  mockRecordAuditEvent: vi.fn(),
}));

vi.mock('@lib/requireSession', () => ({
  requireSession: mockRequireSession,
}));

vi.mock('@lib/prisma', () => ({
  default: {
    weeklyCheckIn: {
      update: mockWeeklyCheckInUpdate,
    },
    user: {
      findUnique: mockUserFindUnique,
    },
  },
}));

vi.mock('@lib/notifications', () => ({
  notifyClientCoachFeedback: mockNotifyClientCoachFeedback,
}));

vi.mock('@lib/coachCheckIns', () => ({
  getCoachCheckInById: mockGetCoachCheckInById,
}));

vi.mock('@lib/auditEvents', () => ({
  recordAuditEvent: mockRecordAuditEvent,
}));

import { PATCH } from './route';

function makeRequest(body: unknown, id = '7') {
  return [
    new NextRequest(`http://localhost/api/coach/check-ins/${id}/notes`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
    { params: Promise.resolve({ id }) },
  ] as const;
}

describe('PATCH /api/coach/check-ins/[id]/notes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ user: { id: 'coach-1' } });
    mockGetCoachCheckInById.mockResolvedValue({
      status: 'ok',
      checkIn: { id: 7, userId: 'client-1' },
    });
    mockWeeklyCheckInUpdate.mockResolvedValue({ id: 7 });
    mockUserFindUnique.mockResolvedValue({ name: 'Coach Carter' });
    mockNotifyClientCoachFeedback.mockResolvedValue(undefined);
  });

  it('records a check-in reviewed event after success', async () => {
    const [req, props] = makeRequest({ coachNotes: 'Nice work', coachResponseUrl: 'https://example.com/review' });
    const res = await PATCH(req, props);

    expect(res.status).toBe(200);
    expect(mockRecordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: 'coach-1',
      analyticsEvent: 'checkin_reviewed',
      subjectId: 7,
      metadata: expect.objectContaining({
        clientUserId: 'client-1',
        hasResponseUrl: true,
      }),
    }));
  });

  it('does not record telemetry for invalid response URLs', async () => {
    const [req, props] = makeRequest({ coachNotes: 'Nice work', coachResponseUrl: 'ftp://bad-url' });
    const res = await PATCH(req, props);

    expect(res.status).toBe(400);
    expect(mockRecordAuditEvent).not.toHaveBeenCalled();
  });
});
