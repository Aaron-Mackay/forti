import prisma from '@lib/prisma';
import { errorResponse, rateLimitedResponse, validationErrorResponse } from '@lib/apiResponses';
import { MobileSignOutRequestSchema } from '@forti/shared';
import { hashRefreshToken, verifyMobileRefreshToken } from '@lib/mobileAuth';
import { consumeRateLimit } from '@lib/rateLimit';

const SIGN_OUT_LIMIT = 10;
const SIGN_OUT_WINDOW_MS = 60 * 1000;

function getRequestIp(req: Request) {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

export async function POST(req: Request) {
  const limit = consumeRateLimit({
    namespace: 'mobile-sign-out-ip',
    key: getRequestIp(req),
    limit: SIGN_OUT_LIMIT,
    windowMs: SIGN_OUT_WINDOW_MS,
  });

  if (!limit.allowed) {
    return rateLimitedResponse('Rate limit exceeded for this IP address', limit.retryAfterSeconds);
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const parsed = MobileSignOutRequestSchema.safeParse(json);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  try {
    const payload = await verifyMobileRefreshToken(parsed.data.refreshToken, {
      ignoreExpiration: true,
    });

    await prisma.mobileSession.updateMany({
      where: {
        id: payload.jti,
        userId: payload.sub,
        tokenHash: hashRefreshToken(parsed.data.refreshToken),
      },
      data: {
        revokedAt: new Date(),
        lastUsedAt: new Date(),
      },
    });
  } catch {
    return new Response(null, { status: 204 });
  }

  return new Response(null, { status: 204 });
}
