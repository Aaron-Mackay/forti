'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getUserWeeks } from '@lib/api';

export default function UserWeeksPage() {
  const { userId } = useParams();
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserWeeks(userId as string)
      .then(setWeeks)
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-2">Weeks</h1>
      {loading ? (
        <p>Loading weeks...</p>
      ) : (
        <ul className="space-y-2">
          {weeks.map((week: any) => (
            <li key={week.id}>
              <Link
                href={`/user/${userId}/week/${week.id}`}
                className="text-blue-600 underline"
              >
                Week starting {new Date(week.startDate).toLocaleDateString()}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
