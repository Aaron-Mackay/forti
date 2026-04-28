import prisma from '@/lib/prisma';
import { EventPrisma } from '@/types/dataTypes';

export async function getUserEvents(userId: string) {
  return prisma.event.findMany({
    where: { userId },
    orderBy: { startDate: 'asc' },
  });
}

export async function saveUserEvent(eventData: Omit<EventPrisma, 'id'>) {
  return prisma.event.create({
    data: eventData,
  });
}

export async function deleteUserEvent(eventId: number, userId: string) {
  return prisma.event.delete({
    where: { id: eventId, userId },
  });
}

export async function updateUserEvent(eventId: number, data: Partial<EventPrisma>) {
  return prisma.event.update({
    where: { id: eventId },
    data,
  });
}

export async function findOverlappingBlockEvent(userId: string, startDate: Date, endDate: Date) {
  return prisma.event.findFirst({
    where: {
      userId,
      eventType: 'BlockEvent',
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });
}
