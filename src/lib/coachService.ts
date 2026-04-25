import prisma from '@/lib/prisma';

export async function getCoachClients(coachId: string): Promise<{ id: string; name: string | null }[]> {
  return prisma.user.findMany({
    where: { coachId },
    select: { id: true, name: true },
  });
}

export async function getCoachFromUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      coachId: true,
    },
  });
}
