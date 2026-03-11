import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import getLoggedInUser from '@lib/getLoggedInUser';
import {extractErrorMessage} from "@lib/apiError";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {workoutId, exerciseId, order, repRange, restTime, setCount} = body;

  if (typeof workoutId !== 'number' || typeof exerciseId !== 'number' || typeof order !== 'number') {
    return NextResponse.json({error: 'workoutId, exerciseId and order must be numbers'}, {status: 400});
  }

  const resolvedRepRange: string = typeof repRange === 'string' ? repRange : '8-12';
  const resolvedRestTime: string = typeof restTime === 'string' ? restTime : '90';
  const resolvedSetCount: number = typeof setCount === 'number' ? Math.min(10, Math.max(1, setCount)) : 3;

  try {
    const workout = await prisma.workout.findUnique({
      where: {id: workoutId},
      include: {week: {include: {plan: true}}},
    });

    if (!workout) {
      return NextResponse.json({error: 'Workout not found'}, {status: 404});
    }

    const user = await getLoggedInUser();
    if (workout.week.plan.userId !== user.id) {
      return NextResponse.json({error: 'Forbidden'}, {status: 403});
    }

    const exercise = await prisma.exercise.findUnique({where: {id: exerciseId}});
    if (!exercise) {
      return NextResponse.json({error: 'Exercise not found'}, {status: 404});
    }

    const workoutExercise = await prisma.workoutExercise.create({
      data: {
        workoutId,
        exerciseId,
        order,
        isAdded: true,
        repRange: resolvedRepRange,
        restTime: resolvedRestTime,
        sets: {
          create: Array.from({length: resolvedSetCount}, (_, i) => ({order: i, reps: null, weight: null})),
        },
      },
      include: {
        sets: {orderBy: {order: 'asc'}},
        exercise: true,
      },
    });

    return NextResponse.json(workoutExercise, {status: 201});
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({error: extractErrorMessage(err)}, {status: 500});
  }
}
