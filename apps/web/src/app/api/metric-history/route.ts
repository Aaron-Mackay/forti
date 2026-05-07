import { NextRequest, NextResponse } from 'next/server';
import { requireSession, isAuthenticationError, authenticationErrorResponse } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { errorResponse, forbiddenResponse, validationErrorResponse } from '@lib/apiResponses';
import { MetricHistoryQuerySchema } from '@lib/contracts/metricHistory';
import type { BuiltInMetricKey } from '@/types/metricTypes';

const MAX_RANGE_DAYS = 730;

export async function GET(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    if (isAuthenticationError(err)) return authenticationErrorResponse();
    throw err;
  }

  const { searchParams } = new URL(req.url);
  const parsed = MetricHistoryQuerySchema.safeParse({
    metric:   searchParams.get('metric'),
    startDate: searchParams.get('startDate'),
    endDate:   searchParams.get('endDate'),
    clientId:  searchParams.get('clientId') ?? undefined,
  });
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const { metric, startDate, endDate, clientId } = parsed.data;

  if (startDate >= endDate) {
    return errorResponse('startDate must be before endDate', 400);
  }

  const start = new Date(startDate);
  const end   = new Date(endDate);
  if ((end.getTime() - start.getTime()) / 86_400_000 > MAX_RANGE_DAYS) {
    return errorResponse(`Date range may not exceed ${MAX_RANGE_DAYS} days`, 400);
  }

  let targetUserId: string;

  if (clientId) {
    // Coach path: verify the authenticated user is this client's coach
    const client = await prisma.user.findUnique({
      where: { id: clientId },
      select: { coachId: true },
    });
    if (!client || client.coachId !== session.user.id) {
      return forbiddenResponse();
    }
    targetUserId = clientId;
  } else {
    targetUserId = session.user.id;
  }

  const rows = await prisma.metric.findMany({
    where: {
      userId: targetUserId,
      date: { gte: start, lte: end },
    },
    orderBy: { date: 'asc' },
    select: { date: true, [metric]: true },
  });

  const points = rows.map(r => ({
    date:  (r.date as Date).toISOString().slice(0, 10),
    value: (r[metric as BuiltInMetricKey] ?? null) as number | null,
  }));

  return NextResponse.json({ points });
}
