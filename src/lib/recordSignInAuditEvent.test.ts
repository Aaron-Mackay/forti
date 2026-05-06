import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockRecordAuditEvent } = vi.hoisted(() => ({
  mockRecordAuditEvent: vi.fn(),
}));

vi.mock('@lib/auditEvents', () => ({
  recordAuditEvent: mockRecordAuditEvent,
}));

import { recordSignInAuditEvent } from './recordSignInAuditEvent';

describe('recordSignInAuditEvent', () => {
  beforeEach(() => {
    mockRecordAuditEvent.mockReset();
  });

  it('records a Google web sign-in', async () => {
    await recordSignInAuditEvent({ userId: 'u1', provider: 'google' });

    expect(mockRecordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: 'u1',
      analyticsEvent: 'login_succeeded_google',
      analyticsData: expect.objectContaining({ provider: 'google', isCoach: false }),
      subjectType: 'user',
      subjectId: 'u1',
      metadata: expect.objectContaining({ provider: 'google' }),
    }));
  });

  it('records a mobile Google sign-in as a Google login', async () => {
    await recordSignInAuditEvent({ userId: 'u2', provider: 'mobile-google' });

    expect(mockRecordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: 'u2',
      analyticsEvent: 'login_succeeded_google',
      analyticsData: expect.objectContaining({ provider: 'mobile-google', isCoach: false }),
      metadata: expect.objectContaining({ provider: 'mobile-google' }),
    }));
  });

  it('records a demo-coach sign-in with isCoach=true', async () => {
    await recordSignInAuditEvent({ userId: 'c1', provider: 'demo-coach' });

    expect(mockRecordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      analyticsEvent: 'login_succeeded_demo',
      analyticsData: expect.objectContaining({ provider: 'demo', isCoach: true }),
      metadata: expect.objectContaining({ provider: 'demo-coach', isCoach: true }),
    }));
  });
});
