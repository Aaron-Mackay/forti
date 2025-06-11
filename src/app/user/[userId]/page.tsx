import Link from 'next/link';
import {getUserWeeks} from '@lib/api';

export default async function UserWeeksPage({ params }: { params: { userId: string } }) {
  const { userId } = await params;
  const weeks = await getUserWeeks(userId);

  return (
    <main className="p-6">
      <ul className="space-y-2">
        {weeks.map((week: any) => (
          <li key={week.id}>
            <Link
              href={`/user/${userId}/week/${week.id}`}
              className="text-blue-600 underline"
            >
              Week {week.id}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}