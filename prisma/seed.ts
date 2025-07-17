import prisma from '../src/lib/prisma';
import {EventType} from "@prisma/client";

function getRandomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

async function main() {
  // Clear existing stateData
  await prisma.$executeRawUnsafe(`
  TRUNCATE "ExerciseSet", "WorkoutExercise", "Exercise", "Workout", "Week", "User", "Event", "UserExerciseNote", "DayMetric"
  RESTART IDENTITY CASCADE
`);


  // Seed some exercises
  const descLoremIpsum = "DESC - Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
  await prisma.exercise.createMany({
    data: [
      {name: 'Bench Press', category: 'Chest', description: descLoremIpsum},
      {name: 'Squat', category: 'Legs', description: descLoremIpsum},
      {name: 'Deadlift', category: 'Back', description: descLoremIpsum},
      {name: 'Overhead Press', category: 'Shoulders', description: descLoremIpsum},
      {name: 'Barbell Row', category: 'Back', description: descLoremIpsum},
      {name: 'Pull Ups', category: 'Back', description: descLoremIpsum},
    ],
  });

  const allExercises = await prisma.exercise.findMany();

  // Seed users and stateData
  for (const [_index, name] of ['Aaron', 'Bob'].entries()) {
    const user = await prisma.user.create({
      data: {
        name,
        email: `${name.toLowerCase()}@example.com`,
      },
    });

    await prisma.userExerciseNote.createMany({
      data: [
        {userId: user.id, exerciseId: allExercises[0].id, note: 'Warm up properly to protect elbow'},
        {userId: user.id, exerciseId: allExercises[1].id, note: 'Squat properly'},
        {userId: user.id, exerciseId: allExercises[3].id, note: 'Wrench and twist'},
        {userId: user.id, exerciseId: allExercises[4].id, note: 'Dont fall over'},
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
          eventType: EventType.BlockEvent
        },
        {
          userId: user.id,
          name: 'Cut',
          startDate: new Date('2025-09-01'),
          endDate: new Date('2025-09-21'),
          eventType: EventType.BlockEvent
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
    })

    for (let weekIdx = 0; weekIdx < 2; weekIdx++) {


      const week = await prisma.week.create({
        data: {
          userId: user.id,
          order: weekIdx + 1
        },
      });

      for (let woIdx = 0; woIdx < 2; woIdx++) {
        const workout = await prisma.workout.create({
          data: {
            weekId: week.id,
            name: `Workout name ${woIdx + 1}`,
            notes: woIdx % 2 === 0 ? 'Felt strong today 💪' : null,
            order: woIdx + 1
          },
        });

        const selectedExercises = allExercises
          .sort(() => 0.5 - Math.random())
          .slice(0, 2 + Math.floor(Math.random() * 2)); // 2–3 exercises

        for (let i = 0; i < selectedExercises.length; i++) {
          const exercise = selectedExercises[i];

          const workoutExercise = await prisma.workoutExercise.create({
            data: {
              workoutId: workout.id,
              exerciseId: exercise.id,
              order: i + 1,
              restTime: "90",
              repRange: "8-12"
            },
          });

          for (let s = 0; s < getRandomBetween(1, 5); s++) {
            await prisma.exerciseSet.create({
              data: {
                workoutExerciseId: workoutExercise.id,
                order: s + 1,
                reps: 8 + Math.floor(Math.random() * 5),
                weight: (Math.round(Math.random() * 50 + 30)).toString(),
              },
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

      // Helper to randomly set null ~30% of the time
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

  console.log('✅ Seeded database with exercises, users, events, notes, weeks, workouts, sets, daymetrics');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
