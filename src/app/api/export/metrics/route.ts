import { NextResponse } from 'next/server';
import { authenticationErrorResponse, isAuthenticationError, requireSession } from '@lib/requireSession';
import { getUserDayMetrics } from '@lib/api';
import { parseDashboardSettings } from '@/types/settingsTypes';
import prisma from '@lib/prisma';
import { buildCsv } from '@/utils/csvExport';
import { errorResponse } from '@lib/apiResponses';

const STANDARD_HEADERS = [
  'date', 'weight_kg', 'steps', 'sleep_mins', 'calories', 'protein_g', 'carbs_g', 'fat_g',
  'calories_target', 'protein_target', 'carbs_target', 'fat_target', 'steps_target', 'sleep_mins_target',
];

export async function GET() {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    const [metrics, user] = await Promise.all([
      getUserDayMetrics(userId),
      prisma.user.findUnique({ where: { id: userId }, select: { settings: true } }),
    ]);

    if (!user) return errorResponse('User not found', 404);

    const settings = parseDashboardSettings(user.settings);
    const customDefs = settings.customMetrics;
    const headers = [...STANDARD_HEADERS, ...customDefs.map(d => d.name)];

    const rows = metrics.map(m => {
      const customRecord = m.customMetrics as Record<string, { value?: number }> | null;
      const customValues = customDefs.map(def => customRecord?.[def.id]?.value ?? '');
      return [
        m.date.toISOString().slice(0, 10),
        m.weight ?? '',
        m.steps ?? '',
        m.sleepMins ?? '',
        m.calories ?? '',
        m.protein ?? '',
        m.carbs ?? '',
        m.fat ?? '',
        m.caloriesTarget ?? '',
        m.proteinTarget ?? '',
        m.carbsTarget ?? '',
        m.fatTarget ?? '',
        m.stepsTarget ?? '',
        m.sleepMinsTarget ?? '',
        ...customValues,
      ];
    });

    const csv = buildCsv(headers, rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="forti-daily-metrics.csv"',
      },
    });
  } catch (error) {
    if (isAuthenticationError(error)) return authenticationErrorResponse();
    console.error(error);
    return errorResponse('Failed to export metrics', 500);
  }
}
