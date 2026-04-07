import { NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';

export async function GET() {
  const session = await requireSession();
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      coachCode: true,
      coachLogoUrl: true,
      settings: true,
      coachId: true,
      coach: { select: { id: true, name: true } },
      sentCoachRequest: {
        select: {
          id: true,
          status: true,
          coach: { select: { id: true, name: true } },
        },
      },
      receivedCoachRequests: {
        where: { status: 'Pending' },
        select: {
          id: true,
          client: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      clients: {
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const settings = parseDashboardSettings(user.settings);

  return NextResponse.json({
    coachCode: user.coachCode,
    coachLogoUrl: user.coachLogoUrl ?? null,
    coachModeActive: settings.coachModeActive,
    currentCoach: user.coach ?? null,
    sentRequest: user.sentCoachRequest ?? null,
    pendingRequests: user.receivedCoachRequests,
    confirmedClients: user.clients,
  });
}
