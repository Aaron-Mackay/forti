import prisma from '../src/lib/prisma';
import { AuditEventType, LibraryAssetType, NotificationType } from '../src/generated/prisma/browser';
import { seedTestUserData } from './lib/testUserSeedData';
import { EXERCISE_DESCRIPTION, seedDemoClientData } from './lib/jeffDemoSeedData';
import exercisesData from './exercises.json';
import { EXERCISE_EQUIPMENT, EXERCISE_MUSCLES, SeedExercise } from '../src/types/dataTypes';
import { computeE1rm } from '../src/lib/e1rm';

const exercises = exercisesData as unknown as SeedExercise[];

function validateExercises(data: SeedExercise[]): void {
  for (const ex of data) {
    for (const eq of ex.equipment) {
      if (!EXERCISE_EQUIPMENT.includes(eq as never)) throw new Error(`Invalid equipment "${eq}" in exercise "${ex.name}"`);
    }
    for (const muscle of ex.primaryMuscles ?? []) {
      if (!EXERCISE_MUSCLES.includes(muscle as never)) throw new Error(`Invalid primary muscle "${muscle}" in exercise "${ex.name}"`);
    }
    for (const muscle of ex.secondaryMuscles ?? []) {
      if (!EXERCISE_MUSCLES.includes(muscle as never)) throw new Error(`Invalid secondary muscle "${muscle}" in exercise "${ex.name}"`);
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

  await prisma.$executeRawUnsafe(`
    TRUNCATE "ExerciseSet", "WorkoutExercise", "Exercise", "Workout", "Week", "Plan", "User", "Event", "UserExerciseNote", "Metric", "Account", "Session", "WeeklyCheckIn", "PushSubscription", "TargetTemplate", "TargetTemplateDay", "Notification", "AuditEvent", "LearningPlan", "LearningPlanStep", "LearningPlanAssignment", "LibraryAsset"
    CASCADE
  `);

  validateExercises(exercises);
  await prisma.exercise.createMany({ data: exercises.map((ex) => ({ ...ex, description: ex.description ?? EXERCISE_DESCRIPTION })) });

  const coach = await prisma.user.create({
    data: {
      name: 'Todd Coach',
      email: 'todd@example.com',
      coachCode: '123456',
      settings: { registrationComplete: true, onboardingSeenWelcome: true, onboardingDismissed: true, coachModeActive: true },
    },
  });

  const [jeff, maria, alex] = await Promise.all([
    prisma.user.create({ data: { name: 'Jeff Demo', email: 'jeff@example.com' } }),
    prisma.user.create({ data: { name: 'Maria Client', email: 'maria@example.com' } }),
    prisma.user.create({ data: { name: 'Alex Client', email: 'alex@example.com' } }),
  ]);

  await seedDemoClientData(jeff, { coachId: coach.id, today, variant: 'hypertrophy' });
  await seedDemoClientData(maria, { coachId: coach.id, today, variant: 'recomposition' });
  await seedDemoClientData(alex, { coachId: coach.id, today, variant: 'strength' });

  const testuser = await prisma.user.create({
    data: {
      name: 'TestUser',
      email: 'testuser@example.com',
      settings: { registrationComplete: true, onboardingSeenWelcome: true, onboardingDismissed: true },
    },
  });
  await seedTestUserData(testuser, new Date('2024-06-01'));

  const coachAsset = await prisma.libraryAsset.create({
    data: {
      userId: coach.id,
      title: 'Squat Form Guide',
      description: 'Essential cues for a safe and strong squat.',
      type: LibraryAssetType.LINK,
      url: 'https://www.youtube.com/watch?v=ultWZbUMPL8',
      isCoachAsset: true,
    },
  });

  const learningPlan = await prisma.learningPlan.create({
    data: {
      coachId: coach.id,
      title: 'Movement Fundamentals (4-Week Onramp)',
      description: 'Educational progression for technique and consistency.',
      steps: {
        create: [
          { order: 1, dayOffset: 0, title: 'Warm-up intent', body: 'Build a repeatable warm-up routine.' },
          { order: 2, dayOffset: 3, title: 'Bracing primer', body: 'Practice 360° brace breathing before compound lifts.' },
          { order: 3, dayOffset: 7, title: 'Squat depth audit', body: 'Film top set and compare against depth standards.', assetId: coachAsset.id },
          { order: 4, dayOffset: 10, title: 'Recovery habits', body: 'Define one sleep and one stress habit for the next week.' },
        ],
      },
    },
    include: { steps: true },
  });

  for (const [index, client] of [jeff, maria, alex].entries()) {
    const stepProgress = Object.fromEntries(
      learningPlan.steps.map((step, stepIndex) => [String(step.id), {
        notifiedAt: atDay(today, -(12 - stepIndex * 2)).toISOString(),
        completedAt: index === 0 || stepIndex < 2 ? atDay(today, -(10 - stepIndex * 2)).toISOString() : null,
      }]),
    );
    await prisma.learningPlanAssignment.create({
      data: {
        planId: learningPlan.id,
        clientId: client.id,
        startDate: atDay(today, -14),
        stepProgress,
      },
    });
  }

  await prisma.notification.createMany({
    data: [
      {
        userId: coach.id,
        type: NotificationType.CheckInSubmitted,
        title: 'New check-in submitted',
        body: 'Jeff Demo submitted a weekly check-in.',
        url: '/user/coach/check-ins',
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

  await prisma.auditEvent.createMany({
    data: [
      {
        actorUserId: coach.id,
        eventType: AuditEventType.LoginSucceeded,
        subjectType: 'user',
        subjectId: coach.id,
        metadata: { provider: 'demo-coach' },
        occurredAt: atDay(today, -9),
      },
      {
        actorUserId: coach.id,
        eventType: AuditEventType.CheckInReviewed,
        subjectType: 'weeklyCheckIn',
        subjectId: `${jeff.id}-latest`,
        metadata: { clientName: jeff.name },
        occurredAt: atDay(today, -2),
      },
      {
        actorUserId: coach.id,
        eventType: AuditEventType.PlanCreated,
        subjectType: 'learningPlan',
        subjectId: String(learningPlan.id),
        metadata: { title: learningPlan.title },
        occurredAt: atDay(today, -14),
      },
    ],
  });

  const allSets = await prisma.exerciseSet.findMany({ select: { id: true, weight: true, reps: true } });
  for (const set of allSets) {
    await prisma.exerciseSet.update({ where: { id: set.id }, data: { e1rm: computeE1rm(set.weight, set.reps) } });
  }

  console.log('✅ Seeded deterministic demo ecosystem with coach + multiple clients and realistic progress history.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
