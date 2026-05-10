import { Prisma, ExerciseCategory } from '@/generated/prisma/browser';
import { computeE1rm } from '@lib/e1rm';
import { findOrCreateExercise } from '@lib/exerciseQueries';
import { z } from 'zod';
import { PlanInputSchema } from '@/lib/planSchemas';

type PlanInput = z.infer<typeof PlanInputSchema>;
type WeekInput = PlanInput['weeks'][number];
type WorkoutInput = WeekInput['workouts'][number];
type ExerciseInput = WorkoutInput['exercises'][number];
type SetInput = ExerciseInput['sets'][number];

type ExistingTree = {
  plans: Array<{
    id: number;
    clientCanEdit: boolean;
    weeks: Array<{
      id: number;
      planId: number;
      workouts: Array<{
        id: number;
        weekId: number;
        exercises: Array<{
          id: number;
          workoutId: number;
          sets: Array<{ id: number; isDropSet: boolean }>;
        }>;
      }>;
    }>;
  }>;
};

interface SyncOptions {
  actorIsAssignedCoach: boolean;
}

/**
 * Syncs the user's full plan tree against the incoming structure.
 *
 * Matches incoming entities to existing rows by id at every level. Updates
 * matched rows in place, inserts new ones, and deletes only entities no
 * longer present in the incoming tree. ExerciseSet IDs are preserved
 * across saves so external references (e.g. set-level notes) remain
 * stable, and the write volume drops from "rewrite the whole tree" to
 * "touch only what changed".
 *
 * Drop-set parent links are remapped after regular sets are processed,
 * so a newly-created regular set can be referenced by a drop set in the
 * same save.
 */
export async function syncPlanTree(
  tx: Prisma.TransactionClient,
  userId: string,
  incomingPlans: PlanInput[],
  options: SyncOptions,
): Promise<void> {
  const existing: ExistingTree = await loadExistingTree(tx, userId);

  const kept = {
    plans: new Set<number>(),
    weeks: new Set<number>(),
    workouts: new Set<number>(),
    workoutExercises: new Set<number>(),
    sets: new Set<number>(),
  };

  for (const incomingPlan of incomingPlans) {
    const existingPlan = incomingPlan.id != null
      ? existing.plans.find((p) => p.id === incomingPlan.id)
      : undefined;
    const lockedForClient = !!existingPlan && existingPlan.clientCanEdit === false && !options.actorIsAssignedCoach;

    if (existingPlan && lockedForClient) {
      kept.plans.add(existingPlan.id);
      keepExistingPlanTree(existingPlan, kept);
      continue;
    }

    let planId: number;
    if (existingPlan) {
      const updated = await tx.plan.update({
        where: { id: existingPlan.id },
        data: {
          order: incomingPlan.order,
          name: incomingPlan.name,
          description: incomingPlan.description ?? null,
          clientCanEdit: incomingPlan.clientCanEdit ?? true,
        },
        select: { id: true },
      });
      planId = updated.id;
    } else {
      const created = await tx.plan.create({
        data: {
          userId,
          order: incomingPlan.order,
          name: incomingPlan.name,
          description: incomingPlan.description ?? null,
          clientCanEdit: incomingPlan.clientCanEdit ?? true,
        },
        select: { id: true },
      });
      planId = created.id;
    }
    kept.plans.add(planId);

    await syncWeeks(tx, planId, incomingPlan.weeks, existingPlan?.weeks ?? [], kept, userId, options);
  }

  await deleteUntrackedRows(tx, userId, kept);
}

