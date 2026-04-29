import { NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { getCheckInWeekStart, toDateOnly } from '@lib/checkInUtils';
import { getActiveTemplateForWeek, getMacrosByDow } from '@lib/targetTemplates';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { getTemplateForClient } from '@lib/checkInTemplate';
import { CurrentCheckInResponseSchema } from '@lib/contracts/checkIn';

/**
 * GET /api/check-in/current
 * Returns (or creates) the pending check-in record for the current week,
 * along with the last 14 days of DayMetrics split into two weeks.
 */
export async function GET() {
  const session = await requireSession();
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });
  const { checkInDay } = parseDashboardSettings(user?.settings);
  const weekStart = toDateOnly(getCheckInWeekStart(new Date(), checkInDay));

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

  const dayMetrics = await prisma.metric.findMany({
    where: {
      userId,
      date: { gte: fourteenDaysAgo },
    },
    orderBy: { date: 'asc' },
  });

  // Split into two 7-day windows
  const weekPrior: typeof dayMetrics = [];
  const currentWeek: typeof dayMetrics = [];

  for (const m of dayMetrics) {
    if (new Date(m.date) < weekStart) {
      weekPrior.push(m);
    } else {
      currentWeek.push(m);
    }
  }

  // Fetch previous week's photos for ghost overlay in camera capture
  const prevCheckIn = await prisma.weeklyCheckIn.findFirst({
    where: { userId, weekStartDate: { lt: weekStart } },
    orderBy: { weekStartDate: 'desc' },
    select: { id: true, frontPhotoUrl: true, backPhotoUrl: true, sidePhotoUrl: true },
  });

  const previousPhotos = prevCheckIn
    ? {
        frontPhotoUrl: prevCheckIn.frontPhotoUrl ? `/api/check-in/photos/${prevCheckIn.id}/front` : null,
        backPhotoUrl: prevCheckIn.backPhotoUrl ? `/api/check-in/photos/${prevCheckIn.id}/back` : null,
        sidePhotoUrl: prevCheckIn.sidePhotoUrl ? `/api/check-in/photos/${prevCheckIn.id}/side` : null,
      }
    : null;

  // Return proxy URLs for current check-in photos (raw blob URLs must not be exposed to clients)
  const mappedCheckIn = {
    ...checkIn,
    frontPhotoUrl: checkIn.frontPhotoUrl ? `/api/check-in/photos/${checkIn.id}/front` : null,
    backPhotoUrl: checkIn.backPhotoUrl ? `/api/check-in/photos/${checkIn.id}/back` : null,
    sidePhotoUrl: checkIn.sidePhotoUrl ? `/api/check-in/photos/${checkIn.id}/side` : null,
  };

  // Count workouts completed during the current week, and total planned in those weeks
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const [weeksWithCompleted, lastCompletedWorkout, coachTemplate] = await Promise.all([
    prisma.week.findMany({
      where: {
        plan: { userId },
        workouts: { some: { dateCompleted: { gte: weekStart, lt: weekEnd } } },
      },
      select: { id: true },
    }),
    prisma.workout.findFirst({
      where: {
        week: { plan: { userId } },
        dateCompleted: { gte: weekStart, lt: weekEnd },
      },
      orderBy: { dateCompleted: 'desc' },
      select: { week: { select: { planId: true } } },
    }),
    getTemplateForClient(userId),
  ]);
  const weekIds = weeksWithCompleted.map(w => w.id);
  const plannedWorkouts = weekIds.length === 0 ? [] : await prisma.workout.findMany({
    where: { weekId: { in: weekIds } },
    select: {
      id: true,
      name: true,
      dateCompleted: true,
      week: { select: { order: true } },
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
  const completedWorkoutsCount = plannedWorkouts.filter(w =>
    w.dateCompleted !== null && w.dateCompleted >= weekStart && w.dateCompleted < weekEnd
  ).length;
  const plannedWorkoutsCount = plannedWorkouts.length;
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
  const activePlanId = lastCompletedWorkout?.week.planId ?? null;

  // Fetch targets for the current week
  const template = await getActiveTemplateForWeek(userId, weekStart);
  const macrosByDow = getMacrosByDow(template);

  function avgNullable(vals: (number | null)[]): number | null {
    const valid = vals.filter((v): v is number => v !== null);
    return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
  }

  const weekTargets = template ? {
    stepsTarget: template.stepsTarget,
    sleepMinsTarget: template.sleepMinsTarget,
    caloriesTarget: avgNullable([1,2,3,4,5,6,7].map(d => macrosByDow[d].caloriesTarget)),
    proteinTarget:  avgNullable([1,2,3,4,5,6,7].map(d => macrosByDow[d].proteinTarget)),
    carbsTarget:    avgNullable([1,2,3,4,5,6,7].map(d => macrosByDow[d].carbsTarget)),
    fatTarget:      avgNullable([1,2,3,4,5,6,7].map(d => macrosByDow[d].fatTarget)),
  } : null;

  return NextResponse.json(
    CurrentCheckInResponseSchema.parse({
      checkIn: mappedCheckIn,
      currentWeek,
      weekPrior,
      previousPhotos,
      weekTargets,
      completedWorkoutsCount,
      plannedWorkoutsCount,
      workoutSummaries,
      activePlanId,
      template: coachTemplate,
    }),
  );
}
