import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { Prisma } from '@/generated/prisma/browser';
import { parseDashboardSettings, Settings } from '@/types/settingsTypes';
import { errorResponse, validationErrorResponse } from '@lib/apiResponses';
import { generateUniqueCoachCode } from '@lib/coachCode';
import {
  UserSettingsResponseSchema,
  UserSettingsUpdateRequestSchema,
} from '@forti/shared';

export async function GET() {
  const session = await requireSession();
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });

  const settings = parseDashboardSettings(user?.settings);
  return NextResponse.json(UserSettingsResponseSchema.parse({ settings }));
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession();
  const userId = session.user.id;

  const json = await req.json().catch(() => null);
  if (json == null) return errorResponse('Invalid JSON body', 400);

  const parsed = UserSettingsUpdateRequestSchema.safeParse(json);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true, coachCode: true },
  });

  const current = parseDashboardSettings(user?.settings);
  const merged: Settings = { ...current, ...(parsed.data.settings as Partial<Settings>) };
  const shouldGenerateCoachCode = merged.coachModeActive && !user?.coachCode;
  const coachCode = shouldGenerateCoachCode ? await generateUniqueCoachCode() : user?.coachCode;

  await prisma.user.update({
    where: { id: userId },
    data: {
      settings: merged as unknown as Prisma.InputJsonValue,
      ...(coachCode ? { coachCode } : {}),
    },
  });

  return NextResponse.json(UserSettingsResponseSchema.parse({ settings: merged }));
}
