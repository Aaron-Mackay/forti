import { randomUUID } from 'node:crypto';
import { Prisma, AuditEventType } from '@/generated/prisma/browser';
import prisma from '@lib/prisma';
import {
  errorResponse,
  rateLimitedResponse,
  unauthenticatedResponse,
  validationErrorResponse,
} from '@lib/apiResponses';
import { recordAuditEvent } from '@lib/auditEvents';
import {
  MobileAuthSuccessSchema,
  MobileRefreshRequestSchema,
} from '@forti/shared';
import {
  MobileTokenError,
  hashRefreshToken,
  issueMobileAccessToken,
  issueMobileRefreshToken,
  verifyMobileRefreshToken,
} from '@lib/mobileAuth';
import { consumeRateLimit } from '@lib/rateLimit';

const REFRESH_LIMIT = 30;
const REFRESH_WINDOW_MS = 60 * 1000;

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;
type SessionChainParent = { id: string; replacedFromId: string | null } | null;
type SessionChainChild = { id: string; replacedBy: { id: string } | null } | null;

class InvalidRefreshTokenError extends Error {
  constructor() {
    super('Invalid refresh token');
    this.name = 'InvalidRefreshTokenError';
  }
}

class RefreshTokenReuseDetectedError extends Error {
  readonly userId: string;
  readonly sessionId: string;

  constructor(userId: string, sessionId: string) {
    super('Refresh token reuse detected');
    this.name = 'RefreshTokenReuseDetectedError';
    this.userId = userId;
    this.sessionId = sessionId;
  }
}

function isUniqueConstraintError(error: unknown): error is { code: string } {
  return (
    typeof error === 'object'
    && error !== null
    && 'code' in error
    && typeof error.code === 'string'
  );
}

async function collectSessionChainIds(tx: TxClient, startId: string) {
  const ids = new Set<string>();

  let cursor: string | null = startId;
  while (cursor && !ids.has(cursor)) {
    const session: SessionChainParent = await tx.mobileSession.findUnique({
      where: { id: cursor },
      select: {
        id: true,
        replacedFromId: true,
      },
    });
    if (!session) break;
    ids.add(session.id);
    cursor = session.replacedFromId;
  }

  cursor = startId;
  while (cursor) {
    const session: SessionChainChild = await tx.mobileSession.findUnique({
      where: { id: cursor },
      select: {
        id: true,
        replacedBy: {
          select: {
            id: true,
          },
        },
      },
    });
    if (!session) break;
    ids.add(session.id);
    const nextId: string | null = session.replacedBy?.id ?? null;
    if (!nextId || ids.has(nextId)) break;
    cursor = nextId;
  }

  return [...ids];
}

async function revokeSessionChain(tx: TxClient, sessionId: string, now: Date) {
  const ids = await collectSessionChainIds(tx, sessionId);
  if (ids.length === 0) return [];

  await tx.mobileSession.updateMany({
    where: {
      id: {
        in: ids,
      },
    },
    data: {
      revokedAt: now,
      lastUsedAt: now,
    },
  });

  return ids;
}

async function recordRefreshTokenReuseDetected(userId: string, sessionId: string) {
  await recordAuditEvent({
    actorUserId: userId,
    eventType: AuditEventType.RefreshTokenReuseDetected,
    analyticsEvent: 'refresh_token_reuse_detected',
    analyticsData: {
      sessionId,
    },
    subjectType: 'mobile-session',
    subjectId: sessionId,
    metadata: {
      sessionId,
    },
  });
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const parsed = MobileRefreshRequestSchema.safeParse(json);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const tokenHash = hashRefreshToken(parsed.data.refreshToken);
  const limit = consumeRateLimit({
    namespace: 'mobile-refresh-token',
    key: tokenHash,
    limit: REFRESH_LIMIT,
    windowMs: REFRESH_WINDOW_MS,
  });

  if (!limit.allowed) {
    return rateLimitedResponse('Rate limit exceeded for this refresh token', limit.retryAfterSeconds);
  }

  let refreshPayload;
  try {
    refreshPayload = await verifyMobileRefreshToken(parsed.data.refreshToken);
  } catch (error) {
    if (error instanceof MobileTokenError) {
      return unauthenticatedResponse();
    }
    console.error('Mobile refresh verification failed:', error);
    return errorResponse('Internal server error', 500);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const currentSession = await tx.mobileSession.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          userId: true,
          expiresAt: true,
          revokedAt: true,
          replacedFromId: true,
          replacedBy: {
            select: {
              id: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (
        !currentSession
        || currentSession.id !== refreshPayload.jti
        || currentSession.userId !== refreshPayload.sub
      ) {
        throw new InvalidRefreshTokenError();
      }

      const now = new Date();
      if (currentSession.revokedAt || currentSession.replacedBy) {
        await revokeSessionChain(tx, currentSession.id, now);
        throw new RefreshTokenReuseDetectedError(currentSession.userId, currentSession.id);
      }

      if (currentSession.expiresAt < now) {
        throw new InvalidRefreshTokenError();
      }

      const nextSessionId = randomUUID();
      const [
        { token: accessToken, expiresAt: accessTokenExpiresAt },
        { token: refreshToken, expiresAt: refreshTokenExpiresAt },
      ] = await Promise.all([
        issueMobileAccessToken(currentSession.userId),
        issueMobileRefreshToken(currentSession.userId, nextSessionId),
      ]);

      await tx.mobileSession.update({
        where: { id: currentSession.id },
        data: {
          revokedAt: now,
          lastUsedAt: now,
        },
      });

      await tx.mobileSession.create({
        data: {
          id: nextSessionId,
          userId: currentSession.userId,
          tokenHash: hashRefreshToken(refreshToken),
          expiresAt: refreshTokenExpiresAt,
          lastUsedAt: now,
          replacedFromId: currentSession.id,
        },
      });

      return MobileAuthSuccessSchema.parse({
        accessToken,
        refreshToken,
        accessTokenExpiresAt: accessTokenExpiresAt.toISOString(),
        refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
        user: currentSession.user,
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof InvalidRefreshTokenError) {
      return unauthenticatedResponse();
    }

    if (error instanceof RefreshTokenReuseDetectedError) {
      await recordRefreshTokenReuseDetected(error.userId, error.sessionId);
      return unauthenticatedResponse();
    }

    if (isUniqueConstraintError(error) && error.code === 'P2002') {
      try {
        await prisma.$transaction(async (tx) => {
          await revokeSessionChain(tx, refreshPayload.jti, new Date());
        });
      } catch (revokeError) {
        console.error('Failed to revoke refresh-token chain after concurrent rotation:', revokeError);
      }

      await recordRefreshTokenReuseDetected(refreshPayload.sub, refreshPayload.jti);
      return unauthenticatedResponse();
    }

    console.error('Mobile refresh failed:', error);
    return errorResponse('Internal server error', 500);
  }
}
