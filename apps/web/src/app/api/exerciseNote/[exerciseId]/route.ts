import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import {requireSession} from '@lib/requireSession';
import {extractErrorMessage} from "@lib/apiError";
import {errorResponse, validationErrorResponse} from '@lib/apiResponses';
import {ExerciseNoteUpdateRequestSchema} from '@lib/contracts/exerciseNote';

export async function PUT(req: NextRequest, props: { params: Promise<{ exerciseId: string }> }) {
  const params = await props.params;
  const session = await requireSession();

  const json = await req.json().catch(() => null);
  if (json == null) return errorResponse('Invalid JSON body', 400);

  const parsed = ExerciseNoteUpdateRequestSchema.safeParse(json);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const { note } = parsed.data;

  try {
    const exerciseId = Number(params.exerciseId);
    const user = session.user;

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
    return errorResponse(extractErrorMessage(err), 500);
  }
}
