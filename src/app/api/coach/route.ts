import { NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';

async function generateUniqueCoachCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const existing = await prisma.user.findUnique({ where: { coachCode: code } });
    if (!existing) return code;
  }
  throw new Error('Failed to generate a unique coach code');
}

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

  // Heal any existing coach who has coach mode active but no code (e.g. seeded or migrated users)
  let coachCode = user.coachCode;
  if (settings.coachModeActive && !coachCode) {
    coachCode = await generateUniqueCoachCode();
    await prisma.user.update({ where: { id: userId }, data: { coachCode } });
  }

  return NextResponse.json({
    coachCode,
    coachLogoUrl: user.coachLogoUrl ?? null,
    coachModeActive: settings.coachModeActive,
    currentCoach: user.coach ?? null,
    sentRequest: user.sentCoachRequest ?? null,
    pendingRequests: user.receivedCoachRequests,
    confirmedClients: user.clients,
  });
}
