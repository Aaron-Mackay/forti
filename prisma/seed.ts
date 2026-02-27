import prisma from '../src/lib/prisma';
import { BlockSubtype, EventType } from "@prisma/client";
const exercisesData = require('./exercises.json');

function getRandomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

async function main() {
  // Clear existing data
  await prisma.$executeRawUnsafe(`
    TRUNCATE "ExerciseSet", "WorkoutExercise", "Exercise", "Workout", "Week", "Plan", "User", "Event", "UserExerciseNote", "DayMetric", "Account", "Session"
    CASCADE
  `);

  // Seed Exercises from exercises.json
  await prisma.exercise.createMany({
    data: exercisesData,
  });

  const allExercises = await prisma.exercise.findMany({ orderBy: { name: 'asc' } });
  const findEx = (exerciseName: string) => allExercises.find(e => e.name === exerciseName)!;

  // Seed Users, Plans, Weeks, Workouts, Sets, etc.
  for (const [_index, name] of ['Aaron', 'Bob'].entries()) {
    const user = await prisma.user.create({
      data: {
        name,
        email: `${name.toLowerCase()}@example.com`,
      },
    });

    await prisma.userExerciseNote.createMany({
      data: [
        { userId: user.id, exerciseId: findEx('Bench Press').id, note: 'Warm up properly to protect elbow' },
        { userId: user.id, exerciseId: findEx('Squat').id, note: 'Squat properly' },
        { userId: user.id, exerciseId: findEx('Overhead Press').id, note: 'Wrench and twist' },
        { userId: user.id, exerciseId: findEx('Barbell Row').id, note: 'Don\'t fall over' },
      ],
    });

    await prisma.event.createMany({
      data: [
        {
          userId: user.id,
          name: 'Training Week 1',
          description: `Start of ${user.name}'s program'`,
          startDate: new Date('2025-06-01'),
          endDate: new Date('2025-06-07'),
          eventType: EventType.CustomEvent
        },
        {
          userId: user.id,
          name: 'Holiday',
          description: 'Recovery week',
          startDate: new Date('2025-08-15'),
          endDate: new Date('2025-08-20'),
          eventType: EventType.CustomEvent
        },
        {
          userId: user.id,
          name: 'Bulk',
          startDate: new Date('2025-08-01'),
          endDate: new Date('2025-08-31'),
          eventType: EventType.BlockEvent,
          blockSubtype: BlockSubtype.Bulk
        },
        {
          userId: user.id,
          name: 'Cut',
          startDate: new Date('2025-09-01'),
          endDate: new Date('2025-09-21'),
          eventType: EventType.BlockEvent,
          blockSubtype: BlockSubtype.Cut
        },
        {
          userId: user.id,
          name: 'Custom',
          startDate: new Date('2025-07-01'),
          endDate: new Date('2025-07-21'),
          customColor: 'red',
          eventType: EventType.CustomEvent
        },
      ],
    });

    // Create multiple Plans per User
    const planCount = 2;
    for (let planIdx = 0; planIdx < planCount; planIdx++) {
      const plan = await prisma.plan.create({
        data: {
          userId: user.id,
          order: planIdx + 1,
          name: `${user.name}'s Plan ${planIdx + 1}`,
          description: `Training block ${planIdx + 1} for ${user.name}`,
        },
      });

      // For each Plan, create Weeks
      const weekCount = 2 + planIdx; // 2 weeks in Plan 1, 3 in Plan 2, etc.
      for (let weekIdx = 0; weekIdx < weekCount; weekIdx++) {
        const week = await prisma.week.create({
          data: {
            planId: plan.id,
            order: weekIdx + 1,
          },
        });

        // For each Week, create Workouts
        const workoutCount = 2;
        for (let woIdx = 0; woIdx < workoutCount; woIdx++) {
          const workout = await prisma.workout.create({
            data: {
              weekId: week.id,
              name: `Workout ${woIdx + 1} (Plan ${planIdx + 1} - Week ${weekIdx + 1})`,
              notes: woIdx % 2 === 0 ? 'Felt strong today 💪' : null,
              order: woIdx + 1,
            },
          });

          let allSetsDone = true;

          // First workout always has Bench Press, Squat, Deadlift so E2E tests
          // that look for 'Squat' in Plan 1 → Week 1 → Workout 1 are deterministic.
          const isFirstWorkout = planIdx === 0 && weekIdx === 0 && woIdx === 0;
          const selectedExercises = isFirstWorkout
            ? [findEx('Bench Press'), findEx('Squat'), findEx('Deadlift')]
            : [...allExercises].sort(() => 0.5 - Math.random()).slice(0, 2 + Math.floor(Math.random() * 2));

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
            let exerciseHasDoneSets = false;

            for (let s = 0; s < setCount; s++) {
              const setIsDone = Math.random() < 0.7; // 70% chance set is completed
              if (setIsDone) exerciseHasDoneSets = true;

              await prisma.exerciseSet.create({
                data: {
                  workoutExerciseId: workoutExercise.id,
                  order: s + 1,
                  reps: setIsDone ? 8 + Math.floor(Math.random() * 5) : null,
                  weight: setIsDone ? (Math.round(Math.random() * 50 + 30)).toString() : null,
                },
              });
            }

            if (!exerciseHasDoneSets) {
              allSetsDone = false;
            }
          }

          // If all sets are done, mark workout as completed
          if (allSetsDone) {
            await prisma.workout.update({
              where: { id: workout.id },
              data: { dateCompleted: new Date() },
            });
          }
        }
      }
    }

    // Seed DayMetrics for the last 60 days
    const today = new Date();
    const dayMetricsData = [];
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      const maybeNull = (val: any) => Math.random() < 0.3 ? null : val;

      dayMetricsData.push({
        userId: user.id,
        date,
        weight: maybeNull(Number((Math.random() * 2 + 82).toFixed(1))),
        steps: maybeNull(Math.floor(Math.random() * (10000 - 2000 + 1)) + 2000),
        sleepMins: maybeNull(Math.floor(Math.random() * (540 - 360 + 1)) + 360),
        calories: maybeNull(Math.floor(Math.random() * (2500 - 1500 + 1)) + 1500),
        protein: maybeNull(Math.floor(Math.random() * 200)),
        carbs: maybeNull(Math.floor(Math.random() * 400)),
        fat: maybeNull(Math.floor(Math.random() * 100)),
        workout: Math.random() < 0.5,
      });
    }
    await prisma.dayMetric.createMany({ data: dayMetricsData });
  }

  const dbUrl = process.env.DATABASE_URL ?? "";
  const dbLoc = dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1") ? 'local' : 'neon'
  console.log(`✅ Seeded ${dbLoc} database with Plans, Weeks, Workouts (partial & full), Sets (partial & full), Events, and DayMetrics`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
