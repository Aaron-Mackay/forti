import { NextRequest, NextResponse } from 'next/server';
import { authenticationErrorResponse, isAuthenticationError, requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { getCoachClientNutritionData } from '@lib/coachNutrition';
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

    const nutritionData = await getCoachClientNutritionData(coachId, clientId);
    if (!nutritionData) return notFoundResponse('Client');

    return NextResponse.json(nutritionData);
  } catch (err: unknown) {
    if (isAuthenticationError(err)) return authenticationErrorResponse();
    console.error(err);
    return errorResponse('Failed to fetch client nutrition data', 500);
  }
}
