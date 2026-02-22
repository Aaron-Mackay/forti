import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import getLoggedInUser from '@lib/getLoggedInUser';

export async function PUT(req: NextRequest, props: { params: Promise<{ exerciseId: string }> }) {
  const params = await props.params;
  const {note} = await req.json();

  if (typeof note !== 'string') {
    return NextResponse.json({error: 'note must be a string'}, {status: 400});
  }

  try {
    const exerciseId = Number(params.exerciseId);
    const user = await getLoggedInUser();

    const updated = await prisma.userExerciseNote.upsert({
      where: {
        userId_exerciseId: {
          userId: user.id,
          exerciseId,
        },
      },
      update: {note},
      create: {
        userId: user.id,
        exerciseId,
        note,
      },
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
