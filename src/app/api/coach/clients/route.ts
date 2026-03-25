import { NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { errorResponse } from '@lib/apiResponses';

/**
 * GET /api/coach/clients
 * Returns the list of clients linked to the authenticated coach.
 */
export async function GET() {
  const session = await requireSession();
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      settings: true,
      clients: { select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } },
    },
  });

  const settings = parseDashboardSettings(user?.settings);
  if (!settings.coachModeActive) return errorResponse('Coach mode is not active', 403);

  return NextResponse.json({ clients: user?.clients ?? [] });
}
