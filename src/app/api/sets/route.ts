import prisma from '@/lib/prisma';
import {NextResponse} from 'next/server';
import {requireSession} from '@lib/requireSession';
import {extractErrorMessage} from '@lib/apiError';

export async function POST(req: Request) {
  let session: Awaited<ReturnType<typeof requireSession>>;
  try {
    session = await requireSession();
  } catch (res) {
    return res as NextResponse;
  }

  const {workoutExerciseId, weight, isDropSet, parentSetId} = await req.json();

  if (typeof workoutExerciseId !== 'number') {
    return NextResponse.json({error: 'workoutExerciseId required'}, {status: 400});
  }

  try {
    const workoutExercise = await prisma.workoutExercise.findFirst({
      where: {
        id: workoutExerciseId,
        workout: {week: {plan: {userId: session.user.id}}},
      },
      include: {sets: {select: {order: true}}},
    });

    if (!workoutExercise) {
      return NextResponse.json({error: 'Not found'}, {status: 404});
    }

    const maxOrder = workoutExercise.sets.reduce((max, s) => Math.max(max, s.order), 0);

    const set = await prisma.exerciseSet.create({
      data: {
        workoutExerciseId,
        order: maxOrder + 1,
        weight: typeof weight === 'number' ? weight : null,
        reps: null,
        isDropSet: isDropSet === true,
        parentSetId: typeof parentSetId === 'number' ? parentSetId : null,
      },
    });

    return NextResponse.json(set, {status: 201});
  } catch (err: unknown) {
    return NextResponse.json({error: extractErrorMessage(err)}, {status: 500});
  }
}
