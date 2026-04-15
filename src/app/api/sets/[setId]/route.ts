import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import {requireSession} from "@lib/requireSession";
import {extractErrorMessage} from "@lib/apiError";
import {computeE1rm} from "@lib/e1rm";
import {getSetWithOwner} from "@lib/queries";
import {errorResponse, forbiddenResponse, notFoundResponse} from "@lib/apiResponses";
import { touchPlanActivity } from '@lib/planActivity';

export async function DELETE(_req: NextRequest, props: { params: Promise<{ setId: string }> }) {
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
    return errorResponse(extractErrorMessage(err), 500);
  }
}


export async function PATCH(req: NextRequest, props: { params: Promise<{ setId: string }> }) {
  const params = await props.params;
  const session = await requireSession();
  const {reps, weight, rpe, rir} = await req.json();
  const data: { [p: string]: number | null } = {};

  const isNumberOrNull = (value: unknown) => value === null || typeof value === 'number';

  if (reps !== undefined && !isNumberOrNull(reps)) {
    return NextResponse.json({error: 'reps must be a number or null'}, {status: 400});
  }
  if (weight !== undefined && !isNumberOrNull(weight)) {
    return NextResponse.json({error: 'weight must be a number or null'}, {status: 400});
  }
  if (rpe !== undefined && !isNumberOrNull(rpe)) {
    return NextResponse.json({error: 'rpe must be a number or null'}, {status: 400});
  }
  if (rir !== undefined && !isNumberOrNull(rir)) {
    return NextResponse.json({error: 'rir must be a number or null'}, {status: 400});
  }

  if (reps !== undefined) data.reps = reps;
  if (weight !== undefined) data.weight = weight;
  if (rpe !== undefined) data.rpe = rpe;
  if (rir !== undefined) data.rir = rir;

  if (!Object.keys(data).length) {
    return NextResponse.json({error: 'No valid fields provided'}, {status: 400});
  }

  try {
    const setId = Number(params.setId);
    const set = await getSetWithOwner(setId);

    if (!set) return notFoundResponse('Set');
    if (set.workoutExercise.workout.week.plan.userId !== session.user.id) {
      return forbiddenResponse();
    }

    // Merge incoming values with existing to compute e1rm even when only one field changes
    const mergedWeight = reps !== undefined || weight !== undefined
      ? (data.weight !== undefined ? data.weight : set.weight)
      : set.weight;
    const mergedReps = reps !== undefined || weight !== undefined
      ? (data.reps !== undefined ? data.reps : set.reps)
      : set.reps;
    data.e1rm = computeE1rm(mergedWeight, mergedReps);

    const updated = await prisma.exerciseSet.update({
      where: {id: Number(setId)},
      data,
    });

    await touchPlanActivity(set.workoutExercise.workout.week.plan.id);

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error(err);
    return errorResponse(extractErrorMessage(err), 500);
  }
}
