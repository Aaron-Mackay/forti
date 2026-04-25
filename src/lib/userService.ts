import prisma from '@/lib/prisma';
import { UserPrisma } from '@/types/dataTypes';

export async function getUsers() {
  return prisma.user.findMany();
}

export async function getUserData(userId: string): Promise<UserPrisma | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      plans: {
        orderBy: { order: 'asc' },
        include: {
          weeks: {
            orderBy: { order: 'asc' },
            include: {
              workouts: {
                orderBy: { order: 'asc' },
                include: {
                  exercises: {
                    orderBy: { order: 'asc' },
                    include: {
                      exercise: true,
                      sets: { orderBy: { order: 'asc' } },
                      substitutedFor: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      userExerciseNotes: true,
    },
  });

  if (!user) return null;

  return user;
}

export async function getUserCheckIns(userId: string) {
  return prisma.weeklyCheckIn.findMany({
    where: { userId },
    orderBy: { weekStartDate: 'asc' },
  });
}
