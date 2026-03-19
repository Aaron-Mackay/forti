/**
 * seed-demo.ts — Safe prod/dev demo account refresh.
 *
 * What it does:
 *   1. Upserts the canonical exercise library (global, additive only)
 *   2. Upserts the Jeff Demo account (jeff@example.com)
 *   3. Resets all of Jeff's data with dates relative to today
 *
 * What it does NOT do:
 *   - Truncate any tables
 *   - Touch any user other than Jeff Demo
 */

import prisma from '../src/lib/prisma';
import { EXERCISE_DESCRIPTION, seedJeffDemoData } from './lib/jeffDemoSeedData';
import {EXERCISE_EQUIPMENT, EXERCISE_MUSCLES, SeedExercise} from "../src/types/dataTypes";
import exercisesData from './exercises.json';
import { computeE1rm } from '../src/lib/e1rm';

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

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? '';
  const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
  console.log(`🌱 Running demo seed against ${isLocal ? 'local' : 'remote (Neon)'} database…`);

  // Upsert exercises (global, safe to run at any time)
  validateExercises(exercises);
  for (const ex of exercises) {
    await prisma.exercise.upsert({
      where:  { name_category: { name: ex.name, category: ex.category } },
      update: {
        equipment:        ex.equipment,
        primaryMuscles:   ex.primaryMuscles,
        secondaryMuscles: ex.secondaryMuscles ?? [],
        description:      ex.description ?? EXERCISE_DESCRIPTION,
      },
      create: { ...ex, description: ex.description ?? EXERCISE_DESCRIPTION },
    });
  }
  console.log(`  ✓ Exercises upserted`);

  // Upsert Jeff Demo
  const jeff = await prisma.user.upsert({
    where:  { email: 'jeff@example.com' },
    update: { name: 'Jeff Demo' },
    create: { name: 'Jeff Demo', email: 'jeff@example.com' },
  });
  console.log(`  ✓ Jeff Demo upserted (id: ${jeff.id})`);

  // Reset all of Jeff's data relative to today
  await seedJeffDemoData(jeff, new Date());
  console.log('  ✓ Jeff Demo\'s data reset');

  // Backfill e1rm for all of Jeff's sets
  const jeffSets = await prisma.exerciseSet.findMany({
    where: { workoutExercise: { workout: { week: { plan: { userId: jeff.id } } } } },
    select: { id: true, weight: true, reps: true },
  });
  for (const set of jeffSets) {
    await prisma.exerciseSet.update({ where: { id: set.id }, data: { e1rm: computeE1rm(set.weight, set.reps) } });
  }
  console.log(`  ✓ e1rm backfilled (${jeffSets.length} sets)`);

  console.log('\n✅ Demo seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
