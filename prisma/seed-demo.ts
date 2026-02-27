/**
 * seed-demo.ts — Safe prod/dev demo account refresh.
 *
 * What it does:
 *   1. Upserts the canonical exercise library (global, additive only)
 *   2. Upserts the Bob demo account (bob@example.com)
 *   3. Upserts Bob's exercise notes
 *   4. Creates Bob's events and plans IF he has none (leaves existing data untouched)
 *   5. Refreshes Bob's DayMetrics for the last 60 days so the chart always has recent data
 *
 * What it does NOT do:
 *   - Truncate any tables
 *   - Touch Aaron or any other user
 *   - Modify existing plans, workouts, or events
 */

import prisma from '../src/lib/prisma';
import { BlockSubtype, EventType } from "@prisma/client";

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

const maybeNull = <T>(val: T): T | null => Math.random() < 0.3 ? null : val;

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  const isLocal = dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1");
  console.log(`🌱 Running demo seed against ${isLocal ? 'local' : 'remote (Neon)'} database…`);

  // ─── 1. Upsert exercises ───────────────────────────────────────────────────
  const descLoremIpsum = "DESC - Lorem ipsum dolor sit amet, consectetur adipiscing elit...";
  const exerciseDefs = [
    { name: 'Bench Press',    category: 'Chest' },
    { name: 'Squat',          category: 'Legs' },
    { name: 'Deadlift',       category: 'Back' },
    { name: 'Overhead Press', category: 'Shoulders' },
    { name: 'Barbell Row',    category: 'Back' },
    { name: 'Pull Ups',       category: 'Back' },
  ];

  for (const ex of exerciseDefs) {
    await prisma.exercise.upsert({
      where:  { name_category: { name: ex.name, category: ex.category } },
      update: {},
      create: { ...ex, description: descLoremIpsum },
    });
  }
  console.log(`  ✓ Exercises upserted (${exerciseDefs.length})`);

  // ─── 2. Upsert Bob ─────────────────────────────────────────────────────────
  const bob = await prisma.user.upsert({
    where:  { email: 'bob@example.com' },
    update: { name: 'Bob' },
    create: { name: 'Bob', email: 'bob@example.com' },
  });
  console.log(`  ✓ Bob upserted (id: ${bob.id})`);

  // ─── 3. Upsert exercise notes ──────────────────────────────────────────────
  const allExercises = await prisma.exercise.findMany({ orderBy: { name: 'asc' } });
  const findEx = (name: string) => allExercises.find(e => e.name === name)!;

  const noteDefs = [
    { exerciseId: findEx('Bench Press').id,    note: 'Warm up properly to protect elbow' },
    { exerciseId: findEx('Squat').id,           note: 'Squat properly' },
    { exerciseId: findEx('Overhead Press').id,  note: 'Wrench and twist' },
    { exerciseId: findEx('Barbell Row').id,     note: "Don't fall over" },
  ];

  for (const n of noteDefs) {
    await prisma.userExerciseNote.upsert({
      where:  { userId_exerciseId: { userId: bob.id, exerciseId: n.exerciseId } },
      update: {},
      create: { userId: bob.id, ...n },
    });
  }
  console.log(`  ✓ Exercise notes upserted`);

  // ─── 4a. Create events if Bob has none ────────────────────────────────────
  const existingEventCount = await prisma.event.count({ where: { userId: bob.id } });
  if (existingEventCount === 0) {
    await prisma.event.createMany({
      data: [
        {
          userId: bob.id,
          name: 'Training Week 1',
          description: "Start of Bob's program'",
          startDate: new Date('2025-06-01'),
          endDate:   new Date('2025-06-07'),
          eventType: EventType.CustomEvent,
        },
        {
          userId: bob.id,
          name: 'Holiday',
          description: 'Recovery week',
          startDate: new Date('2025-08-15'),
          endDate:   new Date('2025-08-20'),
          eventType: EventType.CustomEvent,
        },
        {
          userId: bob.id,
          name: 'Bulk',
          startDate: new Date('2025-08-01'),
          endDate:   new Date('2025-08-31'),
          eventType: EventType.BlockEvent,
          blockSubtype: BlockSubtype.Bulk,
        },
        {
          userId: bob.id,
          name: 'Cut',
          startDate: new Date('2025-09-01'),
          endDate:   new Date('2025-09-21'),
          eventType: EventType.BlockEvent,
          blockSubtype: BlockSubtype.Cut,
        },
        {
          userId: bob.id,
          name: 'Custom',
          startDate:   new Date('2025-07-01'),
          endDate:     new Date('2025-07-21'),
          customColor: 'red',
          eventType:   EventType.CustomEvent,
        },
      ],
    });
    console.log(`  ✓ Events created`);
  } else {
    console.log(`  – Events skipped (Bob already has ${existingEventCount})`);
  }

  // ─── 4b. Create plans/workouts if Bob has none ────────────────────────────
  const existingPlanCount = await prisma.plan.count({ where: { userId: bob.id } });
  if (existingPlanCount === 0) {
    const planCount = 2;
    for (let planIdx = 0; planIdx < planCount; planIdx++) {
      const plan = await prisma.plan.create({
        data: {
          userId:      bob.id,
          order:       planIdx + 1,
          name:        `Bob's Plan ${planIdx + 1}`,
          description: `Training block ${planIdx + 1} for Bob`,
        },
      });

      const weekCount = 2 + planIdx; // 2 weeks in Plan 1, 3 in Plan 2
      for (let weekIdx = 0; weekIdx < weekCount; weekIdx++) {
        const week = await prisma.week.create({
          data: { planId: plan.id, order: weekIdx + 1 },
        });

        for (let woIdx = 0; woIdx < 2; woIdx++) {
          const workout = await prisma.workout.create({
            data: {
              weekId: week.id,
              name:   `Workout ${woIdx + 1} (Plan ${planIdx + 1} - Week ${weekIdx + 1})`,
              notes:  woIdx % 2 === 0 ? 'Felt strong today 💪' : null,
              order:  woIdx + 1,
            },
          });

          let allSetsDone = true;

          // First workout is deterministic so E2E tests that look for specific
          // exercises in Plan 1 → Week 1 → Workout 1 are stable.
          const isFirstWorkout = planIdx === 0 && weekIdx === 0 && woIdx === 0;
          const selectedExercises = isFirstWorkout
            ? [findEx('Bench Press'), findEx('Squat'), findEx('Deadlift')]
            : [...allExercises].sort(() => 0.5 - Math.random()).slice(0, 2 + Math.floor(Math.random() * 2));

          for (let i = 0; i < selectedExercises.length; i++) {
            const workoutExercise = await prisma.workoutExercise.create({
              data: {
                workoutId:  workout.id,
                exerciseId: selectedExercises[i].id,
                order:      i + 1,
                restTime:   "90",
                repRange:   "8-12",
              },
            });

            const setCount = Math.floor(randomBetween(2, 5));
            let exerciseHasDoneSets = false;

            for (let s = 0; s < setCount; s++) {
              const done = Math.random() < 0.7;
              if (done) exerciseHasDoneSets = true;
              await prisma.exerciseSet.create({
                data: {
                  workoutExerciseId: workoutExercise.id,
                  order:  s + 1,
                  reps:   done ? 8 + Math.floor(Math.random() * 5) : null,
                  weight: done ? (Math.round(Math.random() * 50 + 30)).toString() : null,
                },
              });
            }

            if (!exerciseHasDoneSets) allSetsDone = false;
          }

          if (allSetsDone) {
            await prisma.workout.update({
              where: { id: workout.id },
              data:  { dateCompleted: new Date() },
            });
          }
        }
      }
    }
    console.log(`  ✓ Plans created`);
  } else {
    console.log(`  – Plans skipped (Bob already has ${existingPlanCount})`);
  }

  // ─── 5. Refresh DayMetrics ────────────────────────────────────────────────
  await prisma.dayMetric.deleteMany({ where: { userId: bob.id } });

  const today = new Date();
  await prisma.dayMetric.createMany({
    data: Array.from({ length: 60 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      return {
        userId:    bob.id,
        date,
        weight:    maybeNull(Number((randomBetween(82, 84)).toFixed(1))),
        steps:     maybeNull(Math.floor(randomBetween(2000, 10000))),
        sleepMins: maybeNull(Math.floor(randomBetween(360, 540))),
        calories:  maybeNull(Math.floor(randomBetween(1500, 2500))),
        protein:   maybeNull(Math.floor(Math.random() * 200)),
        carbs:     maybeNull(Math.floor(Math.random() * 400)),
        fat:       maybeNull(Math.floor(Math.random() * 100)),
        workout:   Math.random() < 0.5,
      };
    }),
  });
  console.log(`  ✓ DayMetrics refreshed (60 days)`);

  console.log(`\n✅ Demo seed complete`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
