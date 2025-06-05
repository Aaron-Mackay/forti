import {EditableUser} from "@/types/editableData";
import {Exercise, PrismaClient} from "@prisma/client";

const prisma = new PrismaClient();

export async function getUsers() {
  return prisma.user.findMany({
    include: {
      weeks: true,
    },
  });
}

export async function getExercises() {
  return prisma.exercise.findMany();
}

export async function getExercisesAndCategories() {
  const allExercises = await prisma.exercise.findMany({
    select: {
      id: true,
      name: true,
      category: true,
    },
  }) as Exercise[];

  const categories = [...new Set(allExercises
    .map(e => e.category as string)
    .filter(Boolean))
  ];

  return {allExercises, categories};
}

export async function getUserWeeks(userId: string) {
  const res = await fetch(`/api/weeks/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch weeks');
  return res.json();
}

export async function getWorkoutsForWeek(userId: string, weekId: string) {
  const res = await fetch(`/api/workouts/${userId}/${weekId}`);
  if (!res.ok) throw new Error('Failed to fetch workouts');
  return res.json();
}

export async function getWorkout(workoutId: string) {
  const res = await fetch(`/api/workout/${workoutId}`);
  if (!res.ok) throw new Error('Failed to fetch workout');
  return await res.json();
}

export async function getWorkoutExercise(exerciseId: string) {
    return prisma.workoutExercise.findUnique({
      where: {
        id: Number(exerciseId),
      },
      include: {
        exercise: true,
        sets: {orderBy: {order: 'asc'},}
      },
    });
}

export async function getUserData(userId: string): Promise<EditableUser> {
  return (await prisma.user.findUnique({
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
                  sets: {
                    orderBy: {order: 'asc'}
                  },
                },
              },
            },
          },
        },
      },
    },
  }));
}

export async function saveUserWorkoutData(userData: EditableUser) {
  const response = await fetch('/api/saveUserWorkoutData', {
    method: 'POST',
    body: JSON.stringify(userData),
    headers: {'Content-Type': 'application/json',},
  });

  if (!response.ok) {
    throw new Error('Failed to save workout data');
  }

  return await response.json(); // or just return response if you want
}