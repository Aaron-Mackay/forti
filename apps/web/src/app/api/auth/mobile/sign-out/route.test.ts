// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockUpdateMany } = vi.hoisted(() => ({
  mockUpdateMany: vi.fn(),
}));

vi.mock('@lib/prisma', () => ({
  default: {
    mobileSession: {
      updateMany: mockUpdateMany,
    },
  },
}));

import { POST } from './route';
import { resetRateLimitStoreForTests } from '@lib/rateLimit';
import { issueMobileRefreshToken } from '@lib/mobileAuth';

function makeRequest(body: unknown, headers?: HeadersInit) {
  return new NextRequest('http://localhost/api/auth/mobile/sign-out', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/mobile/sign-out', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitStoreForTests();
    process.env.MOBILE_JWT_SECRET = 'a'.repeat(64);
    mockUpdateMany.mockResolvedValue({ count: 1 });
  });

  it('revokes the session row for a valid refresh token', async () => {
    const { token: refreshToken } = await issueMobileRefreshToken('user-1', 'session-1');

    const res = await POST(makeRequest(
      { refreshToken },
      { 'x-forwarded-for': '203.0.113.10' },
    ));

    expect(res.status).toBe(204);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 'session-1',
        userId: 'user-1',
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
      data: expect.objectContaining({
        revokedAt: expect.any(Date),
        lastUsedAt: expect.any(Date),
      }),
    });
  });

  it('remains idempotent for an already-revoked token', async () => {
    const { token: refreshToken } = await issueMobileRefreshToken('user-1', 'session-1');
    mockUpdateMany.mockResolvedValue({ count: 0 });

    const res = await POST(makeRequest({ refreshToken }));

    expect(res.status).toBe(204);
    expect(mockUpdateMany).toHaveBeenCalledTimes(1);
  });

  it('still accepts an expired refresh token so sign-out can complete', async () => {
    const now = Math.floor(Date.now() / 1000);
    const { SignJWT } = await import('jose');
    const refreshToken = await new SignJWT({ tokenType: 'mobile-refresh' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-1')
      .setJti('session-expired')
      .setIssuer('forti')
      .setAudience('forti-mobile')
      .setIssuedAt(now - 1000)
      .setExpirationTime(now - 10)
      .sign(new TextEncoder().encode(process.env.MOBILE_JWT_SECRET!));

    const res = await POST(makeRequest({ refreshToken }));

    expect(res.status).toBe(204);
    expect(mockUpdateMany).toHaveBeenCalledTimes(1);
  });

  it('returns 204 for an invalid refresh token without touching the database', async () => {
    const res = await POST(makeRequest({ refreshToken: 'not-a-jwt' }));

    expect(res.status).toBe(204);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('rate limits repeated sign-out attempts from the same IP', async () => {
    const headers = { 'x-forwarded-for': '203.0.113.99' };

    for (let i = 0; i < 10; i += 1) {
      const { token: refreshToken } = await issueMobileRefreshToken('user-1', `session-${i}`);
      const res = await POST(makeRequest({ refreshToken }, headers));
      expect(res.status).toBe(204);
    }

    const { token: refreshToken } = await issueMobileRefreshToken('user-1', 'session-11');
    const limited = await POST(makeRequest({ refreshToken }, headers));

    expect(limited.status).toBe(429);
  });
});
