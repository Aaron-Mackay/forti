/**
 * Shared deterministic seeding logic for demo clients.
 *
 * Used by both seed.ts (full reset) and seed-demo.ts (idempotent demo refresh).
 */

import prisma from '../../src/lib/prisma';
import {
  AuditEventType,
  BlockSubtype,
  EventType,
  NotificationType,
} from '../../src/generated/prisma/browser';
import { getWeekStart, toDateOnly } from '../../src/lib/checkInUtils';

export const EXERCISE_DESCRIPTION =
  'DESC - Lorem ipsum dolor sit amet, consectetur adipiscing elit...';

type ClientVariant = 'hypertrophy' | 'recomposition' | 'strength';

interface DemoClientSeedOptions {
  coachId: string;
  today: Date;
  variant: ClientVariant;
}

const EXERCISE_BASES: Record<string, { weight: number; reps: number }> = {
  'Bench Press': { weight: 80, reps: 8 },
  Squat: { weight: 100, reps: 5 },
  Deadlift: { weight: 125, reps: 5 },
  'Overhead Press': { weight: 55, reps: 8 },
  'Barbell Row': { weight: 75, reps: 8 },
  'Pull Ups': { weight: 0, reps: 8 },
};

const PLAN_LIBRARY: Record<ClientVariant, {
  inactiveName: string;
  activeName: string;
  notes: [string, string];
}> = {
  hypertrophy: {
    inactiveName: 'Foundation Hypertrophy (Completed)',
    activeName: 'Upper/Lower Hypertrophy (Active)',
    notes: ['Build volume tolerance', 'Progressive overload with controlled tempo'],
  },
  recomposition: {
    inactiveName: 'Recomposition Primer (Completed)',
    activeName: 'Recomposition Phase 2 (Active)',
    notes: ['Body-composition reset block', 'Maintain strength while tightening nutrition'],
  },
  strength: {
    inactiveName: 'Base Strength Cycle (Completed)',
    activeName: 'Peaking Strength Cycle (Active)',
    notes: ['Technique and base loading', 'Top sets + back-off progression'],
  },
};

function atDay(base: Date, deltaDays: number): Date {
  const d = new Date(base);
  d.setDate(base.getDate() + deltaDays);
  return d;
}

function isoDate(d: Date): string {
  return toDateOnly(d).toISOString();
}

function macroTargets(dayOfWeek: number, variant: ClientVariant) {
  const trainingDays = new Set([1, 2, 4, 6]);
  const isTraining = trainingDays.has(dayOfWeek);

  if (variant === 'hypertrophy') {
    return isTraining
      ? { caloriesTarget: 3000, proteinTarget: 190, carbsTarget: 380, fatTarget: 75 }
      : { caloriesTarget: 2550, proteinTarget: 190, carbsTarget: 250, fatTarget: 85 };
  }

  if (variant === 'recomposition') {
    return isTraining
      ? { caloriesTarget: 2450, proteinTarget: 180, carbsTarget: 260, fatTarget: 70 }
      : { caloriesTarget: 2150, proteinTarget: 180, carbsTarget: 170, fatTarget: 75 };
  }

  return isTraining
    ? { caloriesTarget: 2850, proteinTarget: 200, carbsTarget: 320, fatTarget: 75 }
    : { caloriesTarget: 2450, proteinTarget: 200, carbsTarget: 210, fatTarget: 85 };
}

