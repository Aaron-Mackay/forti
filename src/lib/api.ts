import {EditableUser} from "@/types/editableData";
import {PrismaClient} from "@prisma/client";

const prisma = new PrismaClient();

export async function getUsers() {
  return prisma.user.findMany({
    include: {
      weeks: true,
    },
  });
}

export async function getExercises() {
  const res = await fetch('/api/exercises');
  if (!res.ok) throw new Error('Failed to fetch exercises');
  return res.json();
}

export async function getExercisesAndCategories() {
  const res = await fetch('/api/exercises/all');
  if (!res.ok) throw new Error('Failed to fetch exercises and categories');
  return res.json();
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
  const res = await fetch(`/api/workoutExercises/${exerciseId}`);
  if (!res.ok) throw new Error('Failed to fetch workout exercise');
  return res.json();
}

export async function getUserData(userId: string): Promise<EditableUser> {
  const res = await fetch(`/api/user/${userId}/plan`);
  if (!res.ok) throw new Error('Failed to fetch user stateData');
  return res.json();
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
