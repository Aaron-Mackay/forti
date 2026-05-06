// @vitest-environment node
import { describe, expect, it, beforeEach, beforeAll } from 'vitest';
import { SignJWT } from 'jose';
import {
  ACCESS_TTL_SECONDS,
  REFRESH_TTL_SECONDS,
  MobileTokenError,
  hashRefreshToken,
  issueMobileAccessToken,
  issueMobileRefreshToken,
  verifyMobileAccessToken,
  verifyMobileRefreshToken,
} from './mobileAuth';

const TEST_SECRET = 'a'.repeat(64);

beforeAll(() => {
  process.env.MOBILE_JWT_SECRET = TEST_SECRET;
});

function key() {
  return new TextEncoder().encode(TEST_SECRET);
}

describe('mobileAuth round-trip', () => {
  it('issues and verifies an access token', async () => {
    const { token, expiresAt } = await issueMobileAccessToken('user-1');
    const payload = await verifyMobileAccessToken(token);

    expect(payload.sub).toBe('user-1');
    expect(payload.tokenType).toBe('mobile-access');
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + ACCESS_TTL_SECONDS * 1000 + 1000);
  });

  it('issues and verifies a refresh token with jti', async () => {
    const { token, expiresAt } = await issueMobileRefreshToken('user-2', 'session-abc');
    const payload = await verifyMobileRefreshToken(token);

    expect(payload.sub).toBe('user-2');
    expect(payload.tokenType).toBe('mobile-refresh');
    expect(payload.jti).toBe('session-abc');
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + (REFRESH_TTL_SECONDS - 60) * 1000);
  });
});

describe('mobileAuth rejection cases', () => {
  it('rejects an expired access token', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = await new SignJWT({ tokenType: 'mobile-access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-x')
      .setIssuer('forti')
      .setAudience('forti-mobile')
      .setIssuedAt(now - 1000)
      .setExpirationTime(now - 10)
      .sign(key());

    await expect(verifyMobileAccessToken(expired)).rejects.toMatchObject({
      name: 'MobileTokenError',
      code: 'expired',
    });
  });

  it('rejects an access token used as a refresh token (wrong-type)', async () => {
    const { token } = await issueMobileAccessToken('user-3');
    await expect(verifyMobileRefreshToken(token)).rejects.toMatchObject({
      name: 'MobileTokenError',
      code: 'wrong-type',
    });
  });

  it('rejects a refresh token used as an access token (wrong-type)', async () => {
    const { token } = await issueMobileRefreshToken('user-4', 'sess-1');
    await expect(verifyMobileAccessToken(token)).rejects.toMatchObject({
      name: 'MobileTokenError',
      code: 'wrong-type',
    });
  });

  it('rejects a token with the wrong issuer', async () => {
    const now = Math.floor(Date.now() / 1000);
    const bad = await new SignJWT({ tokenType: 'mobile-access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-x')
      .setIssuer('not-forti')
      .setAudience('forti-mobile')
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(key());

    await expect(verifyMobileAccessToken(bad)).rejects.toMatchObject({ code: 'invalid' });
  });

  it('rejects a token with the wrong audience', async () => {
    const now = Math.floor(Date.now() / 1000);
    const bad = await new SignJWT({ tokenType: 'mobile-access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-x')
      .setIssuer('forti')
      .setAudience('not-forti-mobile')
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(key());

    await expect(verifyMobileAccessToken(bad)).rejects.toMatchObject({ code: 'invalid' });
  });

  it('rejects a token signed with a different secret', async () => {
    const now = Math.floor(Date.now() / 1000);
    const otherKey = new TextEncoder().encode('b'.repeat(64));
    const bad = await new SignJWT({ tokenType: 'mobile-access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-x')
      .setIssuer('forti')
      .setAudience('forti-mobile')
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(otherKey);

    await expect(verifyMobileAccessToken(bad)).rejects.toMatchObject({ code: 'invalid' });
  });

  it('rejects a tampered token', async () => {
    const { token } = await issueMobileAccessToken('user-5');
    const parts = token.split('.');
    parts[2] = parts[2].replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'));
    const tampered = parts.join('.');

    await expect(verifyMobileAccessToken(tampered)).rejects.toBeInstanceOf(MobileTokenError);
  });

  it('rejects a refresh token without jti', async () => {
    const now = Math.floor(Date.now() / 1000);
    const bad = await new SignJWT({ tokenType: 'mobile-refresh' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-x')
      .setIssuer('forti')
      .setAudience('forti-mobile')
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(key());

    await expect(verifyMobileRefreshToken(bad)).rejects.toMatchObject({ code: 'invalid' });
  });
});

describe('hashRefreshToken', () => {
  beforeEach(() => {
    process.env.MOBILE_JWT_SECRET = TEST_SECRET;
  });

  it('produces a stable, hex-encoded SHA-256 digest', () => {
    const raw = 'some.refresh.token';
    const a = hashRefreshToken(raw);
    const b = hashRefreshToken(raw);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces distinct digests for distinct inputs', () => {
    expect(hashRefreshToken('a')).not.toBe(hashRefreshToken('b'));
  });
});

describe('mobileAuth secret guard', () => {
  it('throws if MOBILE_JWT_SECRET is missing', async () => {
    const original = process.env.MOBILE_JWT_SECRET;
    delete process.env.MOBILE_JWT_SECRET;
    try {
      await expect(issueMobileAccessToken('u')).rejects.toThrow(/MOBILE_JWT_SECRET/);
    } finally {
      process.env.MOBILE_JWT_SECRET = original;
    }
  });

  it('throws if MOBILE_JWT_SECRET is too short', async () => {
    const original = process.env.MOBILE_JWT_SECRET;
    process.env.MOBILE_JWT_SECRET = 'short';
    try {
      await expect(issueMobileAccessToken('u')).rejects.toThrow(/MOBILE_JWT_SECRET/);
    } finally {
      process.env.MOBILE_JWT_SECRET = original;
    }
  });
});