export async function seedDemoClientData(user: { id: string; name: string }, options: DemoClientSeedOptions): Promise<void> {
  const { coachId, today, variant } = options;
  const planProfile = PLAN_LIBRARY[variant];

  const allExercises = await prisma.exercise.findMany({ orderBy: { name: 'asc' } });
  const findEx = (name: string) => {
    const exercise = allExercises.find((e) => e.name === name);
    if (!exercise) throw new Error(`Missing exercise in seed: ${name}`);
    return exercise;
  };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      coachId,
      settings: { registrationComplete: true, onboardingSeenWelcome: true, onboardingDismissed: true },
    },
  });

  await prisma.userExerciseNote.deleteMany({ where: { userId: user.id } });
  await prisma.event.deleteMany({ where: { userId: user.id } });
  await prisma.metric.deleteMany({ where: { userId: user.id } });
  await prisma.weeklyCheckIn.deleteMany({ where: { userId: user.id } });
  await prisma.targetTemplate.deleteMany({ where: { userId: user.id } });
  await prisma.notification.deleteMany({ where: { userId: user.id } });
  await prisma.auditEvent.deleteMany({ where: { actorUserId: user.id } });
  await prisma.plan.deleteMany({ where: { userId: user.id } });

  await prisma.userExerciseNote.createMany({
    data: [
      { userId: user.id, exerciseId: findEx('Bench Press').id, note: 'Pause one beat on chest to control bounce.' },
      { userId: user.id, exerciseId: findEx('Squat').id, note: 'Brace before descent and keep chest stacked.' },
      { userId: user.id, exerciseId: findEx('Deadlift').id, note: 'Drag the bar up the shins; lockout with glutes.' },
    ],
  });

  await prisma.event.createMany({
    data: [
      {
        userId: user.id,
        name: 'Current Build Block',
        startDate: toDateOnly(atDay(today, -28)),
        endDate: toDateOnly(atDay(today, 21)),
        eventType: EventType.BlockEvent,
        blockSubtype: BlockSubtype.Bulk,
      },
      {
        userId: user.id,
        name: 'Deload Week',
        startDate: toDateOnly(atDay(today, 35)),
        endDate: toDateOnly(atDay(today, 41)),
        eventType: EventType.BlockEvent,
        blockSubtype: BlockSubtype.Deload,
      },
      {
        userId: user.id,
        name: 'Body comp photos',
        startDate: toDateOnly(atDay(today, 2)),
        endDate: toDateOnly(atDay(today, 2)),
        eventType: EventType.CustomEvent,
      },
    ],
  });

  const inactivePlan = await prisma.plan.create({
    data: {
      userId: user.id,
      order: 1,
      name: planProfile.inactiveName,
      description: planProfile.notes[0],
      lastActivityDate: toDateOnly(atDay(today, -49)),
      weeks: {
        create: [1, 2].map((weekOrder) => ({
          order: weekOrder,
          workouts: {
            create: [
              {
                order: 1,
                name: `Week ${weekOrder} - Session A`,
                notes: 'Completed and archived.',
                dateCompleted: toDateOnly(atDay(today, -63 + weekOrder * 7)),
              },
              {
                order: 2,
                name: `Week ${weekOrder} - Session B`,
                notes: 'Completed and archived.',
                dateCompleted: toDateOnly(atDay(today, -61 + weekOrder * 7)),
              },
            ],
          },
        })),
      },
    },
  });

  const activePlan = await prisma.plan.create({
    data: {
      userId: user.id,
      order: 2,
      name: planProfile.activeName,
      description: planProfile.notes[1],
      lastActivityDate: toDateOnly(atDay(today, -1)),
    },
  });

  const workoutTemplates = [
    { name: 'Upper A', exercises: ['Bench Press', 'Barbell Row', 'Overhead Press'] },
    { name: 'Lower A', exercises: ['Squat', 'Deadlift'] },
    { name: 'Upper B', exercises: ['Bench Press', 'Pull Ups', 'Overhead Press'] },
  ] as const;

  for (let weekOrder = 1; weekOrder <= 4; weekOrder += 1) {
    const week = await prisma.week.create({ data: { planId: activePlan.id, order: weekOrder } });
    for (let workoutOrder = 1; workoutOrder <= workoutTemplates.length; workoutOrder += 1) {
      const template = workoutTemplates[workoutOrder - 1];
      const workout = await prisma.workout.create({
        data: {
          weekId: week.id,
          order: workoutOrder,
          name: template.name,
          notes: workoutOrder === 1 ? 'Top set then back-off sets.' : null,
          dateCompleted: weekOrder <= 2 || (weekOrder === 3 && workoutOrder === 1)
            ? toDateOnly(atDay(today, -28 + weekOrder * 7 + workoutOrder))
            : null,
        },
      });

      for (let exerciseOrder = 1; exerciseOrder <= template.exercises.length; exerciseOrder += 1) {
        const exerciseName = template.exercises[exerciseOrder - 1];
        const base = EXERCISE_BASES[exerciseName] ?? { weight: 60, reps: 8 };
        const workoutExercise = await prisma.workoutExercise.create({
          data: {
            workoutId: workout.id,
            exerciseId: findEx(exerciseName).id,
            order: exerciseOrder,
            restTime: '90',
            repRange: exerciseName === 'Deadlift' ? '3-6' : '6-10',
          },
        });

        for (let setOrder = 1; setOrder <= 3; setOrder += 1) {
          const isComplete = Boolean(workout.dateCompleted);
          await prisma.exerciseSet.create({
            data: {
              workoutExerciseId: workoutExercise.id,
              order: setOrder,
              reps: isComplete ? base.reps + (setOrder === 3 ? -1 : 0) : null,
              weight: isComplete && base.weight > 0 ? base.weight + (weekOrder - 1) * 2.5 : null,
            },
          });
        }
      }
    }
  }

  await prisma.user.update({ where: { id: user.id }, data: { activePlanId: activePlan.id } });
  if (!inactivePlan.id) throw new Error('Inactive plan seed failed');

  const currentWeekStart = toDateOnly(getWeekStart(today));
  await prisma.targetTemplate.createMany({
    data: [
      {
        userId: user.id,
        effectiveFrom: toDateOnly(atDay(currentWeekStart, -56)),
        stepsTarget: 9000,
        sleepMinsTarget: 465,
      },
      {
        userId: user.id,
        effectiveFrom: currentWeekStart,
        stepsTarget: 10000,
        sleepMinsTarget: 480,
      },
    ],
  });

  const templates = await prisma.targetTemplate.findMany({ where: { userId: user.id } });
  const latestTemplate = templates.find((t) => isoDate(t.effectiveFrom) === isoDate(currentWeekStart));
  const oldTemplate = templates.find((t) => isoDate(t.effectiveFrom) !== isoDate(currentWeekStart));
  if (!latestTemplate || !oldTemplate) throw new Error('Target template seed failed');

  await prisma.targetTemplateDay.createMany({
    data: [latestTemplate, oldTemplate].flatMap((template, idx) =>
      [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
        templateId: template.id,
        dayOfWeek,
        ...(idx === 0 ? macroTargets(dayOfWeek, variant) : {
          caloriesTarget: 2400,
          proteinTarget: 180,
          carbsTarget: 220,
          fatTarget: 75,
        }),
      })),
    ),
  });

  const metrics = Array.from({ length: 98 }, (_, i) => {
    const date = toDateOnly(atDay(today, -i));
    const trend = variant === 'hypertrophy' ? i * -0.015 : i * -0.02;
    return {
      userId: user.id,
      date,
      weight: Number((85 + trend + ((i % 5) - 2) * 0.08).toFixed(1)),
      steps: 7200 + (i % 6) * 850,
      sleepMins: 420 + (i % 4) * 20,
      calories: variant === 'hypertrophy' ? 2850 - (i % 3) * 120 : 2350 - (i % 3) * 100,
      protein: 175 + (i % 3) * 10,
      carbs: variant === 'strength' ? 300 + (i % 4) * 20 : 240 + (i % 4) * 18,
      fat: 68 + (i % 4) * 5,
    };
  });
  await prisma.metric.createMany({ data: metrics });

  const checkIns = [1, 2, 4, 5, 7, 9].map((weeksAgo, index) => {
    const referenceDate = atDay(today, -weeksAgo * 7);
    const weekStartDate = toDateOnly(getWeekStart(referenceDate));
    const completedAt = index === 1 ? null : atDay(weekStartDate, 2);
    const reviewed = index >= 3;
    return {
      userId: user.id,
      weekStartDate,
      completedAt,
      energyLevel: completedAt ? Math.max(2, 5 - (index % 3)) : null,
      moodRating: completedAt ? 4 - (index % 2) : null,
      stressLevel: completedAt ? 2 + (index % 3) : null,
      sleepQuality: completedAt ? 3 + (index % 2) : null,
      recoveryRating: completedAt ? 3 + ((index + 1) % 2) : null,
      adherenceRating: completedAt ? 4 - (index % 2) : null,
      completedWorkouts: completedAt ? 2 + (index % 2) : null,
      plannedWorkouts: 3,
      weekReview: completedAt ? `Week ${weeksAgo}: generally solid, missed one accessory session.` : null,
      goalsNextWeek: completedAt ? 'Keep nutrition adherence above 85% and hit all compounds.' : null,
      coachMessage: completedAt && index === 0 ? 'Can we add an extra conditioning session?' : null,
      coachNotes: reviewed ? 'Review complete — maintain current progression and prioritize sleep consistency.' : null,
      coachReviewedAt: reviewed ? atDay(weekStartDate, 5) : null,
    };
  });
  await prisma.weeklyCheckIn.createMany({ data: checkIns });

  await prisma.notification.createMany({
    data: [
      {
        userId: user.id,
        type: NotificationType.CoachFeedback,
        title: 'Coach reviewed your weekly check-in',
        body: 'Feedback added on your latest submitted check-in.',
        url: '/user/check-in',
        readAt: null,
        createdAt: atDay(today, -2),
      },
      {
        userId: user.id,
        type: NotificationType.LearningPlanStepDelivered,
        title: 'New learning step unlocked',
        body: 'Technique breakdown for your next squat session is available.',
        url: '/user/library',
        readAt: atDay(today, -1),
        createdAt: atDay(today, -1),
      },
    ],
  });

  await prisma.auditEvent.createMany({
    data: [
      {
        actorUserId: user.id,
        eventType: AuditEventType.LoginSucceeded,
        subjectType: 'user',
        subjectId: user.id,
        metadata: { provider: 'demo' },
        occurredAt: atDay(today, -6),
      },
      {
        actorUserId: user.id,
        eventType: AuditEventType.PlanSaved,
        subjectType: 'plan',
        subjectId: String(activePlan.id),
        metadata: { variant },
        occurredAt: atDay(today, -3),
      },
      {
        actorUserId: user.id,
        eventType: AuditEventType.CheckInSubmitted,
        subjectType: 'weeklyCheckIn',
        subjectId: `${user.id}-week-${isoDate(getWeekStart(atDay(today, -7)))}`,
        metadata: { source: 'seed' },
        occurredAt: atDay(today, -4),
      },
    ],
  });
}

export async function seedJeffDemoData(user: { id: string; name: string }, today: Date, coachId: string): Promise<void> {
  await seedDemoClientData(user, {
    coachId,
    today,
    variant: 'hypertrophy',
  });
}
