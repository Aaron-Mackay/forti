import prisma from '../src/lib/prisma';
import { AuditEventType, LibraryAssetType, NotificationType } from '../src/generated/prisma/browser';
import { seedTestUserData } from './lib/testUserSeedData';
import { EXERCISE_DESCRIPTION, seedDemoClientData } from './lib/jeffDemoSeedData';
import exercisesData from './exercises.json';
import { EXERCISE_EQUIPMENT, EXERCISE_MUSCLES, SeedExercise } from '../src/types/dataTypes';
import { computeE1rm } from '../src/lib/e1rm';

const exercises = exercisesData as unknown as SeedExercise[];

const PRESERVE_EMAIL = 'aarongcmackay@gmail.com';

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

  const preserveUser = await prisma.user.findUnique({ where: { email: PRESERVE_EMAIL }, select: { id: true } });

  if (!preserveUser) {
    await prisma.$executeRawUnsafe(`
      TRUNCATE "ExerciseSet", "WorkoutExercise", "Exercise", "Workout", "Week", "Plan", "User", "Event", "UserExerciseNote", "Metric", "Account", "Session", "WeeklyCheckIn", "PushSubscription", "TargetTemplate", "TargetTemplateDay", "Notification", "AuditEvent", "LearningPlan", "LearningPlanStep", "LearningPlanAssignment", "LibraryAsset"
      CASCADE
    `);
  } else {
    const skip = preserveUser.id;

    // Null all coachId FKs first — no onDelete cascade on User.coachId
    await prisma.user.updateMany({ data: { coachId: null } });

    // Plan hierarchy — activePlanId has onDelete: SetNull, handled automatically
    await prisma.exerciseSet.deleteMany({ where: { workoutExercise: { workout: { week: { plan: { userId: { not: skip } } } } } } });
    await prisma.workoutExercise.deleteMany({ where: { workout: { week: { plan: { userId: { not: skip } } } } } });
    await prisma.workout.deleteMany({ where: { week: { plan: { userId: { not: skip } } } } });
    await prisma.week.deleteMany({ where: { plan: { userId: { not: skip } } } });
    await prisma.plan.deleteMany({ where: { userId: { not: skip } } });

    // Direct user-owned tables
    await prisma.event.deleteMany({ where: { userId: { not: skip } } });
    await prisma.userExerciseNote.deleteMany({ where: { userId: { not: skip } } });
    await prisma.metric.deleteMany({ where: { userId: { not: skip } } });
    await prisma.weeklyCheckIn.deleteMany({ where: { userId: { not: skip } } });
    await prisma.pushSubscription.deleteMany({ where: { userId: { not: skip } } });

    // TargetTemplate cascade
    await prisma.targetTemplateDay.deleteMany({ where: { template: { userId: { not: skip } } } });
    await prisma.targetTemplate.deleteMany({ where: { userId: { not: skip } } });

    await prisma.notification.deleteMany({ where: { userId: { not: skip } } });
    await prisma.auditEvent.deleteMany({ where: { actorUserId: { not: skip } } });

    // Learning plans — also removes assignments linked to coaches being deleted
    await prisma.learningPlanAssignment.deleteMany({ where: { plan: { coachId: { not: skip } } } });
    await prisma.learningPlanStep.deleteMany({ where: { plan: { coachId: { not: skip } } } });
    await prisma.learningPlan.deleteMany({ where: { coachId: { not: skip } } });
    await prisma.libraryAsset.deleteMany({ where: { userId: { not: skip } } });
    await prisma.coachRequest.deleteMany({});

    // Auth tables
    await prisma.account.deleteMany({ where: { userId: { not: skip } } });
    await prisma.session.deleteMany({ where: { userId: { not: skip } } });

    // Supplement exists in schema but not in original TRUNCATE
    await prisma.supplement.deleteMany({ where: { userId: { not: skip } } });

    await prisma.user.deleteMany({ where: { id: { not: skip } } });
  }

  validateExercises(exercises);
  // Use findFirst → update/create to preserve Exercise IDs (auto-increment Int) when a
  // preserved user's WorkoutExercise rows reference them.
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

  const coach = await prisma.user.create({
    data: {
      name: 'Todd Coach',
      email: 'todd@example.com',
      coachCode: '12345678',
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
