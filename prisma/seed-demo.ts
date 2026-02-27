/**
 * seed-demo.ts — Safe prod/dev demo account refresh.
 *
 * What it does:
 *   1. Upserts the canonical exercise library (global, additive only)
 *   2. Upserts the Bob demo account (bob@example.com)
 *   3. Resets all of Bob's data with dates relative to today
 *
 * What it does NOT do:
 *   - Truncate any tables
 *   - Touch any user other than Bob
 */

import prisma from '../src/lib/prisma';
import { EXERCISE_DEFS, EXERCISE_DESCRIPTION, seedBobData } from './lib/bobSeedData';

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? '';
  const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
  console.log(`🌱 Running demo seed against ${isLocal ? 'local' : 'remote (Neon)'} database…`);

  // Upsert exercises (global, safe to run at any time)
  for (const ex of EXERCISE_DEFS) {
    await prisma.exercise.upsert({
      where:  { name_category: { name: ex.name, category: ex.category } },
      update: {},
      create: { ...ex, description: EXERCISE_DESCRIPTION },
    });
  }
  console.log(`  ✓ Exercises upserted (${EXERCISE_DEFS.length})`);

  // Upsert Bob
  const bob = await prisma.user.upsert({
    where:  { email: 'bob@example.com' },
    update: { name: 'Bob' },
    create: { name: 'Bob', email: 'bob@example.com' },
  });
  console.log(`  ✓ Bob upserted (id: ${bob.id})`);

  // Reset all of Bob's data relative to today
  await seedBobData(bob, new Date());
  console.log('  ✓ Bob\'s data reset');

  console.log('\n✅ Demo seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
