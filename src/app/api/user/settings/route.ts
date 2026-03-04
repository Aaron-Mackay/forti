import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { Prisma } from '@prisma/client';
import { parseDashboardSettings, DashboardSettings } from '@/types/settingsTypes';

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

  const body = await req.json() as { settings: Partial<DashboardSettings> };
  if (!body.settings || typeof body.settings !== 'object') {
    return NextResponse.json({ error: 'settings must be an object' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });

  const current = parseDashboardSettings(user?.settings);
  const merged: DashboardSettings = { ...current, ...body.settings };

  await prisma.user.update({
    where: { id: userId },
    data: { settings: merged as unknown as Prisma.InputJsonValue },
  });

  return NextResponse.json({ settings: merged });
}
