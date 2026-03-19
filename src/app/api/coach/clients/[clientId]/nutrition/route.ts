import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { notFoundResponse, forbiddenResponse, errorResponse } from '@lib/apiResponses';

/**
 * GET /api/coach/clients/[clientId]/nutrition
 * Returns day metrics and events for a coach's client.
 * Used by the Nutrition page when a coach selects a client.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = await requireSession();
    const coachId = session.user.id;
    const { clientId } = await params;

    // Verify coach mode is active
    const coach = await prisma.user.findUnique({
      where: { id: coachId },
      select: { settings: true },
    });
    const settings = parseDashboardSettings(coach?.settings);
    if (!settings.coachModeActive) {
      return forbiddenResponse();
    }

    // Verify the client belongs to this coach
    const client = await prisma.user.findUnique({
      where: { id: clientId },
      select: { coachId: true },
    });
    if (!client) return notFoundResponse('Client');
    if (client.coachId !== coachId) return forbiddenResponse();

    const [dayMetrics, events] = await Promise.all([
      prisma.dayMetric.findMany({
        where: { userId: clientId },
        orderBy: { date: 'asc' },
      }),
      prisma.event.findMany({
        where: { userId: clientId },
        orderBy: { startDate: 'asc' },
      }),
    ]);

    return NextResponse.json({ dayMetrics, events });
  } catch (err: unknown) {
    if (err instanceof NextResponse) return err;
    console.error(err);
    return errorResponse('Failed to fetch client nutrition data', 500);
  }
}
