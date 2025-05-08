'use client';

import {useEffect, useState} from 'react';
import {useParams} from 'next/navigation';
import {getWorkoutExercise, updateSet} from '@lib/api';
import BackButton from "@/components/BackButton";

export default function WorkoutExercisePage() {
  const {exerciseId} = useParams();
  const [exerciseData, setExerciseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (exerciseId) {
      getWorkoutExercise(exerciseId as string)
        .then(setExerciseData)
        .finally(() => setLoading(false));
    }
  }, [exerciseId]);

  const handleUpdate = async (setId: number, field: 'reps' | 'weight', value: string) => {
    let numericValue = value === ""
      ? 0
      : field === 'reps'
        ? parseInt(value)
        : parseFloat(value);
    if (numericValue === "") numericValue = 0
    if (isNaN(numericValue)) return;

    await updateSet(setId, {[field]: numericValue});
  };

  if (loading) return <p className="p-4">Loading exercise...</p>;
  if (!exerciseData) return <p className="p-4">No data found.</p>;

  const {exercise, sets} = exerciseData;

  return (
    <main className="p-6 space-y-6">
      <BackButton higherLevel={"Workout"}/>
      <h1 className="text-2xl font-bold">{exercise.name}</h1>
      {exercise.description && <p className="text-gray-600">{exercise.description}</p>}

      <table className="w-full border mt-6 text-left">
        <thead className="bg-gray-100">
        <tr>
          <th className="p-2 border">Set #</th>
          <th className="p-2 border">Reps</th>
          <th className="p-2 border">Weight (kg)</th>
        </tr>
        </thead>
        <tbody>
        {sets.map((set: any, index: number) => (
          <tr key={set.id} className="border-t">
            <td className="p-2 border">{index + 1}</td>
            <td className="p-2 border">
              <input
                type="number"
                defaultValue={set.reps}
                className="w-full px-2 py-1 border rounded"
                onBlur={(e) => handleUpdate(set.id, 'reps', e.target.value)}
              />
            </td>
            <td className="p-2 border">
              <input
                type="number"
                defaultValue={set.weight ?? ''}
                className="w-full px-2 py-1 border rounded"
                onBlur={(e) => handleUpdate(set.id, 'weight', e.target.value)}
              />
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </main>
  );
}
