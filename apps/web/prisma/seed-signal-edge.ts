import prisma from '../src/lib/prisma';
import { BlockSubtype, EventType, NotificationType } from '../src/generated/prisma/browser';
import { toDateOnly } from '../src/lib/checkInUtils';
import {
  assertNonProductionSeed,
  atDay,
  completeSeed,
  failSeed,
  requireExercise,
  resetSignalQaUserData,
  SIGNAL_QA_PLACEHOLDER_PHOTOS,
  upsertSignalQaUser,
  weekStartFor,
} from './lib/signalQaSeedUtils';

async function main() {
  assertNonProductionSeed('seed-signal-edge');

  const today = new Date();
  const email = 'signal-edge@example.com';
  const user = await upsertSignalQaUser(email, 'Signal Edge Case');

  await resetSignalQaUserData(user.id);

  const bench = await requireExercise('Bench Press');
  const deadlift = await requireExercise('Deadlift');
  const longText = 'Deliberately long Signal QA text used to test wrapping, truncation, responsive card height, drawer behaviour, and whether actions remain reachable on narrow mobile screens.';

  const plan = await prisma.plan.create({
    data: {
      userId: user.id,
      order: 1,
      name: 'Extremely Long Signal QA Plan Name — Hypertrophy / Strength / Conditioning Hybrid Block With Awkward Wrapping',
      description: longText,
      lastActivityDate: toDateOnly(atDay(today, -1)),
      weeks: {
        create: [
          {
            order: 1,
            workouts: {
              create: [
                {
                  order: 1,
                  name: 'Long Workout Name — Upper Body Mechanical Tension Session With Secondary Pump Work',
                  notes: longText,
                  dateCompleted: toDateOnly(atDay(today, -2)),
                  exercises: {
                    create: [
                      {
                        order: 1,
                        exerciseId: bench.id,
                        restTime: '150',
                        repRange: '6-10',
                        notes: longText,
                        sets: { create: [{ order: 1, reps: 10, weight: 80 }, { order: 2, reps: 8, weight: 82.5 }, { order: 3, reps: 6, weight: 85 }] },
                      },
                      {
                        order: 2,
                        exerciseId: deadlift.id,
                        restTime: '240',
                        repRange: '3-5',
                        notes: longText,
                        sets: { create: [{ order: 1 }, { order: 2 }, { order: 3 }] },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });
  await prisma.user.update({ where: { id: user.id }, data: { activePlanId: plan.id } });

  await prisma.metric.createMany({
    data: Array.from({ length: 75 }, (_, i) => ({
      userId: user.id,
      date: toDateOnly(atDay(today, -i)),
      weight: Number((91.5 - i * 0.025 + ((i % 5) - 2) * 0.05).toFixed(1)),
      steps: 4500 + (i % 9) * 1250,
      sleepMins: 330 + (i % 7) * 35,
      calories: 1900 + (i % 6) * 220,
      protein: 120 + (i % 5) * 20,
      carbs: 140 + (i % 7) * 35,
      fat: 45 + (i % 5) * 12,
    })),
  });

  const weekStart = weekStartFor(today);
  await prisma.weeklyCheckIn.create({
    data: {
      userId: user.id,
      weekStartDate: weekStart,
      completedAt: atDay(weekStart, 2),
      energyLevel: 2,
      moodRating: 3,
      stressLevel: 5,
      sleepQuality: 2,
      recoveryRating: 2,
      adherenceRating: 3,
      completedWorkouts: 1,
      plannedWorkouts: 4,
      weekReview: longText,
      coachMessage: longText,
      goalsNextWeek: longText,
      frontPhotoUrl: SIGNAL_QA_PLACEHOLDER_PHOTOS.front,
      backPhotoUrl: SIGNAL_QA_PLACEHOLDER_PHOTOS.back,
      sidePhotoUrl: SIGNAL_QA_PLACEHOLDER_PHOTOS.side,
    },
  });

  await prisma.event.createMany({
    data: [
      {
        userId: user.id,
        name: 'Very Long Signal QA Calendar Block Name That Should Wrap Without Breaking Month Grid Or Drawer Layout',
        description: longText,
        startDate: toDateOnly(atDay(today, -14)),
        endDate: toDateOnly(atDay(today, 21)),
        eventType: EventType.BlockEvent,
        blockSubtype: BlockSubtype.Cut,
      },
      {
        userId: user.id,
        name: 'Tiny same-day event',
        description: longText,
        startDate: toDateOnly(today),
        endDate: toDateOnly(today),
        eventType: EventType.CustomEvent,
      },
    ],
  });

  const supplement = await prisma.supplement.create({
    data: {
      userId: user.id,
      name: 'Creatine monohydrate with deliberately long seeded supplement name for Signal protocol card checks',
      startDate: toDateOnly(atDay(today, -40)),
      versions: {
        create: [
          { effectiveFrom: toDateOnly(atDay(today, -40)), dosage: '5g once daily after training or with largest meal', frequency: 'Daily', notes: longText },
          { effectiveFrom: toDateOnly(atDay(today, -10)), dosage: '3g daily', frequency: 'Daily', notes: 'Changed dose to check supplement version history expansion.' },
        ],
      },
    },
  });

  await prisma.supplement.create({
    data: {
      userId: user.id,
      name: 'Historical caffeine block',
      startDate: toDateOnly(atDay(today, -90)),
      endDate: toDateOnly(atDay(today, -30)),
      versions: { create: [{ effectiveFrom: toDateOnly(atDay(today, -90)), dosage: '100mg', frequency: 'Pre-workout', notes: 'Historical supplement entry.' }] },
    },
  });

  if (!supplement.id) throw new Error('Supplement seed failed');

  await prisma.notification.createMany({
    data: [
      {
        userId: user.id,
        type: NotificationType.CoachFeedback,
        title: 'Very long unread Signal notification title intended to verify calm inbox wrapping and shell badge behaviour',
        body: longText,
        url: '/user/check-in',
        readAt: null,
        createdAt: atDay(today, -1),
      },
      {
        userId: user.id,
        type: NotificationType.LearningPlanStepDelivered,
        title: 'Read learning step',
        body: 'Already-read notification for section split checks.',
        url: '/user/learning-plans',
        readAt: atDay(today, -1),
        createdAt: atDay(today, -2),
      },
    ],
  });

  completeSeed('Seeded Signal Edge user: signal-edge@example.com');
}

main()
  .catch(failSeed)
  .finally(() => prisma.$disconnect());
