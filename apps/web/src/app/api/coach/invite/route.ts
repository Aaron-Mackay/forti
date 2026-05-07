import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@lib/requireSession';
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import { errorResponse, validationErrorResponse } from '@lib/apiResponses';
import { sendCoachInviteEmail } from '@lib/notifications';

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const userId = session.user.id;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }
  const { email } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, coachCode: true, settings: true },
  });
  if (!user) {
    return errorResponse('User not found', 404);
  }

  const settings = parseDashboardSettings(user.settings);
  if (!settings.coachModeActive || !user.coachCode) {
    return errorResponse('Coach mode is not active', 400);
  }

  const inviteLink = `${process.env.NEXTAUTH_URL}/coach/${user.coachCode}`;
  await sendCoachInviteEmail({ email, coachName: user.name ?? 'Your coach', inviteLink });

  return Response.json({ ok: true });
}
