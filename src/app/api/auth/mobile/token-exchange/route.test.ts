// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockVerifyIdToken,
  mockUserUpsert,
  mockMobileSessionCreate,
  mockRecordSignInAuditEvent,
} = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
  mockUserUpsert: vi.fn(),
  mockMobileSessionCreate: vi.fn(),
  mockRecordSignInAuditEvent: vi.fn(),
}));

vi.mock('google-auth-library', () => ({
  OAuth2Client: class OAuth2Client {
    verifyIdToken = mockVerifyIdToken;
  },
}));

vi.mock('@lib/prisma', () => ({
  default: {
    user: {
      upsert: mockUserUpsert,
    },
    mobileSession: {
      create: mockMobileSessionCreate,
    },
  },
}));

vi.mock('@lib/recordSignInAuditEvent', () => ({
  recordSignInAuditEvent: mockRecordSignInAuditEvent,
}));

import { POST } from './route';
import { resetRateLimitStoreForTests } from '@lib/rateLimit';
import { verifyMobileAccessToken, verifyMobileRefreshToken } from '@lib/mobileAuth';

function makeRequest(body: unknown, headers?: HeadersInit) {
  return new NextRequest('http://localhost/api/auth/mobile/token-exchange', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/mobile/token-exchange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitStoreForTests();
    process.env.MOBILE_JWT_SECRET = 'a'.repeat(64);
    process.env.GOOGLE_MOBILE_CLIENT_IDS = 'ios-client-id,android-client-id';

    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-user-1',
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.png',
      }),
    });
    mockUserUpsert.mockResolvedValue({
      id: 'user-1',
      name: 'Test User',
      email: 'user@example.com',
    });
    mockMobileSessionCreate.mockResolvedValue({
      id: 'session-1',
    });
    mockRecordSignInAuditEvent.mockResolvedValue(undefined);
  });

  it('returns tokens, creates a mobile session row, and records audit telemetry', async () => {
    const res = await POST(makeRequest(
      { idToken: 'valid-google-id-token' },
      { 'x-forwarded-for': '203.0.113.10' },
    ));

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.user).toEqual({
      id: 'user-1',
      name: 'Test User',
      email: 'user@example.com',
    });
    await expect(verifyMobileAccessToken(body.accessToken)).resolves.toMatchObject({
      sub: 'user-1',
      tokenType: 'mobile-access',
    });
    await expect(verifyMobileRefreshToken(body.refreshToken)).resolves.toMatchObject({
      sub: 'user-1',
      tokenType: 'mobile-refresh',
    });

    expect(mockVerifyIdToken).toHaveBeenCalledWith({
      idToken: 'valid-google-id-token',
      audience: ['ios-client-id', 'android-client-id'],
    });
    expect(mockUserUpsert).toHaveBeenCalledWith({
      where: { email: 'user@example.com' },
      update: {},
      create: {
        email: 'user@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.png',
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
    expect(mockMobileSessionCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'user-1',
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    }));
    expect(mockRecordSignInAuditEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      provider: 'mobile-google',
    });
  });

  it('returns 400 for an invalid request body', async () => {
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
    expect(mockUserUpsert).not.toHaveBeenCalled();
  });

  it('returns 401 when Google rejects the ID token', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('bad token'));

    const res = await POST(makeRequest({ idToken: 'invalid-token' }));

    expect(res.status).toBe(401);
    expect(mockUserUpsert).not.toHaveBeenCalled();
    expect(mockMobileSessionCreate).not.toHaveBeenCalled();
  });

  it('returns 401 when the Google token payload is missing the email claim', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-user-1',
        name: 'Test User',
      }),
    });

    const res = await POST(makeRequest({ idToken: 'missing-email-token' }));

    expect(res.status).toBe(401);
    expect(mockUserUpsert).not.toHaveBeenCalled();
  });

  it('returns 429 when the per-IP rate limit is exceeded', async () => {
    const headers = { 'x-forwarded-for': '203.0.113.20' };

    for (let i = 0; i < 5; i += 1) {
      const res = await POST(makeRequest({ idToken: `valid-${i}` }, headers));
      expect(res.status).toBe(200);
    }

    const limited = await POST(makeRequest({ idToken: 'one-too-many' }, headers));
    const body = await limited.json();

    expect(limited.status).toBe(429);
    expect(body.code).toBe('RATE_LIMITED');
    expect(mockVerifyIdToken).toHaveBeenCalledTimes(5);
  });

  it('returns 429 when the per-email rate limit is exceeded', async () => {
    for (let i = 0; i < 20; i += 1) {
      const res = await POST(makeRequest(
        { idToken: `valid-${i}` },
        { 'x-forwarded-for': `203.0.113.${i}` },
      ));
      expect(res.status).toBe(200);
    }

    const limited = await POST(makeRequest(
      { idToken: 'one-too-many' },
      { 'x-forwarded-for': '203.0.113.250' },
    ));
    const body = await limited.json();

    expect(limited.status).toBe(429);
    expect(body.code).toBe('RATE_LIMITED');
    expect(mockVerifyIdToken).toHaveBeenCalledTimes(21);
    expect(mockUserUpsert).toHaveBeenCalledTimes(21);
    expect(mockMobileSessionCreate).toHaveBeenCalledTimes(20);
  });

  it('returns 500 when the mobile session write fails', async () => {
    mockMobileSessionCreate.mockRejectedValue(new Error('db down'));

    const res = await POST(makeRequest({ idToken: 'valid-google-id-token' }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.code).toBe('INTERNAL');
    expect(mockRecordSignInAuditEvent).not.toHaveBeenCalled();
  });
});
