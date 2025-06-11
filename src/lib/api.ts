import { EditableUser } from '@/types/editableData';
import {Exercise, Prisma} from '@prisma/client';
import prisma from '@/lib/prisma';
import { fetchJson } from './fetchWrapper';

export async function getUsers() {
  return prisma.user.findMany({
    include: { weeks: true },
  });
}

export async function getExercises() {
  return prisma.exercise.findMany();
}

export async function getExercisesAndCategories() {
  const allExercises = await prisma.exercise.findMany({
    select: { id: true, name: true, category: true },
  }) as Exercise[];

  const categories = [...new Set(allExercises.map(e => e.category as string).filter(Boolean))];

  return { allExercises, categories };
}

export async function getUserWeeks(userId: string) {
  return prisma.week.findMany({
    where: {
      userId: parseInt(userId),
    },
  });
}

export async function getWorkoutsForWeek(userId: string, weekId: string) {
  return prisma.workout.findMany({
    where: {
      week: {
        userId: Number(userId),
        id: Number(weekId),
      },
    },
    include: {
      exercises: {
        include: {
          exercise: true,
          sets: true,
        },
      },
    },
  })
}

export async function getWorkout(workoutId: string) {
  return fetchJson(`/api/workout/${workoutId}`);
}

export async function getWorkoutExercise(exerciseId: string) {
  return prisma.workoutExercise.findUnique({
    where: { id: Number(exerciseId) },
    include: { exercise: true, sets: { orderBy: { order: 'asc' } } },
  });
}

export async function getUserData(userId: string): Promise<EditableUser> {
  return prisma.user.findUnique({
    where: { id: Number(userId) },
    include: {
      weeks: {
        include: {
          workouts: {
            orderBy: { order: 'asc' },
            include: {
              exercises: {
                orderBy: { order: 'asc' },
                include: {
                  exercise: true,
                  sets: { orderBy: { order: 'asc' } },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function saveUserWorkoutData(userData: EditableUser) {
  return fetchJson('/api/saveUserWorkoutData', {
    method: 'POST',
    body: JSON.stringify(userData),
    headers: { 'Content-Type': 'application/json' },
  });
}
