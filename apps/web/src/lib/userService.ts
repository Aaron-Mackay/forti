import prisma from '@/lib/prisma';
import { UserPrisma } from '@/types/dataTypes';
import type { Prisma } from '@/generated/prisma/browser';

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

const ACTIVE_PLAN_TREE_INCLUDE = {
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
} as const satisfies Prisma.PlanInclude;

export type ActivePlanTree = Prisma.PlanGetPayload<{ include: typeof ACTIVE_PLAN_TREE_INCLUDE }>;

export interface ActivePlanWithStats {
  activePlan: ActivePlanTree | null;
  activePlanId: number | null;
  hasAnyPlan: boolean;
  hasAnyCompletedWorkout: boolean;
  weeklyTrainingCount: number;
}

export async function getActivePlanWithStats(userId: string): Promise<ActivePlanWithStats | null> {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  const [user, planCount, anyCompleted, weeklyCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        activePlanId: true,
        activePlan: { include: ACTIVE_PLAN_TREE_INCLUDE },
      },
    }),
    prisma.plan.count({ where: { userId } }),
    prisma.workout.findFirst({
      where: { week: { plan: { userId } }, dateCompleted: { not: null } },
      select: { id: true },
    }),
    prisma.workout.count({
      where: {
        week: { plan: { userId } },
        dateCompleted: { gte: monday, lte: today },
      },
    }),
  ]);

  if (!user) return null;

  return {
    activePlan: user.activePlan,
    activePlanId: user.activePlanId,
    hasAnyPlan: planCount > 0,
    hasAnyCompletedWorkout: anyCompleted !== null,
    weeklyTrainingCount: weeklyCount,
  };
}

export async function getUserCheckIns(userId: string) {
  return prisma.weeklyCheckIn.findMany({
    where: { userId },
    orderBy: { weekStartDate: 'asc' },
  });
}
