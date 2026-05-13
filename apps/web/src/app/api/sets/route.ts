import prisma from '@/lib/prisma';
import {NextResponse} from 'next/server';
import {requireSession} from '@lib/requireSession';
import {extractErrorMessage} from '@lib/apiError';
import {errorResponse, notFoundResponse, validationErrorResponse} from '@lib/apiResponses';
import {SetCreateRequestSchema} from '@lib/contracts/sets';
import { logInvalidJson, logUnexpectedError, logValidationError, summarizePayload, type RequestLogContext } from '@lib/apiLogging';
import { withApiRoute } from '@lib/routeAuth';

export const POST = withApiRoute({ route: '/api/sets' }, async function POST(ctx: RequestLogContext, req: Request) {
  const session = await requireSession();

  const json = await req.json().catch(() => null);
  if (json == null) {
    logInvalidJson(ctx);
    return errorResponse('Invalid JSON body', 400);
  }

  const parsed = SetCreateRequestSchema.safeParse(json);
  if (!parsed.success) {
    logValidationError(ctx, parsed.error, summarizePayload(json, ['workoutExerciseId', 'isDropSet', 'parentSetId']));
    return validationErrorResponse(parsed.error);
  }

  const { workoutExerciseId, weight, isDropSet, parentSetId } = parsed.data;

  try {
    const workoutExercise = await prisma.workoutExercise.findFirst({
      where: {
        id: workoutExerciseId,
        workout: {week: {plan: {userId: session.user.id}}},
      },
      include: {sets: {select: {order: true}}},
    });

    if (!workoutExercise) return notFoundResponse('WorkoutExercise');

    const maxOrder = workoutExercise.sets.reduce((max, s) => Math.max(max, s.order), 0);

    const set = await prisma.exerciseSet.create({
      data: {
        workoutExerciseId,
        order: maxOrder + 1,
        weight: weight ?? null,
        reps: null,
        isDropSet: isDropSet ?? false,
        parentSetId: parentSetId ?? null,
      },
    });

    return NextResponse.json(set, {status: 201});
  } catch (err: unknown) {
    logUnexpectedError(ctx, err, { workoutExerciseId });
    return errorResponse(extractErrorMessage(err), 500);
  }
});
