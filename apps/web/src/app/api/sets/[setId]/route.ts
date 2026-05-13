import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import {requireSession} from "@lib/requireSession";
import {extractErrorMessage} from "@lib/apiError";
import {computeE1rm} from "@lib/e1rm";
import {getSetWithOwner} from "@lib/queries";
import {errorResponse, forbiddenResponse, notFoundResponse, validationErrorResponse} from "@lib/apiResponses";
import { touchPlanActivity } from '@lib/planActivity';
import { SetUpdateRequestSchema } from "@lib/contracts/sets";
import { logInvalidJson, logUnexpectedError, logValidationError, summarizePayload, type RequestLogContext } from '@lib/apiLogging';
import { withApiRoute } from '@lib/routeAuth';

export const DELETE = withApiRoute({ route: '/api/sets/[setId]' }, async function DELETE(ctx: RequestLogContext, _req: NextRequest, props: { params: Promise<{ setId: string }> }) {
  const params = await props.params;
  const session = await requireSession();
  try {
    const setId = Number(params.setId);
    const set = await getSetWithOwner(setId);

    if (!set) return notFoundResponse('Set');

    if (set.workoutExercise.workout.week.plan.userId !== session.user.id) {
      return forbiddenResponse();
    }

    await prisma.exerciseSet.delete({where: {id: setId}});
    return NextResponse.json({success: true});
  } catch (err: unknown) {
    logUnexpectedError(ctx, err, { setId: params.setId });
    return errorResponse(extractErrorMessage(err), 500);
  }
});


export const PATCH = withApiRoute({ route: '/api/sets/[setId]' }, async function PATCH(ctx: RequestLogContext, req: NextRequest, props: { params: Promise<{ setId: string }> }) {
  const params = await props.params;
  const session = await requireSession();

  const json = await req.json().catch(() => null);
  if (json == null) {
    logInvalidJson(ctx, { setId: params.setId });
    return errorResponse('Invalid JSON body', 400);
  }

  const parsed = SetUpdateRequestSchema.safeParse(json);
  if (!parsed.success) {
    logValidationError(ctx, parsed.error, {
      setId: params.setId,
      payload: summarizePayload(json, ['reps', 'weight', 'rpe', 'rir']),
    });
    return validationErrorResponse(parsed.error);
  }

  const data: { reps?: number | null; weight?: number | null; rpe?: number | null; rir?: number | null; e1rm?: number | null } = {};
  const { reps, weight, rpe, rir } = parsed.data;
  if (reps !== undefined) data.reps = reps;
  if (weight !== undefined) data.weight = weight;
  if (rpe !== undefined) data.rpe = rpe;
  if (rir !== undefined) data.rir = rir;

  try {
    const setId = Number(params.setId);
    const set = await getSetWithOwner(setId);

    if (!set) return notFoundResponse('Set');
    if (set.workoutExercise.workout.week.plan.userId !== session.user.id) {
      return forbiddenResponse();
    }

    const mergedWeight = data.weight !== undefined ? data.weight : set.weight;
    const mergedReps = data.reps !== undefined ? data.reps : set.reps;
    data.e1rm = computeE1rm(mergedWeight, mergedReps);

    const updated = await prisma.exerciseSet.update({
      where: {id: Number(setId)},
      data,
    });

    await touchPlanActivity(set.workoutExercise.workout.week.plan.id);

    return NextResponse.json(updated);
  } catch (err: unknown) {
    logUnexpectedError(ctx, err, { setId: params.setId });
    return errorResponse(extractErrorMessage(err), 500);
  }
});
