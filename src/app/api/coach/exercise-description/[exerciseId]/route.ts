import prisma from '@/lib/prisma';
import {NextRequest, NextResponse} from 'next/server';
import {requireSession} from '@lib/requireSession';
import {forbiddenResponse, errorResponse} from '@lib/apiResponses';
import {extractErrorMessage} from '@lib/apiError';

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

  const {description} = await req.json();
  if (typeof description !== 'string' || description.trim().length === 0) {
    return errorResponse('description must be a non-empty string', 400);
  }

  try {
    const exerciseId = Number(params.exerciseId);
    const updated = await prisma.coachExerciseDescription.upsert({
      where: {coachId_exerciseId: {coachId: userId, exerciseId}},
      update: {description: description.trim()},
      create: {coachId: userId, exerciseId, description: description.trim()},
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
    await prisma.coachExerciseDescription.deleteMany({
      where: {coachId: userId, exerciseId},
    });
    return new NextResponse(null, {status: 204});
  } catch (err) {
    return errorResponse(extractErrorMessage(err), 500);
  }
}
