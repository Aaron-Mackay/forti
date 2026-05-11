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
  upsertSignalQaUser,
  weekStartFor,
} from './lib/signalQaSeedUtils';

async function main() {
  assertNonProductionSeed('seed-signal-sparse');

  const today = new Date();
  const email = 'signal-sparse@example.com';
  const user = await upsertSignalQaUser(email, 'Signal Sparse');

  await resetSignalQaUserData(user.id);

  const bench = await requireExercise('Bench Press');
  const squat = await requireExercise('Squat');

  const plan = await prisma.plan.create({
    data: {
      userId: user.id,
      order: 1,
      name: 'Sparse Signal QA Plan',
      description: 'Small seeded plan with mixed completion states.',
      lastActivityDate: toDateOnly(atDay(today, -1)),
      weeks: {
        create: [
          {
            order: 1,
            workouts: {
              create: [
                {
                  order: 1,
                  name: 'Partially Logged Upper',
                  notes: 'One complete set and two empty sets.',
                  exercises: {
                    create: [
                      {
                        order: 1,
                        exerciseId: bench.id,
                        restTime: '90',
                        repRange: '6-10',
                        sets: { create: [{ order: 1, reps: 8, weight: 75 }, { order: 2 }, { order: 3 }] },
                      },
                    ],
                  },
                },
                {
                  order: 2,
                  name: 'Not Started Lower',
                  exercises: {
                    create: [
                      {
                        order: 1,
                        exerciseId: squat.id,
                        restTime: '120',
                        repRange: '5-8',
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
    data: [0, 2, 5, 9].map((offset, index) => ({
      userId: user.id,
      date: toDateOnly(atDay(today, -offset)),
      weight: index === 2 ? null : 83.5 - index * 0.2,
      steps: index === 1 ? null : 7000 + index * 850,
      sleepMins: index === 3 ? null : 410 + index * 25,
      calories: index === 0 ? 2350 : null,
      protein: index === 0 ? 170 : null,
      carbs: index === 0 ? 230 : null,
      fat: index === 0 ? 70 : null,
    })),
  });

  const weekStart = weekStartFor(today);
  await prisma.weeklyCheckIn.create({
    data: {
      userId: user.id,
      weekStartDate: weekStart,
      completedAt: null,
      plannedWorkouts: 3,
    },
  });

  await prisma.event.create({
    data: {
      userId: user.id,
      name: 'Sparse QA Block',
      startDate: toDateOnly(atDay(today, -7)),
      endDate: toDateOnly(atDay(today, 14)),
      eventType: EventType.BlockEvent,
      blockSubtype: BlockSubtype.Maintenance,
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: user.id,
        type: NotificationType.CoachFeedback,
        title: 'Sparse unread notification',
        body: 'Used to test the unread dot and calm inbox empty/read split.',
        url: '/user/check-in',
        readAt: null,
        createdAt: atDay(today, -1),
      },
    ],
  });

  completeSeed('Seeded Signal Sparse user: signal-sparse@example.com');
}

main()
  .catch(failSeed)
  .finally(() => prisma.$disconnect());