async function loadExistingTree(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<ExistingTree> {
  const plans = await tx.plan.findMany({
    where: { userId },
    select: {
      id: true,
      clientCanEdit: true,
      weeks: {
        select: {
          id: true,
          planId: true,
          workouts: {
            select: {
              id: true,
              weekId: true,
              exercises: {
                select: {
                  id: true,
                  workoutId: true,
                  sets: { select: { id: true, isDropSet: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  return { plans };
}

function keepExistingPlanTree(existingPlan: ExistingTree['plans'][number], kept: {
  plans: Set<number>;
  weeks: Set<number>;
  workouts: Set<number>;
  workoutExercises: Set<number>;
  sets: Set<number>;
}) {
  for (const week of existingPlan.weeks) {
    kept.weeks.add(week.id);
    for (const workout of week.workouts) {
      kept.workouts.add(workout.id);
      for (const exercise of workout.exercises) {
        kept.workoutExercises.add(exercise.id);
        for (const set of exercise.sets) {
          kept.sets.add(set.id);
        }
      }
    }
  }
}

async function syncWeeks(
  tx: Prisma.TransactionClient,
  planId: number,
  incomingWeeks: WeekInput[],
  existingWeeks: ExistingTree['plans'][number]['weeks'],
  kept: Kept,
  userId: string,
  options: SyncOptions,
): Promise<void> {
  for (const incomingWeek of incomingWeeks) {
    const existingWeek = incomingWeek.id != null
      ? existingWeeks.find((w) => w.id === incomingWeek.id && w.planId === planId)
      : undefined;

    let weekId: number;
    if (existingWeek) {
      const updated = await tx.week.update({
        where: { id: existingWeek.id },
        data: { order: incomingWeek.order, planId },
        select: { id: true },
      });
      weekId = updated.id;
    } else {
      const created = await tx.week.create({
        data: { order: incomingWeek.order, planId },
        select: { id: true },
      });
      weekId = created.id;
    }
    kept.weeks.add(weekId);

    await syncWorkouts(tx, weekId, incomingWeek.workouts, existingWeek?.workouts ?? [], kept, userId, options);
  }
}

async function syncWorkouts(
  tx: Prisma.TransactionClient,
  weekId: number,
  incomingWorkouts: WorkoutInput[],
  existingWorkouts: ExistingTree['plans'][number]['weeks'][number]['workouts'],
  kept: Kept,
  userId: string,
  options: SyncOptions,
): Promise<void> {
  for (const incomingWorkout of incomingWorkouts) {
    const existingWorkout = incomingWorkout.id != null
      ? existingWorkouts.find((w) => w.id === incomingWorkout.id && w.weekId === weekId)
      : undefined;

    const workoutData = {
      name: incomingWorkout.name,
      notes: incomingWorkout.notes ?? null,
      order: incomingWorkout.order,
      dateCompleted: incomingWorkout.dateCompleted ? new Date(incomingWorkout.dateCompleted) : null,
    };

    let workoutId: number;
    if (existingWorkout) {
      const updated = await tx.workout.update({
        where: { id: existingWorkout.id },
        data: { ...workoutData, weekId },
        select: { id: true },
      });
      workoutId = updated.id;
    } else {
      const created = await tx.workout.create({
        data: { ...workoutData, weekId },
        select: { id: true },
      });
      workoutId = created.id;
    }
    kept.workouts.add(workoutId);

    await syncWorkoutExercises(tx, workoutId, incomingWorkout.exercises, existingWorkout?.exercises ?? [], kept, userId, options);
  }
}

async function syncWorkoutExercises(
  tx: Prisma.TransactionClient,
  workoutId: number,
  incomingExercises: ExerciseInput[],
  existingExercises: ExistingTree['plans'][number]['weeks'][number]['workouts'][number]['exercises'],
  kept: Kept,
  userId: string,
  options: SyncOptions,
): Promise<void> {
  for (const incomingExercise of incomingExercises) {
    const existingExercise = incomingExercise.id != null
      ? existingExercises.find((e) => e.id === incomingExercise.id && e.workoutId === workoutId)
      : undefined;

    const requiresRecording = options.actorIsAssignedCoach
      ? (incomingExercise.requiresRecording ?? false)
      : false;

    const globalExercise = await findOrCreateExercise(
      tx,
      incomingExercise.exercise.name,
      (incomingExercise.exercise.category as ExerciseCategory | null) ?? null,
      userId,
    );

    const exerciseData = {
      exerciseId: globalExercise.id,
      order: incomingExercise.order,
      repRange: incomingExercise.repRange,
      restTime: incomingExercise.restTime,
      notes: incomingExercise.notes,
      isBfr: incomingExercise.isBfr ?? false,
      requiresRecording,
    };

    let workoutExerciseId: number;
    let existingSets: ExistingTree['plans'][number]['weeks'][number]['workouts'][number]['exercises'][number]['sets'] = [];

    if (existingExercise) {
      const updated = await tx.workoutExercise.update({
        where: { id: existingExercise.id },
        data: { ...exerciseData, workoutId },
        select: { id: true },
      });
      workoutExerciseId = updated.id;
      existingSets = existingExercise.sets;
    } else {
      const created = await tx.workoutExercise.create({
        data: { ...exerciseData, workoutId },
        select: { id: true },
      });
      workoutExerciseId = created.id;
    }
    kept.workoutExercises.add(workoutExerciseId);

    await syncSets(tx, workoutExerciseId, incomingExercise.sets, existingSets, kept);
  }
}

async function syncSets(
  tx: Prisma.TransactionClient,
  workoutExerciseId: number,
  incomingSets: SetInput[],
  existingSets: Array<{ id: number; isDropSet: boolean }>,
  kept: Kept,
): Promise<void> {
  // Process regular sets first so drop sets can resolve their parentSetId
  // against the (now stable) regular set ids in the same save.
  const regularSets = incomingSets.filter((s) => !s.isDropSet);
  const dropSets = incomingSets.filter((s) => s.isDropSet);

  // request id (from input) -> db id (existing or newly created)
  const idMap = new Map<number, number>();

  // Update existing regular sets, batch-create new ones.
  const newRegularInputs: SetInput[] = [];
  for (const incomingSet of regularSets) {
    const existingSet = incomingSet.id != null
      ? existingSets.find((s) => s.id === incomingSet.id)
      : undefined;

    if (existingSet) {
      await tx.exerciseSet.update({
        where: { id: existingSet.id },
        data: regularSetUpdateData(incomingSet),
      });
      if (incomingSet.id != null) idMap.set(incomingSet.id, existingSet.id);
      kept.sets.add(existingSet.id);
    } else {
      newRegularInputs.push(incomingSet);
    }
  }

  if (newRegularInputs.length > 0) {
    const created = await tx.exerciseSet.createManyAndReturn({
      data: newRegularInputs.map((s) => regularSetCreateData(workoutExerciseId, s)),
    });
    newRegularInputs.forEach((s, i) => {
      if (s.id != null) idMap.set(s.id, created[i].id);
      kept.sets.add(created[i].id);
    });
  }

  // Drop sets: update existing, batch-create new with resolved parent ids.
  const newDropData: Prisma.ExerciseSetCreateManyInput[] = [];
  for (const incomingSet of dropSets) {
    const existingSet = incomingSet.id != null
      ? existingSets.find((s) => s.id === incomingSet.id)
      : undefined;

    const resolvedParentSetId = incomingSet.parentSetId != null
      ? (idMap.get(incomingSet.parentSetId) ?? null)
      : null;

    if (existingSet) {
      await tx.exerciseSet.update({
        where: { id: existingSet.id },
        data: dropSetUpdateData(incomingSet, resolvedParentSetId),
      });
      kept.sets.add(existingSet.id);
    } else {
      newDropData.push(dropSetCreateData(workoutExerciseId, incomingSet, resolvedParentSetId));
    }
  }

  if (newDropData.length > 0) {
    const created = await tx.exerciseSet.createManyAndReturn({ data: newDropData });
    for (const s of created) kept.sets.add(s.id);
  }
}

function regularSetUpdateData(set: SetInput): Prisma.ExerciseSetUpdateInput {
  return {
    weight: set.weight ?? null,
    reps: set.reps ?? null,
    order: set.order,
    isDropSet: false,
    parentSet: { disconnect: true },
    e1rm: computeE1rm(set.weight, set.reps),
  };
}

function regularSetCreateData(
  workoutExerciseId: number,
  set: SetInput,
): Prisma.ExerciseSetCreateManyInput {
  return {
    workoutExerciseId,
    weight: set.weight ?? null,
    reps: set.reps ?? null,
    order: set.order,
    isDropSet: false,
    parentSetId: null,
    e1rm: computeE1rm(set.weight, set.reps),
  };
}

function dropSetUpdateData(
  set: SetInput,
  resolvedParentSetId: number | null,
): Prisma.ExerciseSetUpdateInput {
  return {
    weight: set.weight ?? null,
    reps: set.reps ?? null,
    order: set.order,
    isDropSet: true,
    parentSet: resolvedParentSetId != null
      ? { connect: { id: resolvedParentSetId } }
      : { disconnect: true },
    e1rm: computeE1rm(set.weight, set.reps),
  };
}

function dropSetCreateData(
  workoutExerciseId: number,
  set: SetInput,
  resolvedParentSetId: number | null,
): Prisma.ExerciseSetCreateManyInput {
  return {
    workoutExerciseId,
    weight: set.weight ?? null,
    reps: set.reps ?? null,
    order: set.order,
    isDropSet: true,
    parentSetId: resolvedParentSetId,
    e1rm: computeE1rm(set.weight, set.reps),
  };
}

async function deleteUntrackedRows(
  tx: Prisma.TransactionClient,
  userId: string,
  kept: Kept,
): Promise<void> {
  // Leaves first to keep cascades happy.
  await tx.exerciseSet.deleteMany({
    where: {
      workoutExercise: { workout: { week: { plan: { userId } } } },
      ...(kept.sets.size > 0 ? { id: { notIn: Array.from(kept.sets) } } : {}),
    },
  });
  await tx.workoutExercise.deleteMany({
    where: {
      workout: { week: { plan: { userId } } },
      ...(kept.workoutExercises.size > 0 ? { id: { notIn: Array.from(kept.workoutExercises) } } : {}),
    },
  });
  await tx.workout.deleteMany({
    where: {
      week: { plan: { userId } },
      ...(kept.workouts.size > 0 ? { id: { notIn: Array.from(kept.workouts) } } : {}),
    },
  });
  await tx.week.deleteMany({
    where: {
      plan: { userId },
      ...(kept.weeks.size > 0 ? { id: { notIn: Array.from(kept.weeks) } } : {}),
    },
  });
  await tx.plan.deleteMany({
    where: {
      userId,
      ...(kept.plans.size > 0 ? { id: { notIn: Array.from(kept.plans) } } : {}),
    },
  });
}

interface Kept {
  plans: Set<number>;
  weeks: Set<number>;
  workouts: Set<number>;
  workoutExercises: Set<number>;
  sets: Set<number>;
}
