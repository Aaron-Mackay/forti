import Link from 'next/link';
import { getWorkoutsForWeek } from '@lib/api';
import BackButton from "@/components/BackButton";

export default async function WeekWorkoutsPage({ params }: { params: { userId: string, weekId: string } }) {
  const { userId, weekId } = await params;
  const workouts = await getWorkoutsForWeek(userId, weekId);

  return (
    <main className="p-6">
      <BackButton higherLevel={"Weeks"}/>
      <h1 className="text-xl font-semibold mb-2">Workouts</h1>
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
    </main>
  );
}