import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { notFoundResponse, forbiddenResponse, errorResponse } from '@lib/apiResponses';

/**
 * GET /api/coach/clients/[clientId]/supplements
 * Returns supplements for a coach's client (read-only view).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = await requireSession();
    const coachId = session.user.id;
    const { clientId } = await params;

    const coach = await prisma.user.findUnique({
      where: { id: coachId },
      select: { settings: true },
    });
    const settings = parseDashboardSettings(coach?.settings);
    if (!settings.coachModeActive) {
      return forbiddenResponse();
    }

    const client = await prisma.user.findUnique({
      where: { id: clientId },
      select: { coachId: true },
    });
    if (!client) return notFoundResponse('Client');
    if (client.coachId !== coachId) return forbiddenResponse();

    const supplements = await prisma.supplement.findMany({
      where: { userId: clientId },
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json(supplements);
  } catch (err: unknown) {
    if (err instanceof NextResponse) return err;
    console.error(err);
    return errorResponse('Failed to fetch client supplements', 500);
  }
}
