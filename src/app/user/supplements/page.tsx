import { getServerSession } from 'next-auth/next';
import { authOptions } from '@lib/auth';
import { notFound } from 'next/navigation';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import SupplementsClient from './SupplementsClient';

export default async function SupplementsPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user.id;
  if (!userId) return notFound();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      settings: true,
      clients: { select: { id: true, name: true } },
    },
  });

  if (!user) return notFound();

  const settings = parseDashboardSettings(user.settings);
  if (!settings.showSupplements) return notFound();

  const clients = settings.coachModeActive ? (user.clients ?? []) : [];

  return (
    <SupplementsClient
      coachModeActive={settings.coachModeActive}
      clients={clients}
    />
  );
}
