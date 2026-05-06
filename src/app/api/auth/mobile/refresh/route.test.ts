// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { AuditEventType } from '@/generated/prisma/browser';

const {
  mockFindUnique,
  mockUpdate,
  mockCreate,
  mockUpdateMany,
  mockTransaction,
  mockRecordAuditEvent,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdateMany: vi.fn(),
  mockTransaction: vi.fn(),
  mockRecordAuditEvent: vi.fn(),
}));

vi.mock('@lib/prisma', () => ({
  default: {
    mobileSession: {
      findUnique: mockFindUnique,
      update: mockUpdate,
      create: mockCreate,
      updateMany: mockUpdateMany,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock('@lib/auditEvents', () => ({
  recordAuditEvent: mockRecordAuditEvent,
}));

import { POST } from './route';
import { resetRateLimitStoreForTests } from '@lib/rateLimit';
import {
  hashRefreshToken,
  issueMobileRefreshToken,
  verifyMobileAccessToken,
  verifyMobileRefreshToken,
} from '@lib/mobileAuth';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/mobile/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function makeCurrentSession(overrides: Partial<{
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedFromId: string | null;
  replacedBy: { id: string } | null;
}> = {}) {
  return {
    id: 'session-1',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    replacedFromId: null,
    replacedBy: null,
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'user@example.com',
    },
    ...overrides,
  };
}

describe('POST /api/auth/mobile/refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitStoreForTests();
    process.env.MOBILE_JWT_SECRET = 'a'.repeat(64);

    mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
      mobileSession: {
        findUnique: mockFindUnique,
        update: mockUpdate,
        create: mockCreate,
        updateMany: mockUpdateMany,
      },
    }));
    mockUpdate.mockResolvedValue(undefined);
    mockCreate.mockResolvedValue(undefined);
    mockUpdateMany.mockResolvedValue({ count: 0 });
    mockRecordAuditEvent.mockResolvedValue(undefined);
  });

  it('rotates refresh tokens and returns a new token pair', async () => {
    const { token: refreshToken } = await issueMobileRefreshToken('user-1', 'session-1');
    const tokenHash = hashRefreshToken(refreshToken);

    mockFindUnique.mockImplementation(async (args: { where: { tokenHash?: string } }) => {
      if (args.where.tokenHash === tokenHash) {
        return makeCurrentSession();
      }
      return null;
    });

    const res = await POST(makeRequest({ refreshToken }));

    expect(res.status).toBe(200);
    const body = await res.json();

    await expect(verifyMobileAccessToken(body.accessToken)).resolves.toMatchObject({
      sub: 'user-1',
      tokenType: 'mobile-access',
    });
    const nextRefreshPayload = await verifyMobileRefreshToken(body.refreshToken);
    expect(nextRefreshPayload.sub).toBe('user-1');
    expect(nextRefreshPayload.tokenType).toBe('mobile-refresh');
    expect(nextRefreshPayload.jti).not.toBe('session-1');

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: expect.objectContaining({
        revokedAt: expect.any(Date),
        lastUsedAt: expect.any(Date),
      }),
    });
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        replacedFromId: 'session-1',
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    });
  });

  it('revokes the entire chain and records an audit event when a rotated token is replayed', async () => {
    const { token: refreshToken } = await issueMobileRefreshToken('user-1', 'session-1');
    const tokenHash = hashRefreshToken(refreshToken);

    mockFindUnique.mockImplementation(async (args: { where: { tokenHash?: string; id?: string } }) => {
      if (args.where.tokenHash === tokenHash) {
        return makeCurrentSession({
          revokedAt: new Date('2026-05-06T12:00:00.000Z'),
          replacedBy: { id: 'session-2' },
        });
      }

      if (args.where.id === 'session-1') {
        return {
          id: 'session-1',
          replacedFromId: null,
          replacedBy: { id: 'session-2' },
        };
      }

      if (args.where.id === 'session-2') {
        return {
          id: 'session-2',
          replacedFromId: 'session-1',
          replacedBy: null,
        };
      }

      return null;
    });
    mockUpdateMany.mockResolvedValue({ count: 2 });

    const res = await POST(makeRequest({ refreshToken }));

    expect(res.status).toBe(401);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: expect.arrayContaining(['session-1', 'session-2']),
        },
      },
      data: expect.objectContaining({
        revokedAt: expect.any(Date),
        lastUsedAt: expect.any(Date),
      }),
    });
    expect(mockRecordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: 'user-1',
      eventType: AuditEventType.RefreshTokenReuseDetected,
      analyticsEvent: 'refresh_token_reuse_detected',
      subjectType: 'mobile-session',
      subjectId: 'session-1',
    }));
  });

  it('returns 401 for an expired refresh session', async () => {
    const { token: refreshToken } = await issueMobileRefreshToken('user-1', 'session-1');
    const tokenHash = hashRefreshToken(refreshToken);

    mockFindUnique.mockImplementation(async (args: { where: { tokenHash?: string } }) => {
      if (args.where.tokenHash === tokenHash) {
        return makeCurrentSession({
          expiresAt: new Date(Date.now() - 1_000),
        });
      }
      return null;
    });

    const res = await POST(makeRequest({ refreshToken }));

    expect(res.status).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 401 when the refresh-token row is missing', async () => {
    const { token: refreshToken } = await issueMobileRefreshToken('user-1', 'session-1');

    mockFindUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ refreshToken }));

    expect(res.status).toBe(401);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('allows exactly one concurrent refresh request to succeed', async () => {
    const { token: refreshToken } = await issueMobileRefreshToken('user-1', 'session-1');
    const tokenHash = hashRefreshToken(refreshToken);
    const barrierResolvers: Array<() => void> = [];
    let barrierCount = 0;
    const state = {
      currentSessionId: 'session-1',
      nextSessionId: null as string | null,
      revokedAt: null as Date | null,
    };

    mockFindUnique.mockImplementation(async (args: { where: { tokenHash?: string; id?: string } }) => {
      if (args.where.tokenHash === tokenHash) {
        barrierCount += 1;
        if (barrierCount < 2) {
          await new Promise<void>((resolve) => barrierResolvers.push(resolve));
        } else {
          while (barrierResolvers.length > 0) {
            barrierResolvers.shift()?.();
          }
        }

        return makeCurrentSession({
          id: state.currentSessionId,
          revokedAt: state.revokedAt,
          replacedBy: state.nextSessionId ? { id: state.nextSessionId } : null,
        });
      }

      if (args.where.id === 'session-1') {
        return {
          id: 'session-1',
          replacedFromId: null,
          replacedBy: state.nextSessionId ? { id: state.nextSessionId } : null,
        };
      }

      if (args.where.id === state.nextSessionId) {
        return {
          id: state.nextSessionId,
          replacedFromId: 'session-1',
          replacedBy: null,
        };
      }

      return null;
    });

    mockUpdate.mockImplementation(async (args: { data: { revokedAt: Date } }) => {
      state.revokedAt = args.data.revokedAt;
      return undefined;
    });

    mockCreate.mockImplementation(async (args: { data: { id: string; replacedFromId: string } }) => {
      if (state.nextSessionId) {
        throw { code: 'P2002' };
      }

      state.nextSessionId = args.data.id;
      return undefined;
    });
    mockUpdateMany.mockResolvedValue({ count: 2 });

    const [a, b] = await Promise.all([
      POST(makeRequest({ refreshToken })),
      POST(makeRequest({ refreshToken })),
    ]);

    const statuses = [a.status, b.status].sort((left, right) => left - right);
    expect(statuses).toEqual([200, 401]);
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockRecordAuditEvent).toHaveBeenCalledTimes(1);
  });
});
