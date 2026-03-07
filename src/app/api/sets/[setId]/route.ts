import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import getLoggedInUser from "@lib/getLoggedInUser";
import {extractErrorMessage} from "@lib/apiError";
import {computeE1rm} from "@lib/e1rm";


export async function PATCH(req: NextRequest, props: { params: Promise<{ setId: string }> }) {
  const params = await props.params;
  const {reps, weight} = await req.json();
  const data: { [p: string]: number | null } = {};

  if (typeof reps === 'number') data.reps = reps;
  if (typeof weight === 'number') data.weight = weight;

  if (!Object.keys(data).length) {
    return NextResponse.json({error: 'No valid fields provided'}, {status: 400});
  }

  try {
    const setId = Number(params.setId);
    const set = await prisma.exerciseSet.findUnique({
      where: {id: setId},
      include: {
        workoutExercise: {
          include: {
            workout: {
              include: {
                week: {
                  include: {
                    plan: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!set) {
      return NextResponse.json({error: 'Set not found'}, {status: 404});
    }
    const user = await getLoggedInUser();
    const ownerId = set.workoutExercise.workout.week.plan.userId;
    if (ownerId !== user.id) {
      return NextResponse.json({error: 'Forbidden'}, {status: 403});
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
    return NextResponse.json({error: extractErrorMessage(err)}, {status: 500});
  }
}
