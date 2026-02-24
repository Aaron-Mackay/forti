import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import getLoggedInUser from '@lib/getLoggedInUser';
import {extractErrorMessage} from "@lib/apiError";

export async function PATCH(req: NextRequest, props: { params: Promise<{ workoutExerciseId: string }> }) {
  const params = await props.params;
  const {notes} = await req.json();

  if (typeof notes !== 'string') {
    return NextResponse.json({error: 'notes must be a string'}, {status: 400});
  }

  try {
    const workoutExerciseId = Number(params.workoutExerciseId);
    const workoutExercise = await prisma.workoutExercise.findUnique({
      where: {id: workoutExerciseId},
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
    });

    if (!workoutExercise) {
      return NextResponse.json({error: 'WorkoutExercise not found'}, {status: 404});
    }

    const user = await getLoggedInUser();
    if (workoutExercise.workout.week.plan.userId !== user.id) {
      return NextResponse.json({error: 'Forbidden'}, {status: 403});
    }

    const updated = await prisma.workoutExercise.update({
      where: {id: workoutExerciseId},
      data: {notes},
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({error: extractErrorMessage(err)}, {status: 500});
  }
}
