import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import getLoggedInUser from "@lib/getLoggedInUser";


export async function PATCH(req: NextRequest, props: { params: Promise<{ setId: string }> }) {
  const params = await props.params;
  const {reps, weight} = await req.json();
  const data: { [p: string]: string | number } = {};

  if (typeof reps === 'number') data.reps = reps;
  if (typeof weight === 'string') data.weight = weight;

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

    const updated = await prisma.exerciseSet.update({
      where: {id: Number(setId)},
      data,
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error(err)

    let message = "Unknown error";
    if (err && typeof err === "object" && "message" in err) {
      message = String((err as { message: unknown }).message);
    }

    return NextResponse.json({error: message}, {status: 500});
  }
}
