import { createHash } from 'node:crypto';
import { SignJWT, jwtVerify, errors as joseErrors } from 'jose';

export const ACCESS_TTL_SECONDS = 60 * 15; // 15 minutes
export const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const ISSUER = 'forti';
const AUDIENCE = 'forti-mobile';
const ALG = 'HS256';

export type MobileTokenType = 'mobile-access' | 'mobile-refresh';

export type MobileAccessTokenPayload = {
  sub: string;
  tokenType: 'mobile-access';
};

export type MobileRefreshTokenPayload = {
  sub: string;
  tokenType: 'mobile-refresh';
  jti: string;
};

export type MobileTokenErrorCode = 'expired' | 'invalid' | 'wrong-type';

export class MobileTokenError extends Error {
  readonly code: MobileTokenErrorCode;

  constructor(code: MobileTokenErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'MobileTokenError';
    this.code = code;
  }
}

function getSigningKey(): Uint8Array {
  const secret = process.env.MOBILE_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('MOBILE_JWT_SECRET must be set and at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

export async function issueMobileAccessToken(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ACCESS_TTL_SECONDS;

  const token = await new SignJWT({ tokenType: 'mobile-access' satisfies MobileTokenType })
    .setProtectedHeader({ alg: ALG })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(getSigningKey());

  return { token, expiresAt: new Date(exp * 1000) };
}

export async function issueMobileRefreshToken(
  userId: string,
  sessionId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + REFRESH_TTL_SECONDS;

  const token = await new SignJWT({ tokenType: 'mobile-refresh' satisfies MobileTokenType })
    .setProtectedHeader({ alg: ALG })
    .setSubject(userId)
    .setJti(sessionId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(getSigningKey());

  return { token, expiresAt: new Date(exp * 1000) };
}

async function verifyToken(token: string): Promise<{
  sub: string;
  tokenType: MobileTokenType;
  jti?: string;
}> {
  let result;
  try {
    result = await jwtVerify(token, getSigningKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: [ALG],
    });
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired) {
      throw new MobileTokenError('expired', 'token expired');
    }
    throw new MobileTokenError('invalid', 'token invalid');
  }

  const { sub, tokenType, jti } = result.payload as {
    sub?: string;
    tokenType?: unknown;
    jti?: string;
  };

  if (!sub || (tokenType !== 'mobile-access' && tokenType !== 'mobile-refresh')) {
    throw new MobileTokenError('invalid', 'token payload malformed');
  }

  return { sub, tokenType, jti };
}

export async function verifyMobileAccessToken(token: string): Promise<MobileAccessTokenPayload> {
  const payload = await verifyToken(token);
  if (payload.tokenType !== 'mobile-access') {
    throw new MobileTokenError('wrong-type', 'expected mobile-access token');
  }
  return { sub: payload.sub, tokenType: 'mobile-access' };
}

export async function verifyMobileRefreshToken(token: string): Promise<MobileRefreshTokenPayload> {
  const payload = await verifyToken(token);
  if (payload.tokenType !== 'mobile-refresh') {
    throw new MobileTokenError('wrong-type', 'expected mobile-refresh token');
  }
  if (!payload.jti) {
    throw new MobileTokenError('invalid', 'refresh token missing jti');
  }
  return { sub: payload.sub, tokenType: 'mobile-refresh', jti: payload.jti };
}

export function hashRefreshToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
