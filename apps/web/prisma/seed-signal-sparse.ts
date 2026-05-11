import prisma from '../src/lib/prisma';
import { BlockSubtype, EventType, NotificationType } from '../src/generated/prisma/browser';
import { getWeekStart, toDateOnly } from '../src/lib/checkInUtils';
import { defaultSettingsForDemoUser } from '../src/lib/demoUsers';

function atDay(base: Date, deltaDays: number): Date {
  const d = new Date(base);
  d.setDate(base.getDate() + deltaDays);
  return d;
}

async function requireExercise(name: string) {
  const exercise = await prisma.exercise.findFirst({ where: { name } });
  if (!exercise) throw new Error(`Missing exercise "${name}". Run npm run seed:demo first.`);
  return exercise;
}

async function resetUserData(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { activePlanId: null } });
  await prisma.learningPlanAssignment.deleteMany({ where: { clientId: userId } });
  await prisma.userExerciseNote.deleteMany({ where: { userId } });
  await prisma.event.deleteMany({ where: { userId } });
  await prisma.metric.deleteMany({ where: { userId } });
  await prisma.weeklyCheckIn.deleteMany({ where: { userId } });
  await prisma.targetTemplate.deleteMany({ where: { userId } });
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.auditEvent.deleteMany({ where: { actorUserId: userId } });
  await prisma.supplement.deleteMany({ where: { userId } });
  await prisma.plan.deleteMany({ where: { userId } });
}

async function main() {
  const today = new Date();
  const email = 'signal-sparse@example.com';
  const user = await prisma.user.upsert({
    where: { email },
    update: { name: 'Signal Sparse', settings: defaultSettingsForDemoUser(email) },
    create: { email, name: 'Signal Sparse', settings: defaultSettingsForDemoUser(email) },
  });

  await resetUserData(user.id);

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

  const weekStart = toDateOnly(getWeekStart(today));
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

  console.log('✅ Seeded Signal Sparse user: signal-sparse@example.com');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
