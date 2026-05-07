import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAuditEventCreate, mockTrack } = vi.hoisted(() => ({
  mockAuditEventCreate: vi.fn(),
  mockTrack: vi.fn(),
}));

vi.mock('@lib/prisma', () => ({
  default: {
    auditEvent: {
      create: mockAuditEventCreate,
    },
  },
}));

vi.mock('@vercel/analytics/server', () => ({
  track: mockTrack,
}));

import { AuditEventType } from '@/generated/prisma/browser';
import { recordAuditEvent } from './auditEvents';

describe('recordAuditEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes the audit row and analytics event', async () => {
    await recordAuditEvent({
      actorUserId: 'user-1',
      eventType: AuditEventType.PlanCreated,
      analyticsEvent: 'plan_created',
      analyticsData: { target: 'self', weekCount: 4 },
      subjectType: 'plan',
      subjectId: 42,
      metadata: { targetUserId: 'user-1', workoutCount: 12 },
    });

    expect(mockAuditEventCreate).toHaveBeenCalledWith({
      data: {
        actorUserId: 'user-1',
        eventType: AuditEventType.PlanCreated,
        subjectType: 'plan',
        subjectId: '42',
        metadata: { targetUserId: 'user-1', workoutCount: 12 },
      },
    });
    expect(mockTrack).toHaveBeenCalledWith('plan_created', { target: 'self', weekCount: 4 });
  });

  it('swallows telemetry failures', async () => {
    mockAuditEventCreate.mockRejectedValueOnce(new Error('db down'));
    mockTrack.mockRejectedValueOnce(new Error('analytics down'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(recordAuditEvent({
      actorUserId: 'user-1',
      eventType: AuditEventType.PlanSaved,
      analyticsEvent: 'plan_saved',
    })).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledTimes(2);
    errorSpy.mockRestore();
  });
});
