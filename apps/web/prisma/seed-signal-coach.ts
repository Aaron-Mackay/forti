import prisma from '../src/lib/prisma';
import { NotificationType } from '../src/generated/prisma/browser';
import { getWeekStart, toDateOnly } from '../src/lib/checkInUtils';
import { defaultSettingsForDemoUser } from '../src/lib/demoUsers';
import { seedDemoClientData } from './lib/jeffDemoSeedData';

function atDay(base: Date, deltaDays: number): Date {
  const d = new Date(base);
  d.setDate(base.getDate() + deltaDays);
  return d;
}

async function resetCoachScenario(coachId: string, clientIds: string[]) {
  await prisma.notification.deleteMany({ where: { userId: coachId } });
  await prisma.auditEvent.deleteMany({ where: { actorUserId: coachId } });
  await prisma.learningPlan.deleteMany({ where: { coachId } });
  await prisma.libraryAsset.deleteMany({ where: { userId: coachId } });
  await prisma.coachRequest.deleteMany({ where: { coachId } });
  await prisma.user.updateMany({ where: { id: { in: clientIds } }, data: { coachId: null } });
}

async function main() {
  const today = new Date();
  const coachEmail = 'signal-coach@example.com';

  const coach = await prisma.user.upsert({
    where: { email: coachEmail },
    update: {
      name: 'Signal Coach',
      coachCode: '87654321',
      settings: defaultSettingsForDemoUser(coachEmail),
    },
    create: {
      email: coachEmail,
      name: 'Signal Coach',
      coachCode: '87654321',
      settings: defaultSettingsForDemoUser(coachEmail),
    },
  });

  const clients = await Promise.all([
    prisma.user.upsert({
      where: { email: 'signal-review-new@example.com' },
      update: { name: 'Review New' },
      create: { email: 'signal-review-new@example.com', name: 'Review New' },
    }),
    prisma.user.upsert({
      where: { email: 'signal-review-archived@example.com' },
      update: { name: 'Review Archived' },
      create: { email: 'signal-review-archived@example.com', name: 'Review Archived' },
    }),
    prisma.user.upsert({
      where: { email: 'signal-review-empty@example.com' },
      update: { name: 'Review Empty' },
      create: { email: 'signal-review-empty@example.com', name: 'Review Empty' },
    }),
  ]);

  await resetCoachScenario(coach.id, clients.map((client) => client.id));

  await seedDemoClientData(clients[0], { coachId: coach.id, today, variant: 'hypertrophy' });
  await seedDemoClientData(clients[1], { coachId: coach.id, today, variant: 'recomposition' });

  const emptyClient = clients[2];
  await prisma.user.update({
    where: { id: emptyClient.id },
    data: {
      coachId: coach.id,
      settings: defaultSettingsForDemoUser(emptyClient.email),
      activePlanId: null,
    },
  });
  await prisma.plan.deleteMany({ where: { userId: emptyClient.id } });
  await prisma.metric.deleteMany({ where: { userId: emptyClient.id } });
  await prisma.weeklyCheckIn.deleteMany({ where: { userId: emptyClient.id } });
  await prisma.notification.deleteMany({ where: { userId: emptyClient.id } });

  const currentWeek = toDateOnly(getWeekStart(today));
  await prisma.weeklyCheckIn.upsert({
    where: { userId_weekStartDate: { userId: clients[0].id, weekStartDate: currentWeek } },
    update: {
      completedAt: atDay(currentWeek, 2),
      weekReview: 'Fresh seeded check-in that should appear in the Needs review queue.',
      coachNotes: null,
      coachReviewedAt: null,
    },
    create: {
      userId: clients[0].id,
      weekStartDate: currentWeek,
      completedAt: atDay(currentWeek, 2),
      energyLevel: 4,
      moodRating: 4,
      stressLevel: 2,
      sleepQuality: 3,
      recoveryRating: 3,
      adherenceRating: 4,
      completedWorkouts: 3,
      plannedWorkouts: 3,
      weekReview: 'Fresh seeded check-in that should appear in the Needs review queue.',
    },
  });

  await prisma.weeklyCheckIn.updateMany({
    where: { userId: clients[1].id, completedAt: { not: null } },
    data: {
      coachNotes: 'Archived seeded review note. This should sit outside the new review queue.',
      coachReviewedAt: atDay(today, -2),
    },
  });

  const libraryAsset = await prisma.libraryAsset.create({
    data: {
      userId: coach.id,
      title: 'Signal Coach Review Guide',
      description: 'Seeded coach asset for library and learning plan checks.',
      type: 'LINK',
      url: 'https://example.com/coach-review-guide',
      isCoachAsset: true,
    },
  });

  const learningPlan = await prisma.learningPlan.create({
    data: {
      coachId: coach.id,
      title: 'Signal Coach QA Learning Plan',
      description: 'Plan used to test coach learning-plan library, editor, and assignments.',
      steps: {
        create: [
          { order: 1, dayOffset: 0, title: 'Review baseline', body: 'Seeded first step.' },
          { order: 2, dayOffset: 7, title: 'Watch technique guide', body: 'Seeded asset step.', assetId: libraryAsset.id },
          { order: 3, dayOffset: 14, title: 'Future locked step', body: 'Seeded future step.' },
        ],
      },
    },
    include: { steps: true },
  });

  for (const client of clients.slice(0, 2)) {
    await prisma.learningPlanAssignment.create({
      data: {
        planId: learningPlan.id,
        clientId: client.id,
        startDate: toDateOnly(atDay(today, -7)),
        stepProgress: Object.fromEntries(learningPlan.steps.map((step, index) => [
          String(step.id),
          {
            notifiedAt: index < 2 ? atDay(today, -6 + index).toISOString() : null,
            completedAt: index === 0 ? atDay(today, -5).toISOString() : null,
          },
        ])),
      },
    });
  }

  await prisma.notification.createMany({
    data: [
      {
        userId: coach.id,
        type: NotificationType.CheckInSubmitted,
        title: 'Fresh check-in needs review',
        body: 'Review New submitted a seeded Signal QA check-in.',
        url: '/user/coach/check-ins',
        readAt: null,
        createdAt: atDay(today, -1),
      },
      {
        userId: coach.id,
        type: NotificationType.LearningPlanStepDelivered,
        title: 'Learning assignment update',
        body: 'A seeded learning step was delivered to Review Archived.',
        url: '/user/coach/learning-plans',
        readAt: atDay(today, -1),
        createdAt: atDay(today, -2),
      },
    ],
  });

  console.log('✅ Seeded Signal Coach review account: signal-coach@example.com');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
