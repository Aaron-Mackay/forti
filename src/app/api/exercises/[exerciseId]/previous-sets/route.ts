import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import getLoggedInUser from '@lib/getLoggedInUser';

export async function GET(req: NextRequest, props: { params: Promise<{ exerciseId: string }> }) {
  const params = await props.params;
  const exerciseId = Number(params.exerciseId);
  const currentWorkoutId = Number(req.nextUrl.searchParams.get('currentWorkoutId')) || undefined;

  if (isNaN(exerciseId) || exerciseId <= 0) {
    return NextResponse.json({error: 'Invalid exerciseId'}, {status: 400});
  }

  try {
    const user = await getLoggedInUser();

    const previousWorkoutExercise = await prisma.workoutExercise.findFirst({
      where: {
        exerciseId,
        workout: {
          dateCompleted: {not: null},
          ...(currentWorkoutId !== undefined ? {id: {not: currentWorkoutId}} : {}),
          week: {
            plan: {userId: user.id},
          },
        },
      },
      include: {
        sets: {orderBy: {order: 'asc'}},
      },
      orderBy: {
        workout: {dateCompleted: 'desc'},
      },
    });

    return NextResponse.json(previousWorkoutExercise?.sets ?? []);
  } catch (err: unknown) {
    console.error(err);
    let message = 'Unknown error';
    if (err && typeof err === 'object' && 'message' in err) {
      message = String((err as {message: unknown}).message);
    }
    return NextResponse.json({error: message}, {status: 500});
  }
}
