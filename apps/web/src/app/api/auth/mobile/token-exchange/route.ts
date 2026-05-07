import { randomUUID } from 'node:crypto';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import prisma from '@lib/prisma';
import {
  errorResponse,
  rateLimitedResponse,
  unauthenticatedResponse,
  validationErrorResponse,
} from '@lib/apiResponses';
import {
  MobileAuthSuccessSchema,
  MobileTokenExchangeRequestSchema,
} from '@lib/contracts/mobileAuth';
import { issueMobileAccessToken, issueMobileRefreshToken, hashRefreshToken } from '@lib/mobileAuth';
import { consumeRateLimit } from '@lib/rateLimit';
import { recordSignInAuditEvent } from '@lib/recordSignInAuditEvent';

const TOKEN_EXCHANGE_IP_LIMIT = 5;
const TOKEN_EXCHANGE_IP_WINDOW_MS = 60 * 1000;
const TOKEN_EXCHANGE_EMAIL_LIMIT = 20;
const TOKEN_EXCHANGE_EMAIL_WINDOW_MS = 60 * 60 * 1000;

type VerifiedGoogleTokenPayload = TokenPayload & {
  email: string;
  sub: string;
};

let googleClient: OAuth2Client | null = null;

function getGoogleClient() {
  googleClient ??= new OAuth2Client();
  return googleClient;
}

function getGoogleMobileClientIds() {
  const raw = process.env.GOOGLE_MOBILE_CLIENT_IDS;
  if (!raw) {
    throw new Error('GOOGLE_MOBILE_CLIENT_IDS must be set');
  }

  const clientIds = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (clientIds.length === 0) {
    throw new Error('GOOGLE_MOBILE_CLIENT_IDS must contain at least one client ID');
  }

  return clientIds;
}

function getRequestIp(req: Request) {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleTokenPayload> {
  const audience = getGoogleMobileClientIds();

  try {
    const ticket = await getGoogleClient().verifyIdToken({
      idToken,
      audience,
    });
    const payload = ticket.getPayload();

    if (typeof payload?.email !== 'string' || typeof payload.sub !== 'string') {
      throw new Error('Google token missing required claims');
    }

    return payload as VerifiedGoogleTokenPayload;
  } catch {
    throw new Error('INVALID_GOOGLE_ID_TOKEN');
  }
}

export async function POST(req: Request) {
  const ipLimit = consumeRateLimit({
    namespace: 'mobile-token-exchange-ip',
    key: getRequestIp(req),
    limit: TOKEN_EXCHANGE_IP_LIMIT,
    windowMs: TOKEN_EXCHANGE_IP_WINDOW_MS,
  });

  if (!ipLimit.allowed) {
    return rateLimitedResponse('Rate limit exceeded for this IP address', ipLimit.retryAfterSeconds);
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const parsed = MobileTokenExchangeRequestSchema.safeParse(json);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  let googlePayload: VerifiedGoogleTokenPayload;
  try {
    googlePayload = await verifyGoogleIdToken(parsed.data.idToken);
  } catch (error) {
    if (error instanceof Error && error.message !== 'INVALID_GOOGLE_ID_TOKEN') {
      console.error('Mobile token exchange configuration error:', error);
      return errorResponse('Internal server error', 500);
    }

    return unauthenticatedResponse();
  }

  const user = await prisma.user.upsert({
    where: { email: googlePayload.email },
    update: {},
    create: {
      email: googlePayload.email,
      name: googlePayload.name?.trim() || googlePayload.email,
      image: googlePayload.picture ?? null,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const emailLimit = consumeRateLimit({
    namespace: 'mobile-token-exchange-email',
    key: user.email.toLowerCase(),
    limit: TOKEN_EXCHANGE_EMAIL_LIMIT,
    windowMs: TOKEN_EXCHANGE_EMAIL_WINDOW_MS,
  });

  if (!emailLimit.allowed) {
    return rateLimitedResponse('Rate limit exceeded for this email address', emailLimit.retryAfterSeconds);
  }

  try {
    const sessionId = randomUUID();
    const [{ token: accessToken, expiresAt: accessTokenExpiresAt }, { token: refreshToken, expiresAt: refreshTokenExpiresAt }] =
      await Promise.all([
        issueMobileAccessToken(user.id),
        issueMobileRefreshToken(user.id, sessionId),
      ]);

    await prisma.mobileSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: refreshTokenExpiresAt,
      },
    });

    await recordSignInAuditEvent({
      userId: user.id,
      provider: 'mobile-google',
    });

    const payload = MobileAuthSuccessSchema.parse({
      accessToken,
      refreshToken,
      accessTokenExpiresAt: accessTokenExpiresAt.toISOString(),
      refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
      user,
    });

    return Response.json(payload);
  } catch (error) {
    console.error('Mobile token exchange failed:', error);
    return errorResponse('Internal server error', 500);
  }
}
