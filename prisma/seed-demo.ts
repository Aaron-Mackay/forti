/**
 * seed-demo.ts — Safe prod/dev demo account refresh.
 *
 * What it does:
 *   1. Upserts the canonical exercise library (global, additive only)
 *   2. Upserts the Bob demo account (bob@example.com)
 *   3. Upserts Bob's exercise notes
 *   4. Resets Bob's events with relative dates so they are always current
 *   5. Resets Bob's plans and workouts
 *   6. Refreshes Bob's DayMetrics for the last 60 days
 *
 * What it does NOT do:
 *   - Truncate any tables
 *   - Touch Aaron or any other user
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

  const today = new Date();
  const daysAgo      = (n: number) => { const d = new Date(today); d.setDate(today.getDate() - n); return d; };
  const daysFromNow  = (n: number) => { const d = new Date(today); d.setDate(today.getDate() + n); return d; };

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

  // ─── 4. Reset events (relative dates so they're always current) ───────────
  await prisma.event.deleteMany({ where: { userId: bob.id } });
  await prisma.event.createMany({
    data: [
      // Custom event starting tomorrow — shows in "Upcoming (7 days)" dashboard card
      {
        userId:      bob.id,
        name:        'Training Week 1',
        description: "Start of Bob's program",
        startDate:   daysFromNow(1),
        endDate:     daysFromNow(7),
        eventType:   EventType.CustomEvent,
      },
      // Holiday in ~4 weeks — visible on the calendar
      {
        userId:      bob.id,
        name:        'Holiday',
        description: 'Recovery week',
        startDate:   daysFromNow(28),
        endDate:     daysFromNow(33),
        eventType:   EventType.CustomEvent,
      },
      // Active Bulk block (started 3 weeks ago, ends 5 weeks from now)
      // — shows "Active Block" card on the dashboard
      {
        userId:       bob.id,
        name:         'Bulk',
        startDate:    daysAgo(21),
        endDate:      daysFromNow(35),
        eventType:    EventType.BlockEvent,
        blockSubtype: BlockSubtype.Bulk,
      },
      // Upcoming Cut block (~8–14 weeks away) — visible in the calendar
      {
        userId:       bob.id,
        name:         'Cut',
        startDate:    daysFromNow(56),
        endDate:      daysFromNow(77),
        eventType:    EventType.BlockEvent,
        blockSubtype: BlockSubtype.Cut,
      },
      // Custom coloured event in the recent past — visible on the calendar
      {
        userId:      bob.id,
        name:        'Custom',
        startDate:   daysAgo(30),
        endDate:     daysAgo(10),
        customColor: 'red',
        eventType:   EventType.CustomEvent,
      },
    ],
  });
  console.log(`  ✓ Events reset`);

  // ─── 5. Reset plans and workouts ──────────────────────────────────────────
  // Cascade delete removes weeks → workouts → exercises → sets automatically.
  await prisma.plan.deleteMany({ where: { userId: bob.id } });

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

        // Plan 1 → Week 1 → Workout 1: deterministic exercises, always completed
        // (gives a non-zero "This Week" count on the dashboard)
        // Plan 1 → Week 1 → Workout 2: always left incomplete
        // (ensures there is always a "Next Workout" to show on the dashboard)
        const isFirstWorkout  = planIdx === 0 && weekIdx === 0 && woIdx === 0;
        const isSecondWorkout = planIdx === 0 && weekIdx === 0 && woIdx === 1;

        const selectedExercises = isFirstWorkout
          ? [findEx('Bench Press'), findEx('Squat'), findEx('Deadlift')]
          : [...allExercises].sort(() => 0.5 - Math.random()).slice(0, 2 + Math.floor(Math.random() * 2));

        let allSetsDone = true;

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
            // Second workout always has empty sets so it stays incomplete
            const done = isSecondWorkout ? false : (isFirstWorkout ? true : Math.random() < 0.7);
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
            data:  { dateCompleted: today },
          });
        }
      }
    }
  }
  console.log(`  ✓ Plans reset`);

  // ─── 6. Refresh DayMetrics ────────────────────────────────────────────────
  await prisma.dayMetric.deleteMany({ where: { userId: bob.id } });

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
