import { NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { getWeekStart, toDateOnly } from '@lib/checkInUtils';

/**
 * GET /api/check-in/current
 * Returns (or creates) the pending check-in record for the current week,
 * along with the last 14 days of DayMetrics split into two weeks.
 */
export async function GET() {
  const session = await requireSession();
  const userId = session.user.id;

  const weekStart = toDateOnly(getWeekStart(new Date()));

  // Get or create the current week's check-in shell
  let checkIn = await prisma.weeklyCheckIn.findUnique({
    where: { userId_weekStartDate: { userId, weekStartDate: weekStart } },
  });

  if (!checkIn) {
    checkIn = await prisma.weeklyCheckIn.create({
      data: { userId, weekStartDate: weekStart },
    });
  }

  // Fetch last 14 days of DayMetrics for trend display
  const fourteenDaysAgo = new Date(weekStart);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const dayMetrics = await prisma.dayMetric.findMany({
    where: {
      userId,
      date: { gte: fourteenDaysAgo },
    },
    orderBy: { date: 'asc' },
  });

  // Split into two 7-day windows
  const weekPrior: typeof dayMetrics = [];
  const currentWeek: typeof dayMetrics = [];
  const weekBoundary = new Date(weekStart);
  weekBoundary.setDate(weekBoundary.getDate() - 7);

  for (const m of dayMetrics) {
    if (new Date(m.date) < weekStart) {
      weekPrior.push(m);
    } else {
      currentWeek.push(m);
    }
  }

  return NextResponse.json({ checkIn, currentWeek, weekPrior });
}
