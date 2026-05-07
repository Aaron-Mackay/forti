import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import {requireSession} from '@lib/requireSession';
import {extractErrorMessage} from "@lib/apiError";
import { errorResponse, forbiddenResponse, notFoundResponse, validationErrorResponse } from '@lib/apiResponses';
import { normalizeRepRange } from '@/lib/repRange';
import { getCoachFromUser } from '@lib/coachService';
import { WorkoutExerciseCreateRequestSchema } from '@lib/contracts/workoutExercise';

export async function POST(req: NextRequest) {
  const session = await requireSession();

  const json = await req.json().catch(() => null);
  if (json == null) return errorResponse('Invalid JSON body', 400);

  const parsed = WorkoutExerciseCreateRequestSchema.safeParse(json);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const { workoutId, exerciseId, order, repRange, restTime, setCount, requiresRecording } = parsed.data;
  const requiresRecordingProvided = requiresRecording !== undefined;

  const resolvedRepRange = normalizeRepRange(repRange ?? '8-12');
  if (!resolvedRepRange) {
    return errorResponse(
      'Invalid repRange format. Use exact ("10"), range ("5-10"), plus ("5+"), or "AMRAP".',
      400,
    );
  }

  const resolvedRestTime: string = typeof restTime === 'string' ? restTime.trim() : '90';
  const resolvedSetCount: number = setCount ?? 3;

  try {
    const workout = await prisma.workout.findUnique({
      where: {id: workoutId},
      include: {week: {include: {plan: true}}},
    });

    if (!workout) return notFoundResponse('Workout');

    if (workout.week.plan.userId !== session.user.id) {
      return forbiddenResponse();
    }

    if (requiresRecordingProvided) {
      const assignedCoach = await getCoachFromUser(workout.week.plan.userId);
      if (assignedCoach?.coachId !== session.user.id) {
        return forbiddenResponse();
      }
    }

    const exercise = await prisma.exercise.findUnique({where: {id: exerciseId}});
    if (!exercise) return notFoundResponse('Exercise');

    const workoutExercise = await prisma.workoutExercise.create({
      data: {
        workoutId,
        exerciseId,
        order,
        isAdded: true,
        repRange: resolvedRepRange,
        restTime: resolvedRestTime,
        requiresRecording: requiresRecording ?? false,
        sets: {
          create: Array.from({length: resolvedSetCount}, (_, i) => ({order: i, reps: null, weight: null})),
        },
      },
      include: {
        sets: {orderBy: {order: 'asc'}},
        exercise: true,
      },
    });

    return NextResponse.json(workoutExercise, {status: 201});
  } catch (err: unknown) {
    console.error(err);
    return errorResponse(extractErrorMessage(err), 500);
  }
}
