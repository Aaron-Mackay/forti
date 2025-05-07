'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getWorkoutExercise } from '@lib/api';

export default function WorkoutExercisePage() {
  const { exerciseId } = useParams();
  const [exerciseData, setExerciseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (exerciseId) {
      getWorkoutExercise(exerciseId as string)
        .then(setExerciseData)
        .finally(() => setLoading(false));
    }
  }, [exerciseId]);

  if (loading) return <p className="p-4">Loading exercise...</p>;
  if (!exerciseData) return <p className="p-4">No data found.</p>;

  const { exercise, sets } = exerciseData;

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">{exercise.name}</h1>
      {exercise.description && <p className="text-gray-600">{exercise.description}</p>}

      <h2 className="text-xl font-semibold mt-4">Sets</h2>
      <ul className="space-y-2">
        {sets.map((set: any, index: number) => (
          <li key={set.id} className="border p-4 rounded shadow-sm">
            <div className="flex justify-between">
              <div>
                <p><strong>Set {index + 1}</strong></p>
                <p>Reps: {set.reps}</p>
                <p>Weight: {set.weight ?? '-'} kg</p>
              </div>
              <div>
                {set.duration && <p>Duration: {set.duration}s</p>}
                {set.restTime && <p>Rest: {set.restTime}s</p>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
