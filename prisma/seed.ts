import prisma from '../src/lib/prisma';
import { BlockSubtype, EventType } from "@prisma/client";
import { seedBobData } from './lib/bobSeedData';
import { getWeekStart, toDateOnly } from '../src/lib/checkInUtils';
import exercisesData from './exercises.json';
import { EXERCISE_EQUIPMENT, EXERCISE_MUSCLES, SeedExercise } from '../src/types/dataTypes';
import { computeE1rm } from '../src/lib/e1rm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const exercises = exercisesData as any as SeedExercise[];

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

function getRandomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  // Clear existing data
  await prisma.$executeRawUnsafe(`
    TRUNCATE "ExerciseSet", "WorkoutExercise", "Exercise", "Workout", "Week", "Plan", "User", "Event", "UserExerciseNote", "DayMetric", "Account", "Session", "WeeklyCheckIn", "PushSubscription"
    CASCADE
  `);

  // Seed Exercises from exercises.json
  validateExercises(exercises);
  await prisma.exercise.createMany({
    data: exercises,
  });

  const allExercises = await prisma.exercise.findMany({ orderBy: { name: 'asc' } });
  const findEx = (exerciseName: string) => allExercises.find(e => e.name === exerciseName)!;

  // Deterministic exercise groups — same exercises repeat across weeks/plans
  // so the "previous sets" feature always has data to display.
  const groupA = [findEx('Bench Press'), findEx('Squat'), findEx('Deadlift')];
  const groupB = [findEx('Overhead Press'), findEx('Barbell Row'), findEx('Pull Ups')];

  // Completion schedule: one entry per workout in loop order (plan → week → workout).
  // Plan 0: 2 weeks × 2 workouts = 4  |  Plan 1: 3 weeks × 2 workouts = 6  →  10 total
  // The last two (Plan 1 Week 2) are left incomplete so the user has a current workout to do.
  const workoutCompletionDates: (Date | null)[] = [
    daysAgo(46), daysAgo(43), // Plan 1, Week 1
    daysAgo(39), daysAgo(36), // Plan 1, Week 2
    daysAgo(32), daysAgo(29), // Plan 2, Week 1
    daysAgo(25), daysAgo(22), // Plan 2, Week 2
    null, null,               // Plan 2, Week 3 — current / incomplete
  ];

  // ── Seed Aaron ────────────────────────────────────────────────────────────
  const aaron = await prisma.user.create({
    data: { name: 'Aaron', email: 'aaron@example.com' },
  });

  await prisma.userExerciseNote.createMany({
    data: [
      { userId: aaron.id, exerciseId: findEx('Bench Press').id, note: 'Warm up properly to protect elbow' },
      { userId: aaron.id, exerciseId: findEx('Squat').id, note: 'Squat properly' },
      { userId: aaron.id, exerciseId: findEx('Overhead Press').id, note: 'Wrench and twist' },
      { userId: aaron.id, exerciseId: findEx('Barbell Row').id, note: "Don't fall over" },
    ],
  });

  await prisma.event.createMany({
    data: [
      {
        userId: aaron.id,
        name: 'Training Week 1',
        description: "Start of Aaron's program'",
        startDate: new Date('2025-06-01'),
        endDate: new Date('2025-06-07'),
        eventType: EventType.CustomEvent
      },
      {
        userId: aaron.id,
        name: 'Holiday',
        description: 'Recovery week',
        startDate: new Date('2025-08-15'),
        endDate: new Date('2025-08-20'),
        eventType: EventType.CustomEvent
      },
      {
        userId: aaron.id,
        name: 'Bulk',
        startDate: new Date('2025-08-01'),
        endDate: new Date('2025-08-31'),
        eventType: EventType.BlockEvent,
        blockSubtype: BlockSubtype.Bulk
      },
      {
        userId: aaron.id,
        name: 'Cut',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-09-21'),
        eventType: EventType.BlockEvent,
        blockSubtype: BlockSubtype.Cut
      },
      {
        userId: aaron.id,
        name: 'Custom',
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-07-21'),
        customColor: 'red',
        eventType: EventType.CustomEvent
      },
    ],
  });

  const planCount = 2;
  let workoutCounter = 0;
  for (let planIdx = 0; planIdx < planCount; planIdx++) {
    const plan = await prisma.plan.create({
      data: {
        userId: aaron.id,
        order: planIdx + 1,
        name: `Aaron's Plan ${planIdx + 1}`,
        description: `Training block ${planIdx + 1} for Aaron`,
      },
    });

    const weekCount = 2 + planIdx;
    for (let weekIdx = 0; weekIdx < weekCount; weekIdx++) {
      const week = await prisma.week.create({
        data: { planId: plan.id, order: weekIdx + 1 },
      });

      const workoutCount = 2;
      for (let woIdx = 0; woIdx < workoutCount; woIdx++) {
        const completionDate = workoutCompletionDates[workoutCounter++] ?? null;

        const workout = await prisma.workout.create({
          data: {
            weekId: week.id,
            name: `Workout ${woIdx + 1} (Plan ${planIdx + 1} - Week ${weekIdx + 1})`,
            notes: woIdx % 2 === 0 ? 'Felt strong today 💪' : null,
            order: woIdx + 1,
          },
        });

        const selectedExercises = woIdx % 2 === 0 ? groupA : groupB;

        for (let i = 0; i < selectedExercises.length; i++) {
          const exercise = selectedExercises[i];

          const workoutExercise = await prisma.workoutExercise.create({
            data: {
              workoutId: workout.id,
              exerciseId: exercise.id,
              order: i + 1,
              restTime: "90",
              repRange: "8-12",
            },
          });

          const setCount = Math.floor(getRandomBetween(2, 5));

          for (let s = 0; s < setCount; s++) {
            await prisma.exerciseSet.create({
              data: {
                workoutExerciseId: workoutExercise.id,
                order: s + 1,
                reps: completionDate !== null ? 8 + Math.floor(Math.random() * 5) : null,
                weight: completionDate !== null ? Math.round(Math.random() * 50 + 30) : null,
              },
            });
          }
        }

        if (completionDate !== null) {
          await prisma.workout.update({
            where: { id: workout.id },
            data: { dateCompleted: completionDate },
          });
        }
      }
    }
  }

  // Seed DayMetrics for Aaron for the last 60 days
  const today = new Date();
  const dayMetricsData = [];
  for (let i = 0; i < 60; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const maybeNull = (val: any) => Math.random() < 0.3 ? null : val;
    dayMetricsData.push({
      userId: aaron.id,
      date,
      weight: maybeNull(Number((Math.random() * 2 + 82).toFixed(1))),
      steps: maybeNull(Math.floor(Math.random() * (10000 - 2000 + 1)) + 2000),
      sleepMins: maybeNull(Math.floor(Math.random() * (540 - 360 + 1)) + 360),
      calories: maybeNull(Math.floor(Math.random() * (2500 - 1500 + 1)) + 1500),
      protein: maybeNull(Math.floor(Math.random() * 200)),
      carbs: maybeNull(Math.floor(Math.random() * 400)),
      fat: maybeNull(Math.floor(Math.random() * 100)),
    });
  }
  await prisma.dayMetric.createMany({ data: dayMetricsData });

  // ── Seed WeeklyCheckIns for Aaron ─────────────────────────────────────────
  // Create 6 completed check-ins over the last 6 weeks
  const checkInData = [];
  for (let w = 1; w <= 6; w++) {
    const refDate = new Date(today);
    refDate.setDate(today.getDate() - w * 7);
    const weekStart = toDateOnly(getWeekStart(refDate));
    const completedAt = new Date(weekStart);
    completedAt.setDate(completedAt.getDate() + 1); // completed on Tuesday of that week

    checkInData.push({
      userId: aaron.id,
      weekStartDate: weekStart,
      completedAt,
      energyLevel: Math.ceil(Math.random() * 5),
      moodRating: Math.ceil(Math.random() * 5),
      stressLevel: Math.ceil(Math.random() * 5),
      sleepQuality: Math.ceil(Math.random() * 5),
      recoveryRating: Math.ceil(Math.random() * 5),
      adherenceRating: Math.ceil(Math.random() * 5),
      completedWorkouts: Math.floor(Math.random() * 4) + 1,
      plannedWorkouts: 4,
      weekReview: w % 2 === 0 ? 'Solid week overall, hit all my main lifts.' : 'Struggled with sleep mid-week but pushed through.',
      coachMessage: w % 3 === 0 ? 'Should I increase squat weight next week?' : null,
      goalsNextWeek: 'Stay consistent on nutrition and add 2.5kg to deadlift.',
    });
  }
  await prisma.weeklyCheckIn.createMany({ data: checkInData });

  // ── Seed Bob (demo login user) ────────────────────────────────────────────
  // A fixed past date is used so E2E tests running against real-today (~2026)
  // see no active blocks and no upcoming events.
  const bob = await prisma.user.create({
    data: { name: 'Bob', email: 'bob@example.com' },
  });
  await seedBobData(bob, new Date('2024-06-01'));

  // Backfill e1rm for all seeded sets
  const allSets = await prisma.exerciseSet.findMany({ select: { id: true, weight: true, reps: true } });
  for (const set of allSets) {
    await prisma.exerciseSet.update({ where: { id: set.id }, data: { e1rm: computeE1rm(set.weight, set.reps) } });
  }

  const dbUrl = process.env.DATABASE_URL ?? "";
  const dbLoc = dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1") ? 'local' : 'neon';
  console.log(`✅ Seeded ${dbLoc} database with Plans, Weeks, Workouts (partial & full), Sets (partial & full), Events, and DayMetrics`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
