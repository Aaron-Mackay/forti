import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import { extractErrorMessage } from '@lib/apiError';

export async function GET(_req: NextRequest, props: { params: Promise<{ exerciseId: string }> }) {
  const params = await props.params;
  const session = await requireSession();
  const exerciseId = Number(params.exerciseId);

  if (isNaN(exerciseId) || exerciseId <= 0) {
    return NextResponse.json({ error: 'Invalid exerciseId' }, { status: 400 });
  }

  try {
    const rows = await prisma.workoutExercise.findMany({
      where: {
        exerciseId,
        excludeFromHistory: true,
        workout: {
          dateCompleted: { not: null },
          week: { plan: { userId: session.user.id } },
        },
      },
      select: {
        id: true,
        workout: { select: { dateCompleted: true, name: true } },
      },
      orderBy: { workout: { dateCompleted: 'desc' } },
    });

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        dateCompleted: r.workout.dateCompleted?.toISOString() ?? null,
        workoutName: r.workout.name,
      }))
    );
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: extractErrorMessage(err) }, { status: 500 });
  }
}
