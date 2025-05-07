'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUsers } from '@lib/api';

export default function HomePage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Users</h1>
      {loading ? (
        <p>Loading users...</p>
      ) : (
        <ul className="space-y-2">
          {users.map((user: any) => (
            <li key={user.id}>
              <Link href={`/user/${user.id}`} className="text-blue-600 underline">
                {user.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
