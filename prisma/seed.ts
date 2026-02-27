import prisma from '../src/lib/prisma';
import { EXERCISE_DEFS, EXERCISE_DESCRIPTION, seedBobData } from './lib/bobSeedData';

async function main() {
  // Clear existing data
  await prisma.$executeRawUnsafe(`
    TRUNCATE "ExerciseSet", "WorkoutExercise", "Exercise", "Workout", "Week", "Plan", "User", "Event", "UserExerciseNote", "DayMetric", "Account", "Session"
    CASCADE
  `);

  // Seed exercises
  await prisma.exercise.createMany({
    data: EXERCISE_DEFS.map(ex => ({ ...ex, description: EXERCISE_DESCRIPTION })),
  });

  // Create Bob (the demo login user)
  const bob = await prisma.user.create({
    data: { name: 'Bob', email: 'bob@example.com' },
  });

  // Seed all of Bob's data. A fixed past date is used so E2E tests running
  // against real-today (~2026) see no active blocks and no upcoming events.
  await seedBobData(bob, new Date('2024-06-01'));

  const dbUrl = process.env.DATABASE_URL ?? '';
  const dbLoc = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? 'local' : 'neon';
  console.log(`✅ Seeded ${dbLoc} database`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
