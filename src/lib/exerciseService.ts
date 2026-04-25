import { Exercise } from '@/generated/prisma/browser';
import prisma from '@/lib/prisma';

export async function getExercises() {
  return prisma.exercise.findMany();
}

export async function getExercisesAndCategories() {
  const allExercises = await prisma.exercise.findMany({
    select: { id: true, name: true, category: true },
  }) as Exercise[];

  const categories = [...new Set(allExercises.map((e) => e.category as string).filter(Boolean))];

  return { allExercises, categories };
}
