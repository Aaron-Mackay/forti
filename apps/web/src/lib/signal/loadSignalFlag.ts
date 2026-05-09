import { cache } from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@lib/auth';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';

export const loadSignalFlag = cache(async (): Promise<boolean> => {
  const session = await getServerSession(authOptions);
  if (!session) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { settings: true },
  });
  return parseDashboardSettings(user?.settings).signalUiEnabled;
});
