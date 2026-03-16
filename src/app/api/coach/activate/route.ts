import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { parseDashboardSettings, Settings } from '@/types/settingsTypes';
import { Prisma } from '@prisma/client';

async function generateUniqueCoachCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const existing = await prisma.user.findUnique({ where: { coachCode: code } });
    if (!existing) return code;
  }
  throw new Error('Failed to generate a unique coach code');
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const userId = session.user.id;

  const body = await req.json() as { active: boolean };
  if (typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'active must be a boolean' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coachCode: true, settings: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Generate code on first activation if not already assigned
  let coachCode = user.coachCode;
  if (body.active && !coachCode) {
    coachCode = await generateUniqueCoachCode();
  }

  const current = parseDashboardSettings(user.settings);
  const merged: Settings = { ...current, coachModeActive: body.active };

  await prisma.user.update({
    where: { id: userId },
    data: {
      coachCode: coachCode ?? undefined,
      settings: merged as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ coachCode, coachModeActive: body.active });
}
