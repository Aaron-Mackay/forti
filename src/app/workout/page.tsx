'use client';

import { useEffect, useState } from 'react';

export default function WorkoutPage() {
  const [workout, setWorkout] = useState<any>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/workout/random')
      .then((res) => res.json())
      .then(setWorkout)
      .catch(() => setMessage('❌ Failed to load workout'));
  }, []);

  async function updateSet(setId: string, field: 'reps' | 'weight', value: number) {
    const res = await fetch(`/api/sets/${setId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });

    if (!res.ok) {
      const error = await res.text();
      setMessage(`❌ ${error}`);
    } else {
      setMessage('✅ Set updated');
    }
  }

  if (!workout) return <p className="p-4 text-center">Loading workout...</p>;

  return (
    <div className="max-w-2xl mx-auto mt-8 p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Workout: {workout.name}</h1>

      {workout.exercises.map((exercise: any) => (
        <div key={exercise.id} className="border p-4 rounded shadow">
          <h2 className="font-semibold text-lg mb-2">{exercise.name}</h2>
          <ul>
            {exercise.sets.map((set: any, index: number) => (
              <li key={set.id} className="grid grid-cols-3 gap-4 items-center mb-2">
                <span className="text-sm text-gray-700">Set {index + 1}:</span>

                <input
                  type="number"
                  defaultValue={set.reps}
                  onBlur={(e) => updateSet(set.id, 'reps', Number(e.target.value))}
                  className="w-full border px-2 py-1 rounded text-sm"
                  placeholder="Reps"
                />

                <input
                  type="number"
                  step="0.1"
                  defaultValue={set.weight}
                  onBlur={(e) => updateSet(set.id, 'weight', Number(e.target.value))}
                  className="w-full border px-2 py-1 rounded text-sm"
                  placeholder="Weight"
                />
              </li>
            ))}
          </ul>
        </div>
      ))}

      {message && <p className="text-sm mt-4 text-green-600">{message}</p>}
    </div>
  );
}
