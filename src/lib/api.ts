// lib/api.ts

export async function getUsers() {
  const res = await fetch('/api/users');
  if (!res.ok) throw new Error('Failed to fetch users');
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
  const res = await fetch(`/api/exercises/${exerciseId}`);
  if (!res.ok) throw new Error('Failed to fetch workout exercise');
  return res.json();
}

