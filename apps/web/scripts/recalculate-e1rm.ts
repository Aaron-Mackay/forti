/**
 * Backfill script: recalculates e1rm for every row in ExerciseSet.
 *
 * Usage:
 *   npm run recalculate-e1rm
 *
 * Safe to run multiple times — idempotent.
 */

import {PrismaClient} from '@prisma/client';
import {computeE1rm} from '../src/lib/e1rm';

const prisma = new PrismaClient();

async function main() {
  const sets = await prisma.exerciseSet.findMany({
    select: {id: true, weight: true, reps: true},
  });

  console.log(`Found ${sets.length} sets. Recalculating e1rm...`);

  let updated = 0;
  for (const set of sets) {
    const e1rm = computeE1rm(set.weight, set.reps);
    await prisma.exerciseSet.update({
      where: {id: set.id},
      data: {e1rm},
    });
    updated++;
  }

  console.log(`Done. Updated ${updated} sets.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
