import type { Prisma } from '@/generated/prisma/browser';
import prisma from './prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { getActiveTemplateForWeek, getMacrosByDow } from './targetTemplates';
import type { TargetTemplateWithDays } from './targetTemplates';
import type { WeekTargets } from '@/types/checkInTypes';

const coachCheckInInclude = {
  user: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.WeeklyCheckInInclude;

export type CoachCheckInRecord = Prisma.WeeklyCheckInGetPayload<{
  include: typeof coachCheckInInclude;
}>;

export function mapCoachCheckIn<T extends {
  id: number;
  frontPhotoUrl: string | null;
  backPhotoUrl: string | null;
  sidePhotoUrl: string | null;
}>(checkIn: T): T {
  return {
    ...checkIn,
    frontPhotoUrl: checkIn.frontPhotoUrl ? `/api/check-in/photos/${checkIn.id}/front` : null,
    backPhotoUrl: checkIn.backPhotoUrl ? `/api/check-in/photos/${checkIn.id}/back` : null,
    sidePhotoUrl: checkIn.sidePhotoUrl ? `/api/check-in/photos/${checkIn.id}/side` : null,
  };
}

export async function getCoachCheckInAccess(coachId: string) {
  const coach = await prisma.user.findUnique({
    where: { id: coachId },
    select: {
      settings: true,
      clients: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const settings = parseDashboardSettings(coach?.settings);

  return {
    coachModeActive: settings.coachModeActive,
    clients: coach?.clients ?? [],
    clientIds: (coach?.clients ?? []).map(client => client.id),
  };
}

export async function getCoachCheckInById(coachId: string, checkInId: number) {
  const access = await getCoachCheckInAccess(coachId);

  if (!access.coachModeActive) {
    return { status: 'forbidden' as const };
  }

  const checkIn = await prisma.weeklyCheckIn.findUnique({
    where: { id: checkInId },
    include: coachCheckInInclude,
  });

  if (!checkIn || !access.clientIds.includes(checkIn.userId)) {
    return { status: 'not_found' as const };
  }

  const weekStart = new Date(checkIn.weekStartDate);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const windowEnd = checkIn.completedAt ?? weekEnd;
  const windowStart = new Date(windowEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [currentWeek, weekPrior, template, clientUser, weekWorkouts] = await Promise.all([
    prisma.metric.findMany({
      where: { userId: checkIn.userId, date: { gte: weekStart, lt: weekEnd } },
    }),
    prisma.metric.findMany({
      where: { userId: checkIn.userId, date: { gte: prevWeekStart, lt: weekStart } },
    }),
    getActiveTemplateForWeek(checkIn.userId, weekStart),
    prisma.user.findUnique({ where: { id: checkIn.userId }, select: { settings: true } }),
    prisma.workout.findMany({
      where: {
        week: { plan: { userId: checkIn.userId } },
        dateCompleted: { gte: windowStart, lt: windowEnd },
      },
      select: { id: true, name: true, dateCompleted: true, week: { select: { planId: true } } },
      orderBy: { dateCompleted: 'asc' },
    }),
  ]);

  function avgNullable(vals: (number | null)[]): number | null {
    const valid = vals.filter((v): v is number => v !== null);
    return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
  }

  const macrosByDow = getMacrosByDow(template);
  const weekTargets: WeekTargets | null = template ? {
    stepsTarget: template.stepsTarget,
    sleepMinsTarget: template.sleepMinsTarget,
    caloriesTarget: avgNullable([1,2,3,4,5,6,7].map(d => macrosByDow[d].caloriesTarget)),
    proteinTarget:  avgNullable([1,2,3,4,5,6,7].map(d => macrosByDow[d].proteinTarget)),
    carbsTarget:    avgNullable([1,2,3,4,5,6,7].map(d => macrosByDow[d].carbsTarget)),
    fatTarget:      avgNullable([1,2,3,4,5,6,7].map(d => macrosByDow[d].fatTarget)),
  } : null;

  const customMetricDefs = parseDashboardSettings(clientUser?.settings).customMetrics;

  return {
    status: 'ok' as const,
    checkIn: mapCoachCheckIn(checkIn),
    currentWeek,
    weekPrior,
    weekTargets,
    activeTemplate: template as TargetTemplateWithDays | null,
    customMetricDefs,
    weekWorkouts,
  };
}
