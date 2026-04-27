import { NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { errorResponse } from '@lib/apiResponses';
import { getCoachClientHealthSummary } from '@lib/coachService';

/**
 * GET /api/coach/clients/health-summary
 * Returns health summary cards for each client linked to the authenticated coach.
 */
export async function GET() {
  const session = await requireSession();
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });

  const settings = parseDashboardSettings(user?.settings);
  if (!settings.coachModeActive) return errorResponse('Coach mode is not active', 403);

  const clients = await getCoachClientHealthSummary(userId);
  return NextResponse.json({ clients });
}
