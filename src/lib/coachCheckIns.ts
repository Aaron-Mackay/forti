import type { Prisma } from '@/generated/prisma/browser';
import prisma from './prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';

const coachCheckInInclude = {
  user: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.WeeklyCheckInInclude;

export type CoachCheckInRecord = Prisma.WeeklyCheckInGetPayload<{
  include: typeof coachCheckInInclude;
}>;

export function mapCoachCheckIn<T extends {
  id: number;
  frontPhotoUrl: string | null;
  backPhotoUrl: string | null;
  sidePhotoUrl: string | null;
}>(checkIn: T): T {
  return {
    ...checkIn,
    frontPhotoUrl: checkIn.frontPhotoUrl ? `/api/check-in/photos/${checkIn.id}/front` : null,
    backPhotoUrl: checkIn.backPhotoUrl ? `/api/check-in/photos/${checkIn.id}/back` : null,
    sidePhotoUrl: checkIn.sidePhotoUrl ? `/api/check-in/photos/${checkIn.id}/side` : null,
  };
}

export async function getCoachCheckInAccess(coachId: string) {
  const coach = await prisma.user.findUnique({
    where: { id: coachId },
    select: {
      settings: true,
      clients: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const settings = parseDashboardSettings(coach?.settings);

  return {
    coachModeActive: settings.coachModeActive,
    clients: coach?.clients ?? [],
    clientIds: (coach?.clients ?? []).map(client => client.id),
  };
}

export async function getCoachCheckInById(coachId: string, checkInId: number) {
  const access = await getCoachCheckInAccess(coachId);

  if (!access.coachModeActive) {
    return { status: 'forbidden' as const };
  }

  const checkIn = await prisma.weeklyCheckIn.findUnique({
    where: { id: checkInId },
    include: coachCheckInInclude,
  });

  if (!checkIn || !access.clientIds.includes(checkIn.userId)) {
    return { status: 'not_found' as const };
  }

  return {
    status: 'ok' as const,
    checkIn: mapCoachCheckIn(checkIn),
  };
}
