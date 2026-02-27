import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import { z } from 'zod';
import prisma from '@lib/prisma';
import { Prisma } from '@prisma/client';

const CreateExerciseSchema = z.object({
  name: z.string().min(1, 'Exercise name is required'),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export type CreateExerciseRequest = z.infer<typeof CreateExerciseSchema>;

export async function POST(req: NextRequest) {
  try {
    // Require authentication
    await requireSession();

    const json = await req.json();
    const parsed = CreateExerciseSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, category, description } = parsed.data;

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

    // Create the exercise
    const exercise = await prisma.exercise.create({
      data: {
        name,
        category: category === null || category === undefined ? null : category,
        description: description === null || description === undefined ? null : description,
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
