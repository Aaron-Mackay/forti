import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';

/**
 * GET /api/coach/check-ins
 * Returns check-ins from the coach's confirmed clients.
 * Query params:
 *   clientId  — filter to a specific client
 *   from      — ISO date string, inclusive lower bound on weekStartDate
 *   to        — ISO date string, inclusive upper bound on weekStartDate
 *   unread    — "true" to return only unreviewed (coachReviewedAt is null)
 *   limit     — default 20, max 100
 *   offset    — default 0
 */
export async function GET(req: NextRequest) {
  const session = await requireSession();
  const userId = session.user.id;

  // Verify coach mode is active
  const coach = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true, clients: { select: { id: true, name: true, email: true } } },
  });

  const settings = parseDashboardSettings(coach?.settings);
  if (!settings.coachModeActive) {
    return NextResponse.json({ error: 'Coach mode is not active' }, { status: 403 });
  }

  const clientIds = (coach?.clients ?? []).map(c => c.id);
  if (clientIds.length === 0) {
    return NextResponse.json({ checkIns: [], total: 0, clients: [] });
  }

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const unread = searchParams.get('unread') === 'true';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0');

  const whereUserId = clientId && clientIds.includes(clientId) ? clientId : undefined;

  const [checkIns, total] = await Promise.all([
    prisma.weeklyCheckIn.findMany({
      where: {
        userId: whereUserId ?? { in: clientIds },
        completedAt: { not: null },
        ...(from || to ? {
          weekStartDate: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        } : {}),
        ...(unread ? { coachReviewedAt: null } : {}),
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.weeklyCheckIn.count({
      where: {
        userId: whereUserId ?? { in: clientIds },
        completedAt: { not: null },
        ...(from || to ? {
          weekStartDate: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        } : {}),
        ...(unread ? { coachReviewedAt: null } : {}),
      },
    }),
  ]);

  return NextResponse.json({
    checkIns,
    total,
    clients: coach?.clients ?? [],
  });
}
