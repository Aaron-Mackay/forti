import { NextRequest, NextResponse } from 'next/server';
import { authenticationErrorResponse, isAuthenticationError, requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { ExerciseCategory, Prisma } from '@/generated/prisma/browser';
import { validationErrorResponse } from '@lib/apiResponses';
import { CreateExerciseRequestSchema, ExerciseListQuerySchema } from '@lib/contracts/exercises';

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const parsed = ExerciseListQuerySchema.safeParse({
      search: searchParams.get('search') ?? undefined,
      take: searchParams.get('take') ?? undefined,
      skip: searchParams.get('skip') ?? undefined,
    });

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const query = parsed.data;
    const visibleExerciseWhere: Prisma.ExerciseWhereInput = {
      OR: [{ createdByUserId: null }, { createdByUserId: userId }],
    };
    const where: Prisma.ExerciseWhereInput = query.search
      ? {
          AND: [
            visibleExerciseWhere,
            { name: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : visibleExerciseWhere;

    const exercises = await prisma.exercise.findMany({
      where,
      orderBy: { name: 'asc' },
      ...(query.take !== undefined ? { take: query.take } : {}),
      ...(query.skip !== undefined ? { skip: query.skip } : {}),
    });
    return NextResponse.json(exercises);
  } catch (err: unknown) {
    if (isAuthenticationError(err)) return authenticationErrorResponse();
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch exercises' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    const json = await req.json();
    const parsed = CreateExerciseRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, category, description, equipment, primaryMuscles, secondaryMuscles } = parsed.data;
    const resolvedCategory = (category ?? null) as ExerciseCategory | null;

    // Conflict check: user would see this exercise already (global or their own)
    const existing = await prisma.exercise.findFirst({
      where: {
        name,
        category: resolvedCategory,
        OR: [{ createdByUserId: null }, { createdByUserId: userId }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Exercise already exists', exercise: existing },
        { status: 409 }
      );
    }

    const exercise = await prisma.exercise.create({
      data: {
        name,
        category: resolvedCategory,
        description: description ?? null,
        equipment,
        primaryMuscles,
        secondaryMuscles,
        createdByUserId: userId,
      },
    });

    return NextResponse.json(exercise, { status: 201 });
  } catch (err: unknown) {
    if (isAuthenticationError(err)) return authenticationErrorResponse();
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to create exercise' },
      { status: 500 }
    );
  }
}
