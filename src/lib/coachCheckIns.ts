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
      select: { id: true, name: true, dateCompleted: true, weekId: true, week: { select: { planId: true } } },
      orderBy: { dateCompleted: 'desc' },
    }),
  ]);
  const targetWeekId = weekWorkouts[0]?.weekId ?? null;
  const plannedWorkouts = targetWeekId === null ? [] : await prisma.workout.findMany({
    where: { weekId: targetWeekId },
    select: {
      id: true,
      name: true,
      dateCompleted: true,
      week: { select: { order: true, planId: true } },
      exercises: {
        select: {
          sets: { select: { id: true, reps: true, isDropSet: true, parentSetId: true, order: true } },
          exercise: { select: { category: true, primaryMuscles: true } },
        },
      },
    },
    orderBy: [
      { week: { order: 'asc' } },
      { order: 'asc' },
    ],
  });
  const workoutSummaries = plannedWorkouts.map(workout => {
    const plannedSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
    const completedSets = workout.exercises.reduce(
      (sum, ex) => sum + ex.sets.filter(set => set.reps !== null && set.reps > 0).length,
      0,
    );
    const muscleDoneTotals = new Map<string, number>();
    for (const ex of workout.exercises) {
      if (ex.exercise.category !== 'resistance') continue;
      const regularSets = ex.sets.filter(set => !set.isDropSet);
      let doneContribution = 0;
      for (const regular of regularSets) {
        if (regular.reps !== null && regular.reps > 0) doneContribution += 1;
        const drops = ex.sets
          .filter(set => set.isDropSet && set.parentSetId === regular.id)
          .sort((a, b) => a.order - b.order);
        for (const drop of drops) {
          if (drop.reps !== null && drop.reps > 0) doneContribution += 0.5;
        }
      }
      if (doneContribution <= 0) continue;
      for (const muscle of ex.exercise.primaryMuscles) {
        muscleDoneTotals.set(muscle, (muscleDoneTotals.get(muscle) ?? 0) + doneContribution);
      }
    }
    return {
      workoutId: workout.id,
      workoutName: workout.name,
      completedSets,
      plannedSets,
      muscleDoneSets: Array.from(muscleDoneTotals.entries()).map(([muscle, doneSets]) => ({
        muscle,
        doneSets,
      })),
    };
  });
  const lastCompletedWorkout = plannedWorkouts
    .filter(w => w.dateCompleted !== null && w.dateCompleted >= weekStart && w.dateCompleted < weekEnd)
    .sort((a, b) => (b.dateCompleted?.getTime() ?? 0) - (a.dateCompleted?.getTime() ?? 0))[0];
  const activePlanId = lastCompletedWorkout?.week.planId ?? null;

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
    workoutSummaries,
    activePlanId,
  };
}
