'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getWorkout } from '@lib/api';
import Link from "next/link";

export default function WorkoutDetailPage() {
  const { workoutId,userId, weekId  } = useParams();
  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkout(workoutId as string)
      .then(setWorkout)
      .finally(() => setLoading(false));
  }, [workoutId]);

  if (loading) {
    return <main className="p-6">Loading workout...</main>;
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">{workout.name}</h1>
      {workout.exercises.map((ex: any) => (
        <div key={ex.id} className="mb-4">
            <Link
              href={`/user/${userId}/week/${weekId}/workout/${workout.id}/exercise/${ex.id}`}
              className="text-blue-600 underline"
            >
              {ex.exercise.name}
            </Link>
          <h2 className="font-semibold">{ex.exercise.name}</h2>
          <ul className="pl-4 list-disc">
            {ex.sets.map((set: any, idx: number) => (
              <li key={set.id}>
                Set {idx + 1}: {set.reps} reps @ {set.weight ?? 0}kg
              </li>
            ))}
          </ul>
        </div>
      ))}
    </main>
  );
}
