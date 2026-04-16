import { getServerSession } from 'next-auth/next';
import { authOptions } from '@lib/auth';

export async function getSessionActorUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
