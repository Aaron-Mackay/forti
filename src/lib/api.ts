import {Exercise} from '@prisma/client';
import prisma from '@/lib/prisma';
import {fetchJson} from './fetchWrapper';
import {UserPrisma} from "@/types/dataTypes";

export async function getUsers() {
  return prisma.user.findMany({
    include: {weeks: true},
  });
}

export async function getExercises() {
  return prisma.exercise.findMany();
}

export async function getExercisesAndCategories() {
  const allExercises = await prisma.exercise.findMany({
    select: {id: true, name: true, category: true},
  }) as Exercise[];

  const categories = [...new Set(allExercises.map(e => e.category as string).filter(Boolean))];

  return {allExercises, categories};
}

export async function getUserData(userId: string): Promise<UserPrisma | null> {
  return prisma.user.findUnique({
    where: {id: Number(userId)},
    include: {
      weeks: {
        include: {
          workouts: {
            orderBy: {order: 'asc'},
            include: {
              exercises: {
                orderBy: {order: 'asc'},
                include: {
                  exercise: true,
                  sets: {orderBy: {order: 'asc'}},
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function saveUserWorkoutData(userData: UserPrisma) {
  // todo validation (zod?)
  return fetchJson('/api/saveUserWorkoutData', {
    method: 'POST',
    body: JSON.stringify(userData),
    headers: {'Content-Type': 'application/json'},
  });
}
