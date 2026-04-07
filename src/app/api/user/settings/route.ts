import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { Prisma } from '@/generated/prisma/browser';
import { parseDashboardSettings, Settings } from '@/types/settingsTypes';

async function generateUniqueCoachCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
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
    select: { settings: true },
  });

  const settings = parseDashboardSettings(user?.settings);
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession();
  const userId = session.user.id;

  const body = await req.json() as { settings: Partial<Settings> };
  if (!body.settings || typeof body.settings !== 'object') {
    return NextResponse.json({ error: 'settings must be an object' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true, coachCode: true },
  });

  const current = parseDashboardSettings(user?.settings);
  const merged: Settings = { ...current, ...body.settings };
  const shouldGenerateCoachCode = merged.coachModeActive && !user?.coachCode;
  const coachCode = shouldGenerateCoachCode ? await generateUniqueCoachCode() : user?.coachCode;

  await prisma.user.update({
    where: { id: userId },
    data: {
      settings: merged as unknown as Prisma.InputJsonValue,
      ...(coachCode ? { coachCode } : {}),
    },
  });

  return NextResponse.json({ settings: merged });
}
