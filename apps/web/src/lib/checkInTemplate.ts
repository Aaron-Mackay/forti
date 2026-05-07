import { Prisma } from '@/generated/prisma/browser';
import prisma from '@lib/prisma';
import { parseCheckInTemplate } from '@/types/checkInTemplateTypes';
import type { CheckInTemplate } from '@/types/checkInTemplateTypes';

/** Fetch the check-in template for a given coach. Returns null if none configured. */
export async function getCoachTemplate(coachId: string): Promise<CheckInTemplate | null> {
  const user = await prisma.user.findUnique({
    where: { id: coachId },
    select: { checkInTemplate: true },
  });
  if (!user) return null;
  return parseCheckInTemplate(user.checkInTemplate);
}

/** Persist a check-in template to a coach's User row. */
export async function saveCoachTemplate(coachId: string, template: CheckInTemplate): Promise<void> {
  await prisma.user.update({
    where: { id: coachId },
    data: { checkInTemplate: template as unknown as Prisma.InputJsonValue },
  });
}

/** Remove the check-in template from a coach's User row (clients revert to default form). */
export async function deleteCoachTemplate(coachId: string): Promise<void> {
  await prisma.user.update({
    where: { id: coachId },
    data: { checkInTemplate: Prisma.DbNull },
  });
}

/**
 * Fetch the check-in template for a client by looking up their coach.
 * Returns null if the client has no coach or the coach has no template.
 */
export async function getTemplateForClient(userId: string): Promise<CheckInTemplate | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      coach: {
        select: { checkInTemplate: true },
      },
    },
  });
  if (!user?.coach) return null;
  return parseCheckInTemplate(user.coach.checkInTemplate);
}
