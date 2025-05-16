'use client';

import {useEffect, useState} from 'react';
import {useParams} from 'next/navigation';
import {getWorkoutExercise} from '@lib/api';
import BackButton from "@/components/BackButton";
import {queueOrSendRequest, syncQueuedRequests} from "@/utils/offlineSync";
import NetworkStatusBanner from "@/components/NetworkStatusBanner";


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

  useEffect(() => {
    const sync = () => syncQueuedRequests();
    window.addEventListener('online', sync);
    return () => {
      window.removeEventListener('online', sync);
    };
  }, []);

  useEffect(() => {
    // Register the service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    }

    // iOS fallback: sync on load + online
    const trySync = () => syncQueuedRequests();
    trySync(); // on page load
    window.addEventListener('online', trySync);
    return () => window.removeEventListener('online', trySync);
  }, []);

  const handleUpdate = async (setId: number, field: 'reps' | 'weight', value: string) => {
    let numericValue = value === ""
      ? 0
      : field === 'reps'
        ? parseInt(value)
        : parseFloat(value);
    if (numericValue === "") numericValue = 0
    if (isNaN(numericValue)) return;

    await queueOrSendRequest(`/api/sets/${setId}`, 'PATCH', {[field]: numericValue})
  };

  if (loading) return <p className="p-4">Loading exercise...</p>;
  if (!exerciseData) return <p className="p-4">No data found.</p>;

  const {exercise, sets} = exerciseData;

  return (
    <main className="p-6 space-y-6">
      <NetworkStatusBanner/>
      <div
        className="toast-container position-fixed bottom-0 end-0 p-3"
        id="toast-container"
      ></div>
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
