import prisma from '@/lib/prisma';
import {NextResponse} from "next/server";
import confirmPermission from "@lib/confirmPermission";
import {extractErrorMessage} from "@lib/apiError";
import {AuditEventType, ExerciseCategory} from "@/generated/prisma/browser";
import { recordAuditEvent } from '@lib/auditEvents';
import {computeE1rm} from "@lib/e1rm";
import {findOrCreateExercise} from "@lib/exerciseQueries";
import {authenticationErrorResponse, isAuthenticationError} from "@lib/requireSession";
import { getSessionActorUserId } from '@lib/sessionActor';
import {
  SaveUserWorkoutDataRequestSchema,
  type SaveUserWorkoutDataRequest,
  type SaveUserWorkoutDataSuccess,
} from '@lib/contracts/saveUserWorkoutData';
import { errorResponse, validationErrorResponse } from '@lib/apiResponses';

const SAVE_USER_WORKOUT_DATA_TRANSACTION_TIMEOUT_MS = 15_000;

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  if (json == null) {
    return errorResponse('Invalid JSON body', 400);
  }

  const parsed = SaveUserWorkoutDataRequestSchema.safeParse(json);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const body: SaveUserWorkoutDataRequest = parsed.data;

  const userId = body.id;

  try {
    await confirmPermission(userId);
  } catch (err) {
    if (isAuthenticationError(err)) return authenticationErrorResponse();
    throw err;
  }

  const actorUserId = await getSessionActorUserId();


  try {
    await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { id: userId },
        select: { activePlanId: true },
      });

      const previousActivePlan = existingUser?.activePlanId == null
        ? null
        : await tx.plan.findUnique({
            where: { id: existingUser.activePlanId },
            select: { order: true },
          });

      // 1. Delete all nested data
      const planIds = await tx.plan.findMany({
        where: {userId},
        select: {id: true},
      });

      const weekIds = await tx.week.findMany({
        where: {planId: {in: planIds.map(p => p.id)}},
        select: {id: true},
      });

      const workoutIds = await tx.workout.findMany({
        where: {weekId: {in: weekIds.map(w => w.id)}},
        select: {id: true},
      });

      const workoutExerciseIds = await tx.workoutExercise.findMany({
        where: {workoutId: {in: workoutIds.map(w => w.id)}},
        select: {id: true},
      });

      await tx.exerciseSet.deleteMany({
        where: {workoutExerciseId: {in: workoutExerciseIds.map(w => w.id)}}
      });

      await tx.workoutExercise.deleteMany({
        where: {workoutId: {in: workoutIds.map(w => w.id)}}
      });

      await tx.workout.deleteMany({
        where: {weekId: {in: weekIds.map(w => w.id)}}
      });

      await tx.week.deleteMany({
        where: {planId: {in: planIds.map(p => p.id)}},
      });

      await tx.plan.deleteMany({
        where: {userId}
      });

      // 2. Recreate all plans, weeks, workouts, etc.
      for (const plan of body.plans) {
        const createdPlan = await tx.plan.create({
          data: {userId, order: plan.order, name: plan.name, description: plan.description ?? null},
        });
        for (const week of plan.weeks) {
          const createdWeek = await tx.week.create({
            data: {order: week.order, planId: createdPlan.id},
          });
          for (const workout of week.workouts) {
            const createdWorkout = await tx.workout.create({
              data: {
                name: workout.name,
                notes: workout.notes,
                order: workout.order,
                dateCompleted: workout.dateCompleted ? new Date(workout.dateCompleted) : null,
                weekId: createdWeek.id,
              },
            });
            for (const exercise of workout.exercises) {
              const exerciseRecord = await findOrCreateExercise(
                tx,
                exercise.exercise.name,
                exercise.exercise.category as ExerciseCategory | null ?? null,
                userId,
              );
              const createdExercise = await tx.workoutExercise.create({
                data: {
                  workoutId: createdWorkout.id,
                  exerciseId: exerciseRecord.id,
                  order: exercise.order,
                  repRange: exercise.repRange,
                  restTime: exercise.restTime,
                  notes: exercise.notes,
                  isBfr: exercise.isBfr ?? false,
                },
              });
              const idMap = new Map<number, number>();
              const regularSets = exercise.sets.filter(s => !s.isDropSet);
              const dropSets = exercise.sets.filter(s => s.isDropSet);
              for (const set of regularSets) {
                const created = await tx.exerciseSet.create({
                  data: {
                    workoutExerciseId: createdExercise.id,
                    weight: set.weight ?? null,
                    reps: set.reps ?? null,
                    order: set.order,
                    isDropSet: false,
                    parentSetId: null,
                    e1rm: computeE1rm(set.weight, set.reps),
                  },
                });
                if (set.id != null) idMap.set(set.id, created.id);
              }
              for (const set of dropSets) {
                await tx.exerciseSet.create({
                  data: {
                    workoutExerciseId: createdExercise.id,
                    weight: set.weight ?? null,
                    reps: set.reps ?? null,
                    order: set.order,
                    isDropSet: true,
                    parentSetId: set.parentSetId != null ? (idMap.get(set.parentSetId) ?? null) : null,
                    e1rm: computeE1rm(set.weight, set.reps),
                  },
                });
              }
            }
          }
        }
      }

      const requestedActivePlanOrder = body.activePlanId === undefined
        ? undefined
        : body.activePlanId === null
          ? null
          : body.plans.find((plan) => plan.id === body.activePlanId)?.order ?? null;

      const activePlanOrder = requestedActivePlanOrder === undefined
        ? previousActivePlan?.order ?? null
        : requestedActivePlanOrder;

      if (activePlanOrder === null) {
        await tx.user.update({
          where: { id: userId },
          data: { activePlanId: null },
        });
        return;
      }

      const remappedActivePlan = await tx.plan.findFirst({
        where: { userId, order: activePlanOrder },
        select: { id: true },
      });

      await tx.user.update({
        where: { id: userId },
        data: { activePlanId: remappedActivePlan?.id ?? null },
      });
    }, { timeout: SAVE_USER_WORKOUT_DATA_TRANSACTION_TIMEOUT_MS });

    if (actorUserId) {
      await recordAuditEvent({
        actorUserId,
        eventType: AuditEventType.PlanSaved,
        analyticsEvent: 'plan_saved',
        analyticsData: {
          planCount: body.plans.length,
          target: actorUserId === userId ? 'self' : 'client',
        },
        subjectType: 'user_plan',
        subjectId: userId,
        metadata: {
          targetUserId: userId,
          planCount: body.plans.length,
          activePlanId: body.activePlanId ?? null,
        },
      });
    }

    return NextResponse.json({success: true} satisfies SaveUserWorkoutDataSuccess, {status: 200});
  } catch (err: unknown) {
    console.error("Save error:", err);
    return errorResponse(extractErrorMessage(err), 500);
  }
}
