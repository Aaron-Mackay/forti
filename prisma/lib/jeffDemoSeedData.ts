/**
 * Shared seeding logic for the Jeff Demo public demo account.
 *
 * Used by both seed.ts (full reset, today's date for live data) and
 * seed-demo.ts (prod/dev refresh, real today date).
 *
 * Callers are responsible for ensuring the user and exercises already exist
 * in the DB before calling seedJeffDemoData.
 */

import prisma from '../../src/lib/prisma';
import { BlockSubtype, EventType } from '@prisma/client';

// ─── Exercise definitions ──────────────────────────────────────────────────

export const EXERCISE_DESCRIPTION =
  'DESC - Lorem ipsum dolor sit amet, consectetur adipiscing elit...';

export const EXERCISE_DEFS: Array<{ name: string; category: string }> = [
  { name: 'Bench Press',    category: 'Chest' },
  { name: 'Squat',          category: 'Legs' },
  { name: 'Deadlift',       category: 'Back' },
  { name: 'Overhead Press', category: 'Shoulders' },
  { name: 'Barbell Row',    category: 'Back' },
  { name: 'Pull Ups',       category: 'Back' },
];

// ─── Plan structure ────────────────────────────────────────────────────────

// Week 1 of each plan is always completed so "Next Workout" (Week 2, Workout A)
// always has previous sets filled in. Each plan repeats the same two workout
// templates across all its weeks so previous-set data is consistent.
const PLAN_TEMPLATES = [
  {
    name:        "Jeff's Plan 1",
    description: 'Training block 1 for Jeff',
    weekCount:   2,
    workoutTemplates: [
      { name: 'Workout A', exercises: ['Bench Press', 'Squat', 'Deadlift', 'Treadmill'] },
      { name: 'Workout B', exercises: ['Overhead Press', 'Barbell Row', 'Pull Ups'] },
    ],
    // How many days ago each Week-1 workout was completed
    // (Workout A before Workout B, staggered by 2 days)
    completionDaysAgo: [4, 2],
  },
  {
    name:        "Jeff's Plan 2",
    description: 'Training block 2 for Jeff',
    weekCount:   3,
    workoutTemplates: [
      { name: 'Workout A', exercises: ['Squat', 'Barbell Row', 'Bench Press'] },
      { name: 'Workout B', exercises: ['Deadlift', 'Pull Ups', 'Overhead Press'] },
    ],
    completionDaysAgo: [11, 9],
  },
];

// Realistic base weights/reps for Week-1 sets so previous-set cards look genuine
const EXERCISE_BASES: Record<string, { weight: number; reps: number }> = {
  'Bench Press':    { weight: 80,  reps: 8 },
  'Squat':          { weight: 100, reps: 5 },
  'Deadlift':       { weight: 120, reps: 5 },
  'Overhead Press': { weight: 55,  reps: 8 },
  'Barbell Row':    { weight: 75,  reps: 8 },
  'Pull Ups':       { weight: 0,   reps: 8 }, // bodyweight
};

// ─── Main export ───────────────────────────────────────────────────────────

/**
 * Resets and recreates all of Jeff Demo's data relative to `today`.
 * Safe to call after a full TRUNCATE (deleteMany is a no-op) or against
 * an existing DB (deleteMany cleans up first).
 */
