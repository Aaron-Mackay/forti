/**
 * seed-demo.ts — Safe prod/dev demo account refresh.
 *
 * Idempotent and deterministic:
 *  - Upserts global exercises
 *  - Upserts one coach and multiple demo clients
 *  - Rebuilds demo-only relational data with realistic scenarios
 */

import prisma from '../src/lib/prisma';
import {
  AuditEventType,
  LibraryAssetType,
  NotificationType,
} from '../src/generated/prisma/browser';
import { EXERCISE_DESCRIPTION, seedDemoClientData } from './lib/jeffDemoSeedData';
import { EXERCISE_EQUIPMENT, EXERCISE_MUSCLES, SeedExercise } from '../src/types/dataTypes';
import exercisesData from './exercises.json';

const exercises = exercisesData as unknown as SeedExercise[];

function validateExercises(data: SeedExercise[]): void {
  for (const ex of data) {
    for (const eq of ex.equipment) {
      if (!EXERCISE_EQUIPMENT.includes(eq as never)) {
        throw new Error(`Invalid equipment "${eq}" in exercise "${ex.name}"`);
      }
    }
    for (const muscle of ex.primaryMuscles ?? []) {
      if (!EXERCISE_MUSCLES.includes(muscle as never)) {
        throw new Error(`Invalid primary muscle "${muscle}" in exercise "${ex.name}"`);
      }
    }
    for (const muscle of ex.secondaryMuscles ?? []) {
      if (!EXERCISE_MUSCLES.includes(muscle as never)) {
        throw new Error(`Invalid secondary muscle "${muscle}" in exercise "${ex.name}"`);
      }
    }
  }
}

function atDay(base: Date, deltaDays: number): Date {
  const d = new Date(base);
  d.setDate(base.getDate() + deltaDays);
  return d;
}

async function main() {
  const today = new Date();

  validateExercises(exercises);
  for (const ex of exercises) {
    const existing = await prisma.exercise.findFirst({
      where: { name: ex.name, category: ex.category, createdByUserId: null },
      select: { id: true },
    });

    if (existing) {
      await prisma.exercise.update({
        where: { id: existing.id },
        data: {
          equipment: ex.equipment,
          primaryMuscles: ex.primaryMuscles,
          secondaryMuscles: ex.secondaryMuscles ?? [],
          description: ex.description ?? EXERCISE_DESCRIPTION,
        },
      });
    } else {
      await prisma.exercise.create({ data: { ...ex, description: ex.description ?? EXERCISE_DESCRIPTION } });
    }
  }

  const coach = await prisma.user.upsert({
    where: { email: 'todd@example.com' },
    update: {
      name: 'Todd Coach',
      coachCode: '123456',
      settings: { registrationComplete: true, onboardingSeenWelcome: true, onboardingDismissed: true, coachModeActive: true },
    },
    create: {
      name: 'Todd Coach',
      email: 'todd@example.com',
      coachCode: '123456',
      settings: { registrationComplete: true, onboardingSeenWelcome: true, onboardingDismissed: true, coachModeActive: true },
    },
  });

  const clients = await Promise.all([
    prisma.user.upsert({
      where: { email: 'jeff@example.com' },
      update: { name: 'Jeff Demo' },
      create: { name: 'Jeff Demo', email: 'jeff@example.com' },
    }),
    prisma.user.upsert({
      where: { email: 'maria@example.com' },
      update: { name: 'Maria Client' },
      create: { name: 'Maria Client', email: 'maria@example.com' },
    }),
    prisma.user.upsert({
      where: { email: 'alex@example.com' },
      update: { name: 'Alex Client' },
      create: { name: 'Alex Client', email: 'alex@example.com' },
    }),
  ]);

  await seedDemoClientData(clients[0], { coachId: coach.id, today, variant: 'hypertrophy' });
  await seedDemoClientData(clients[1], { coachId: coach.id, today, variant: 'recomposition' });
  await seedDemoClientData(clients[2], { coachId: coach.id, today, variant: 'strength' });

  await prisma.learningPlan.deleteMany({ where: { coachId: coach.id } });
  const formAsset = await prisma.libraryAsset.create({
    data: {
      userId: coach.id,
      title: 'Squat Form Checklist',
      description: 'Cue checklist and video prompts for squat setup and execution.',
      type: LibraryAssetType.DOCUMENT,
      isCoachAsset: true,
    },
  });

  const learningPlan = await prisma.learningPlan.create({
    data: {
      coachId: coach.id,
      title: 'Movement Fundamentals (4-Week Onramp)',
      description: 'Short educational drip plan to improve execution quality and adherence.',
      steps: {
        create: [
          { order: 1, dayOffset: 0, title: 'Warm-up intent', body: 'Build a repeatable 8-minute warm-up routine.' },
          { order: 2, dayOffset: 3, title: 'Bracing primer', body: 'Practice 360° brace breathing before each squat/deadlift set.' },
          { order: 3, dayOffset: 7, title: 'Squat depth audit', body: 'Film top set from side view and compare against standards.', assetId: formAsset.id },
          { order: 4, dayOffset: 10, title: 'Recovery habits', body: 'Pick one sleep and one stress habit to execute daily.' },
        ],
      },
    },
    include: { steps: true },
  });

  for (const [index, client] of clients.entries()) {
    const progress = Object.fromEntries(
      learningPlan.steps.map((step, stepIndex) => [
        String(step.id),
        {
          notifiedAt: atDay(today, -(12 - stepIndex * 2)).toISOString(),
          completedAt: index === 0 || stepIndex < 2 ? atDay(today, -(10 - stepIndex * 2)).toISOString() : null,
        },
      ]),
    );

    await prisma.learningPlanAssignment.upsert({
      where: { planId_clientId: { planId: learningPlan.id, clientId: client.id } },
      update: {
        startDate: atDay(today, -14),
        stepProgress: progress,
      },
      create: {
        planId: learningPlan.id,
        clientId: client.id,
        startDate: atDay(today, -14),
        stepProgress: progress,
      },
    });
  }

  await prisma.notification.deleteMany({ where: { userId: coach.id } });
  await prisma.notification.createMany({
    data: [
      {
        userId: coach.id,
        type: NotificationType.CheckInSubmitted,
        title: 'New check-in submitted',
        body: 'Jeff Demo submitted a weekly check-in.',
        url: '/user/coach/check-ins',
        readAt: null,
        createdAt: atDay(today, -1),
      },
      {
        userId: coach.id,
        type: NotificationType.LearningPlanStepDelivered,
        title: 'Learning step delivered',
        body: 'A new educational step was delivered to Maria Client.',
        url: '/user/coach/clients',
        readAt: atDay(today, -1),
        createdAt: atDay(today, -1),
      },
    ],
  });

  await prisma.auditEvent.deleteMany({ where: { actorUserId: coach.id } });
  await prisma.auditEvent.createMany({
    data: [
      {
        actorUserId: coach.id,
        eventType: AuditEventType.LoginSucceeded,
        subjectType: 'user',
        subjectId: coach.id,
        metadata: { provider: 'demo-coach' },
        occurredAt: atDay(today, -8),
      },
      {
        actorUserId: coach.id,
        eventType: AuditEventType.CheckInReviewed,
        subjectType: 'weeklyCheckIn',
        subjectId: `${clients[0].id}-latest`,
        metadata: { clientName: clients[0].name },
        occurredAt: atDay(today, -2),
      },
    ],
  });

  console.log('✅ Demo seed complete (coach + 3 clients + plans, metrics, targets, check-ins, learning, notifications, audits)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
