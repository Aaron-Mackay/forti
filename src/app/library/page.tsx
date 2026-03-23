import { getServerSession } from 'next-auth/next';
import { authOptions } from '@lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import CustomAppBar from '@/components/CustomAppBar';
import LibraryClient from './LibraryClient';

export default async function LibraryPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const userId = session.user.id;

  const [user, ownAssets] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { coachId: true, settings: true },
    }),
    prisma.libraryAsset.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const settings = parseDashboardSettings(user?.settings);
  const coachId = user?.coachId ?? null;

  const [coachAssets, coachUser] = await Promise.all([
    coachId
      ? prisma.libraryAsset.findMany({
          where: { userId: coachId, isCoachAsset: true },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
    coachId
      ? prisma.user.findUnique({ where: { id: coachId }, select: { name: true } })
      : Promise.resolve(null),
  ]);

  return (
    <>
      <CustomAppBar title="Library" />
      <LibraryClient
        ownAssets={ownAssets}
        coachAssets={coachAssets}
        coachName={coachUser?.name ?? null}
        isCoach={settings.coachModeActive}
        userId={userId}
      />
    </>
  );
}