export async function seedJeffDemoData(user: { id: string }, today: Date): Promise<void> {
  const daysAgo     = (n: number) => { const d = new Date(today); d.setDate(today.getDate() - n); return d; };
  const daysFromNow = (n: number) => { const d = new Date(today); d.setDate(today.getDate() + n); return d; };
  const maybeNull   = <T>(val: T): T | null => Math.random() < 0.3 ? null : val;

  const allExercises = await prisma.exercise.findMany({ orderBy: { name: 'asc' } });
  const findEx = (name: string) => allExercises.find(e => e.name === name)!;

  // ── Exercise notes ────────────────────────────────────────────────────────
  const noteDefs = [
    { exerciseId: findEx('Bench Press').id,    note: 'Warm up properly to protect elbow' },
    { exerciseId: findEx('Squat').id,           note: 'Squat properly' },
    { exerciseId: findEx('Overhead Press').id,  note: 'Wrench and twist' },
    { exerciseId: findEx('Barbell Row').id,     note: "Don't fall over" },
  ];
  for (const n of noteDefs) {
    await prisma.userExerciseNote.upsert({
      where:  { userId_exerciseId: { userId: user.id, exerciseId: n.exerciseId } },
      update: {},
      create: { userId: user.id, ...n },
    });
  }

  // ── Events ────────────────────────────────────────────────────────────────
  await prisma.event.deleteMany({ where: { userId: user.id } });
  await prisma.event.createMany({
    data: [
      // Active Bulk block (started 3 weeks ago, ends 5 weeks from now)
      // → shows "Active Block" card on the dashboard
      {
        userId:       user.id,
        name:         'Bulk',
        startDate:    daysAgo(21),
        endDate:      daysFromNow(35),
        eventType:    EventType.BlockEvent,
        blockSubtype: BlockSubtype.Bulk,
      },
      // Upcoming Cut block (~8–11 weeks away) → visible on the calendar
      {
        userId:       user.id,
        name:         'Cut',
        startDate:    daysFromNow(56),
        endDate:      daysFromNow(77),
        eventType:    EventType.BlockEvent,
        blockSubtype: BlockSubtype.Cut,
      },
      // Single-day event tomorrow → shows in "Upcoming (7 days)" dashboard card
      {
        userId:    user.id,
        name:      'Manchester 10k',
        startDate: daysFromNow(1),
        endDate:   daysFromNow(1),
        eventType: EventType.CustomEvent,
      },
      // Holiday in ~4 weeks → visible on the calendar
      {
        userId:      user.id,
        name:        'Holiday',
        description: 'Recovery week',
        startDate:   daysFromNow(28),
        endDate:     daysFromNow(33),
        eventType:   EventType.CustomEvent,
      },
      // Custom coloured event in the recent past → visible on the calendar
      {
        userId:      user.id,
        name:        'Custom',
        startDate:   daysAgo(30),
        endDate:     daysAgo(10),
        customColor: 'red',
        eventType:   EventType.CustomEvent,
      },
    ],
  });

  // ── Plans and workouts ────────────────────────────────────────────────────
  // Cascade delete removes weeks → workouts → exercises → sets automatically.
  await prisma.plan.deleteMany({ where: { userId: user.id } });

  for (let planIdx = 0; planIdx < PLAN_TEMPLATES.length; planIdx++) {
    const template = PLAN_TEMPLATES[planIdx];

    const plan = await prisma.plan.create({
      data: {
        userId:      user.id,
        order:       planIdx + 1,
        name:        template.name,
        description: template.description,
      },
    });

    for (let weekIdx = 0; weekIdx < template.weekCount; weekIdx++) {
      const isFirstWeek = weekIdx === 0;

      const week = await prisma.week.create({
        data: { planId: plan.id, order: weekIdx + 1 },
      });

      for (let woIdx = 0; woIdx < template.workoutTemplates.length; woIdx++) {
        const wo = template.workoutTemplates[woIdx];

        const workout = await prisma.workout.create({
          data: {
            weekId: week.id,
            name:   wo.name,
            notes:  woIdx % 2 === 0 ? 'Felt strong today 💪' : null,
            order:  woIdx + 1,
          },
        });

        for (let i = 0; i < wo.exercises.length; i++) {
          const exerciseName = wo.exercises[i];
          const exerciseRecord = findEx(exerciseName);
          const isCardio = exerciseRecord.category === 'cardio';
          const base = EXERCISE_BASES[exerciseName] ?? { weight: 60, reps: 8 };

          const workoutExercise = await prisma.workoutExercise.create({
            data: {
              workoutId:       workout.id,
              exerciseId:      exerciseRecord.id,
              order:           i + 1,
              restTime:        isCardio ? null : '90',
              repRange:        isCardio ? null : '8-12',
              // Seed cardio data for completed (Week 1) workouts
              cardioDuration:  isCardio && isFirstWeek ? 30 : null,
              cardioDistance:  isCardio && isFirstWeek ? 5 : null,
              cardioResistance: isCardio && isFirstWeek ? 3 : null,
            },
          });

          if (!isCardio) {
            // 3 sets per resistance exercise; Week 1 filled in, subsequent weeks empty
            let thirdSetId: number | null = null;
            for (let s = 0; s < 3; s++) {
              const createdSet = await prisma.exerciseSet.create({
                data: {
                  workoutExerciseId: workoutExercise.id,
                  order:  s + 1,
                  reps:   isFirstWeek ? base.reps : null,
                  weight: isFirstWeek && base.weight > 0 ? base.weight : null,
                },
              });
              if (s === 2) thirdSetId = createdSet.id;
            }

            // Add drop set(s) on the last regular set for the first resistance exercise
            // in completed (Week 1) workouts, where there's a meaningful weight to drop from
            if (isFirstWeek && i === 0 && base.weight > 0 && thirdSetId !== null) {
              const drop1Weight = Math.round(base.weight * 0.8 / 2.5) * 2.5;
              const drop1 = await prisma.exerciseSet.create({
                data: {
                  workoutExerciseId: workoutExercise.id,
                  order:        4,
                  reps:         base.reps + 2,
                  weight:       drop1Weight,
                  isDropSet:    true,
                  parentSetId:  thirdSetId,
                },
              });

              // Add a second drop on Plan 2 to demonstrate chained drops
              if (planIdx === 1) {
                const drop2Weight = Math.round(drop1.weight! * 0.8 / 2.5) * 2.5;
                await prisma.exerciseSet.create({
                  data: {
                    workoutExerciseId: workoutExercise.id,
                    order:        5,
                    reps:         base.reps + 4,
                    weight:       drop2Weight,
                    isDropSet:    true,
                    parentSetId:  thirdSetId,
                  },
                });
              }
            }
          }
        }

        // Mark Week-1 workouts as completed on their staggered past dates
        if (isFirstWeek) {
          await prisma.workout.update({
            where: { id: workout.id },
            data:  { dateCompleted: daysAgo(template.completionDaysAgo[woIdx]) },
          });
        }
      }
    }
  }

  // ── Day metrics ───────────────────────────────────────────────────────────
  await prisma.dayMetric.deleteMany({ where: { userId: user.id } });

  await prisma.dayMetric.createMany({
    data: Array.from({ length: 60 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      return {
        userId:    user.id,
        date,
        weight:    maybeNull(Number((84 - i * 0.03 + (Math.random() - 0.5)).toFixed(1))),
        steps:     maybeNull(Math.floor(84 - i * 0.03 + (Math.random() - 0.5) * 3000 + 7000)),
        sleepMins: maybeNull(Math.floor(Math.random() * (540 - 360 + 1)) + 360),
        calories:  maybeNull(Math.floor(Math.random() * (2500 - 1500 + 1)) + 1500),
        protein:   maybeNull(Math.floor(Math.random() * 200)),
        carbs:     maybeNull(Math.floor(Math.random() * 400)),
        fat:       maybeNull(Math.floor(Math.random() * 100)),
      };
    }),
  });
}
