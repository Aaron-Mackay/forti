import { PrismaClient } from '@prisma/client';
import { addDays } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.exerciseSet.deleteMany();
  await prisma.workoutExercise.deleteMany();
  await prisma.workout.deleteMany();
  await prisma.week.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.user.deleteMany();

  // Seed some exercises
  const descLoremIpsum = "DESC - Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
  await prisma.exercise.createMany({
    data: [
      { name: 'Bench Press', category: 'Chest', description: descLoremIpsum },
      { name: 'Squat', category: 'Legs', description: descLoremIpsum },
      { name: 'Deadlift', category: 'Back', description: descLoremIpsum },
      { name: 'Overhead Press', category: 'Shoulders', description: descLoremIpsum },
      { name: 'Barbell Row', category: 'Back', description: descLoremIpsum },
      { name: 'Pull Ups', category: 'Back', description: descLoremIpsum },
    ],
  });

  const allExercises = await prisma.exercise.findMany();

  // Seed users and data
  for (const [index, name] of ['Alice', 'Bob'].entries()) {
    const user = await prisma.user.create({
      data: {
        name,
        email: `${name.toLowerCase()}@example.com`,
      },
    });

    for (let w = 0; w < 2; w++) {
      const start = addDays(new Date(), w * 7 + index * 14);
      const end = addDays(start, 6);

      const week = await prisma.week.create({
        data: {
          userId: user.id,
          startDate: start,
          endDate: end,
        },
      });

      for (let j = 0; j < 2; j++) {
        const workoutDate = addDays(start, j * 2);
        const workout = await prisma.workout.create({
          data: {
            weekId: week.id,
            date: workoutDate,
            name: `Workout ${j + 1}`,
            notes: j % 2 === 0 ? 'Felt strong today 💪' : null,
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

          for (let s = 0; s < 3; s++) {
            await prisma.exerciseSet.create({
              data: {
                workoutExerciseId: workoutExercise.id,
                reps: 8 + Math.floor(Math.random() * 5),
                weight: Math.round(Math.random() * 50 + 30),
              },
            });
          }
        }
      }
    }
  }

  console.log('✅ Seeded database with users, weeks, workouts, and sets');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
