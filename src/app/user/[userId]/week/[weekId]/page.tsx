'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getWorkoutsForWeek } from '@lib/api';
import BackButton from "@/components/BackButton";

export default function WeekWorkoutsPage() {
  const { userId, weekId } = useParams();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkoutsForWeek(userId as string, weekId as string)
      .then(setWorkouts)
      .finally(() => setLoading(false));
  }, [userId, weekId]);

  return (
    <main className="p-6">
      <BackButton higherLevel={"Weeks"}/>
      <h1 className="text-xl font-semibold mb-2">Workouts</h1>
      {loading ? (
        <p>Loading workouts...</p>
      ) : (
        <ul className="space-y-2">
          {workouts.map((workout: any) => (
            <li key={workout.id}>
              <Link
                href={`/user/${userId}/week/${weekId}/workout/${workout.id}`}
                className="text-blue-600 underline"
              >
                {workout.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
