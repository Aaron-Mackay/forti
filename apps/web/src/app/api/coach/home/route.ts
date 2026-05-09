import { NextResponse } from 'next/server';
import prisma from '@lib/prisma';
import { errorResponse } from '@lib/apiResponses';
import { requireSession } from '@lib/requireSession';
import { getCoachHomeData } from '@lib/coachService';
import { parseDashboardSettings } from '@/types/settingsTypes';

/**
 * GET /api/coach/home
 * Returns the Coach Home inbox read model for the authenticated coach.
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

  const data = await getCoachHomeData(userId);
  return NextResponse.json(data);
}
