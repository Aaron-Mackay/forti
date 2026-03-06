import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import { z } from 'zod';
import prisma from '@lib/prisma';
import { Prisma } from '@prisma/client';
import { EXERCISE_EQUIPMENT, EXERCISE_MUSCLES } from '@/types/dataTypes';

const CreateExerciseSchema = z.object({
  name: z.string().min(1, 'Exercise name is required'),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  equipment: z.array(z.enum(EXERCISE_EQUIPMENT)).min(1, 'At least one piece of equipment is required'),
  primaryMuscles: z.array(z.enum(EXERCISE_MUSCLES)).min(1, 'At least one primary muscle is required'),
  secondaryMuscles: z.array(z.enum(EXERCISE_MUSCLES)).default([]),
});

export type CreateExerciseRequest = z.infer<typeof CreateExerciseSchema>;

export async function GET(_req: NextRequest) {
  try {
    await requireSession();
    const exercises = await prisma.exercise.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json(exercises);
  } catch (err: unknown) {
    if (err instanceof NextResponse) return err;
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch exercises' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSession();

    const json = await req.json();
    const parsed = CreateExerciseSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, category, description, equipment, primaryMuscles, secondaryMuscles } = parsed.data;

    // Build the where clause for unique lookup
    // Type assertion is needed because Prisma's type system doesn't handle nullable fields in unique constraints well
    const whereClause: Prisma.ExerciseWhereUniqueInput = {
      name_category: {
        name,
        category: (category ?? null) as string | null,
      } as Prisma.ExerciseName_categoryCompoundUniqueInput,
    };

    // Check if exercise already exists (unique by name + category)
    const existing = await prisma.exercise.findUnique({
      where: whereClause,
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
        category: category ?? null,
        description: description ?? null,
        equipment,
        primaryMuscles,
        secondaryMuscles,
      },
    });

    return NextResponse.json(exercise, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof NextResponse) return err;
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to create exercise' },
      { status: 500 }
    );
  }
}
