import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import {requireSession} from '@lib/requireSession';
import {extractErrorMessage} from "@lib/apiError";
import {getWorkoutExerciseWithOwner} from "@lib/queries";
import {errorResponse, forbiddenResponse, notFoundResponse, validationErrorResponse} from "@lib/apiResponses";
import { getCoachFromUser } from '@lib/coachService';
import { WorkoutExerciseUpdateRequestSchema } from '@lib/contracts/workoutExercise';
import { logInvalidJson, logUnexpectedError, logValidationError, summarizePayload, type RequestLogContext } from '@lib/apiLogging';
import { withApiRoute } from '@lib/routeAuth';

export const DELETE = withApiRoute({ route: '/api/workoutExercise/[workoutExerciseId]' }, async function DELETE(ctx: RequestLogContext, _req: NextRequest, props: { params: Promise<{ workoutExerciseId: string }> }) {
  const params = await props.params;
  const session = await requireSession();

  try {
    const workoutExerciseId = Number(params.workoutExerciseId);
    const workoutExercise = await getWorkoutExerciseWithOwner(workoutExerciseId);

    if (!workoutExercise) return notFoundResponse('WorkoutExercise');

    if (workoutExercise.workout.week.plan.userId !== session.user.id) {
      return forbiddenResponse();
    }

    await prisma.workoutExercise.delete({where: {id: workoutExerciseId}});

    return new NextResponse(null, {status: 204});
  } catch (err: unknown) {
    logUnexpectedError(ctx, err, { workoutExerciseId: params.workoutExerciseId });
    return errorResponse(extractErrorMessage(err), 500);
  }
});

export const PATCH = withApiRoute({ route: '/api/workoutExercise/[workoutExerciseId]' }, async function PATCH(ctx: RequestLogContext, req: NextRequest, props: { params: Promise<{ workoutExerciseId: string }> }) {
  const params = await props.params;
  const session = await requireSession();

  const json = await req.json().catch(() => null);
  if (json == null) {
    logInvalidJson(ctx, { workoutExerciseId: params.workoutExerciseId });
    return errorResponse('Invalid JSON body', 400);
  }

  const parsed = WorkoutExerciseUpdateRequestSchema.safeParse(json);
  if (!parsed.success) {
    logValidationError(ctx, parsed.error, {
      workoutExerciseId: params.workoutExerciseId,
      payload: summarizePayload(json, ['exerciseId', 'requiresRecording', 'excludeFromHistory', 'isBfr']),
    });
    return validationErrorResponse(parsed.error);
  }

  const body = parsed.data;
  const {notes, cardioDuration, cardioDistance, cardioResistance, exerciseId, targetRpe, targetRir, isBfr, requiresRecording, excludeFromHistory} = body;

  try {
    const workoutExerciseId = Number(params.workoutExerciseId);
    const workoutExercise = await getWorkoutExerciseWithOwner(workoutExerciseId);

    if (!workoutExercise) return notFoundResponse('WorkoutExercise');

    if (workoutExercise.workout.week.plan.userId !== session.user.id) {
      return forbiddenResponse();
    }
    if (requiresRecording !== undefined) {
      const assignedCoach = await getCoachFromUser(workoutExercise.workout.week.plan.userId);
      if (assignedCoach?.coachId !== session.user.id) {
        return forbiddenResponse();
      }
    }

    const updateData: {
      notes?: string;
      cardioDuration?: number | null;
      cardioDistance?: number | null;
      cardioResistance?: number | null;
      targetRpe?: number | null;
      targetRir?: number | null;
      exerciseId?: number;
      substitutedForId?: number | null;
      isBfr?: boolean;
      requiresRecording?: boolean;
      excludeFromHistory?: boolean;
    } = {};

    if (notes !== undefined) updateData.notes = notes;
    if (cardioDuration !== undefined) updateData.cardioDuration = cardioDuration ?? null;
    if (cardioDistance !== undefined) updateData.cardioDistance = cardioDistance ?? null;
    if (cardioResistance !== undefined) updateData.cardioResistance = cardioResistance ?? null;
    if (targetRpe !== undefined) {
      updateData.targetRpe = typeof targetRpe === 'number' ? targetRpe : null;
      if (updateData.targetRpe !== null) updateData.targetRir = null; // mutually exclusive
    }
    if (targetRir !== undefined) {
      updateData.targetRir = typeof targetRir === 'number' ? targetRir : null;
      if (updateData.targetRir !== null) updateData.targetRpe = null; // mutually exclusive
    }

    if (isBfr !== undefined) updateData.isBfr = isBfr;
    if (requiresRecording !== undefined) updateData.requiresRecording = requiresRecording;
    if (excludeFromHistory !== undefined) updateData.excludeFromHistory = excludeFromHistory;

    if (exerciseId !== undefined && exerciseId !== workoutExercise.exerciseId) {
      const exercise = await prisma.exercise.findUnique({where: {id: exerciseId}});
      if (!exercise) return notFoundResponse('Exercise');
      updateData.exerciseId = exerciseId;
      if (workoutExercise.isAdded) {
        // Added rows are replace-only and should never carry substitution lineage.
        updateData.substitutedForId = null;
      } else if (workoutExercise.substitutedForId !== null && exerciseId === workoutExercise.substitutedForId) {
        // Reverting to the original exercise — clear the substitution marker.
        updateData.substitutedForId = null;
      } else if (!workoutExercise.substitutedForId) {
        // First substitution — record the original exercise.
        updateData.substitutedForId = workoutExercise.exerciseId;
      }
      // Exercise assignment changed, so clear exercise-specific execution data.
      updateData.cardioDuration = null;
      updateData.cardioDistance = null;
      updateData.cardioResistance = null;
      updateData.isBfr = false;
    }

    const updated = await prisma.workoutExercise.update({
      where: {id: workoutExerciseId},
      data: {
        ...updateData,
        ...(updateData.exerciseId != null ? {
          sets: {
            updateMany: {
              where: {},
              data: {
                reps: null,
                weight: null,
                e1rm: null,
                rpe: null,
                rir: null,
                isDropSet: false,
                parentSetId: null,
              },
            },
          },
        } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    logUnexpectedError(ctx, err, { workoutExerciseId: params.workoutExerciseId });
    return errorResponse(extractErrorMessage(err), 500);
  }
});
