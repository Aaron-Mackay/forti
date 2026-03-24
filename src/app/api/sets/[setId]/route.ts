import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import {requireSession} from "@lib/requireSession";
import {extractErrorMessage} from "@lib/apiError";
import {computeE1rm} from "@lib/e1rm";
import {getSetWithOwner} from "@lib/queries";
import {errorResponse, forbiddenResponse, notFoundResponse} from "@lib/apiResponses";

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

  if (typeof reps === 'number') data.reps = reps;
  if (typeof weight === 'number') data.weight = weight;
  if (typeof rpe === 'number') data.rpe = rpe;
  if (rpe === null) data.rpe = null;
  if (typeof rir === 'number') data.rir = rir;
  if (rir === null) data.rir = null;

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
    const mergedWeight = typeof data.weight === 'number' ? data.weight : set.weight;
    const mergedReps = typeof data.reps === 'number' ? data.reps : set.reps;
    data.e1rm = computeE1rm(mergedWeight, mergedReps);

    const updated = await prisma.exerciseSet.update({
      where: {id: Number(setId)},
      data,
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error(err);
    return errorResponse(extractErrorMessage(err), 500);
  }
}
