import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import {requireSession} from '@lib/requireSession';
import {forbiddenResponse, errorResponse, validationErrorResponse} from '@lib/apiResponses';
import {extractErrorMessage} from '@lib/apiError';
import {CoachExerciseDescriptionRequestSchema} from '@lib/contracts/coach';

async function verifyCoach(userId: string): Promise<boolean> {
  const clientCount = await prisma.user.count({where: {coachId: userId}});
  return clientCount > 0;
}

export async function PUT(req: NextRequest, props: {params: Promise<{exerciseId: string}>}) {
  const params = await props.params;
  const session = await requireSession();
  const userId = session.user.id;

  if (!(await verifyCoach(userId))) {
    return forbiddenResponse();
  }

  const json = await req.json().catch(() => null);
  if (json == null) return errorResponse('Invalid JSON body', 400);

  const parsed = CoachExerciseDescriptionRequestSchema.safeParse(json);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const { note, url } = parsed.data;
  const trimmedNote = note.trim();
  const trimmedUrl = typeof url === 'string' ? url.trim() : null;

  if (trimmedNote.length === 0 && !trimmedUrl) {
    return errorResponse('note or url is required', 400);
  }

  try {
    const exerciseId = Number(params.exerciseId);
    const updated = await prisma.coachExerciseNote.upsert({
      where: {coachId_exerciseId: {coachId: userId, exerciseId}},
      update: {note: trimmedNote, url: trimmedUrl || null},
      create: {coachId: userId, exerciseId, note: trimmedNote, url: trimmedUrl || null},
    });
    return NextResponse.json(updated);
  } catch (err) {
    return errorResponse(extractErrorMessage(err), 500);
  }
}

export async function DELETE(_req: NextRequest, props: {params: Promise<{exerciseId: string}>}) {
  const params = await props.params;
  const session = await requireSession();
  const userId = session.user.id;

  if (!(await verifyCoach(userId))) {
    return forbiddenResponse();
  }

  try {
    const exerciseId = Number(params.exerciseId);
    await prisma.coachExerciseNote.deleteMany({
      where: {coachId: userId, exerciseId},
    });
    return new NextResponse(null, {status: 204});
  } catch (err) {
    return errorResponse(extractErrorMessage(err), 500);
  }
}
