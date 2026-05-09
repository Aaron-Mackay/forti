import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import getLoggedInUser from '@lib/getLoggedInUser';
import { SignalShellHarness } from './SignalShellHarness';

export const metadata: Metadata = {
  title: 'Signal shell preview',
};

export default async function SignalShellDevPage() {
  if (process.env.VERCEL_ENV === 'production') {
    notFound();
  }

  const user = await getLoggedInUser();
  const initials = (user.name ?? user.email ?? '·')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase() ?? '')
    .join('');

  return <SignalShellHarness userLabel={user.name ?? user.email ?? undefined} userInitials={initials || '·'} />;
}
