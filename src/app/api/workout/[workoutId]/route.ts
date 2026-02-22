import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import getLoggedInUser from '@lib/getLoggedInUser';

export async function PATCH(req: NextRequest, props: { params: Promise<{ workoutId: string }> }) {
  const params = await props.params;
  const {notes} = await req.json();

  if (typeof notes !== 'string') {
    return NextResponse.json({error: 'notes must be a string'}, {status: 400});
  }

  try {
    const workoutId = Number(params.workoutId);
    const workout = await prisma.workout.findUnique({
      where: {id: workoutId},
      include: {
        week: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!workout) {
      return NextResponse.json({error: 'Workout not found'}, {status: 404});
    }

    const user = await getLoggedInUser();
    if (workout.week.plan.userId !== user.id) {
      return NextResponse.json({error: 'Forbidden'}, {status: 403});
    }

    const updated = await prisma.workout.update({
      where: {id: workoutId},
      data: {notes},
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error(err);
    let message = 'Unknown error';
    if (err && typeof err === 'object' && 'message' in err) {
      message = String((err as {message: unknown}).message);
    }
    return NextResponse.json({error: message}, {status: 500});
  }
}
