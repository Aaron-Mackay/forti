import {Exercise} from '@prisma/client';
import prisma from '@/lib/prisma';
import {fetchJson} from './fetchWrapper';
import {DayMetricPrisma, EventPrisma, UserPrisma} from "@/types/dataTypes";

export async function getUsers() {
  return prisma.user.findMany();
}

export async function getExercises() {
  return prisma.exercise.findMany();
}

export async function getExercisesAndCategories() {
  const allExercises = await prisma.exercise.findMany({
    select: {id: true, name: true, category: true},
  }) as Exercise[];

  const categories = [...new Set(allExercises.map(e => e.category as string).filter(Boolean))];

  return {allExercises, categories};
}

export async function getUserData(userId: string): Promise<UserPrisma | null> {
  const user = await prisma.user.findUnique({
    where: {id: Number(userId)},
    include: {
      plans: {
        orderBy: {order: 'asc'},
        include: {
          weeks: {
            orderBy: {order: 'asc'},
            include: {
              workouts: {
                orderBy: {order: 'asc'},
                include: {
                  exercises: {
                    orderBy: {order: 'asc'},
                    include: {
                      exercise: true,
                      sets: {orderBy: {order: 'asc'}},
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  return user
}


export async function getUserEvents(userId: string) {
  return prisma.event.findMany({
    where: {userId: Number(userId)},
  })
}

export async function getUserDayMetrics(userId: string) {
  return prisma.dayMetric.findMany({
    where: {userId: Number(userId)},
    orderBy: {date: 'asc'}
  })
}

export async function updateUserDayMetric(dayMetric: Omit<DayMetricPrisma, 'id'>) {
  return await prisma.dayMetric.upsert({
    where: {
      userId_date: {
        userId: Number(dayMetric.userId),
        date: dayMetric.date,
      }
    },
    update: dayMetric,
    create: dayMetric
  });
}

export async function saveUserWorkoutData(userData: UserPrisma) {
  // todo validation (zod?)
  return fetchJson('/api/saveUserWorkoutData', {
    method: 'POST',
    body: JSON.stringify(userData),
    headers: {'Content-Type': 'application/json'},
  });
}

export async function saveUserEvent(eventData: Omit<EventPrisma, 'id'>) {
  return await prisma.event.create({
    data: eventData,
  });
}

export async function deleteUserEvent(eventId: number) {
  return await prisma.event.delete({
    where: {id: eventId},
  });
}

export async function updateUserEvent(eventId: number, data: Partial<EventPrisma>) {
  return await prisma.event.update({
    where: {id: eventId},
    data,
  });
}

export async function findOverlappingBlockEvent(userId: number, startDate: Date, endDate: Date) {
  return await prisma.event.findFirst({
    where: {
      userId: Number(userId),
      eventType: 'BlockEvent',
      startDate: {lte: endDate},
      endDate: {gte: startDate},
    },
  });
}
