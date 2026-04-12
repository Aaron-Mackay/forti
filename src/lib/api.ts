import {Exercise, ExerciseCategory, Prisma} from '@/generated/prisma/browser';
import prisma from '@/lib/prisma';
import {MetricPrisma, EventPrisma, PlanPrisma, UserPrisma} from "@/types/dataTypes";

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
    where: {id: userId},
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

  return user
}


export async function getUserEvents(userId: string) {
  return prisma.event.findMany({
    where: {userId: userId},
    orderBy: {startDate: 'asc'}
  })
}

export async function getUserMetrics(userId: string) {
  return prisma.metric.findMany({
    where: {userId: userId},
    orderBy: {date: 'asc'}
  })
}

export async function getUserCheckIns(userId: string) {
  return prisma.weeklyCheckIn.findMany({
    where: {userId},
    orderBy: {weekStartDate: 'asc'},
  });
}

export async function updateUserMetric(metric: Omit<MetricPrisma, 'id' | 'customMetrics'> & { customMetrics: Prisma.InputJsonValue | null }) {
  const {customMetrics, ...rest} = metric;
  // Prisma nullable JSON fields need Prisma.JsonNull (not null) to explicitly clear them
  const customMetricsValue = customMetrics === null ? Prisma.JsonNull : customMetrics;
  return await prisma.metric.upsert({
    where: {
      userId_date: {
        userId: metric.userId,
        date: metric.date,
      }
    },
    update: {...rest, customMetrics: customMetricsValue},
    create: {...rest, customMetrics: customMetricsValue},
  });
}

export async function saveUserEvent(eventData: Omit<EventPrisma, 'id'>) {
  return await prisma.event.create({
    data: eventData,
  });
}

function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = {...obj};
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

type PlanExerciseSeed = {
  name: string;
  category: ExerciseCategory | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
};

function isPrismaUniqueConstraintError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string';
}

function getPlanExerciseKey(name: string, category: ExerciseCategory | null): string {
  return `${name}::${category ?? 'null'}`;
}

async function resolvePlanExerciseIds(
  planData: PlanPrisma,
): Promise<Map<string, number>> {
  const uniqueExercises = new Map<string, PlanExerciseSeed>();

  for (const week of planData.weeks) {
    for (const workout of week.workouts) {
      for (const workoutExercise of workout.exercises) {
        const category = workoutExercise.exercise.category ?? null;
        const key = getPlanExerciseKey(workoutExercise.exercise.name, category);
        if (!uniqueExercises.has(key)) {
          uniqueExercises.set(key, {
            name: workoutExercise.exercise.name,
            category,
            primaryMuscles: workoutExercise.exercise.primaryMuscles ?? [],
            secondaryMuscles: workoutExercise.exercise.secondaryMuscles ?? [],
          });
        }
      }
    }
  }

  if (uniqueExercises.size === 0) return new Map();

  const existing = await prisma.exercise.findMany({
    where: {
      OR: Array.from(uniqueExercises.values()).map((exercise) => ({
        name: exercise.name,
        category: exercise.category,
        OR: [{ createdByUserId: planData.userId }, { createdByUserId: null }],
      })),
    },
    select: {
      id: true,
      name: true,
      category: true,
      createdByUserId: true,
    },
  });

  const resolvedIds = new Map<string, number>();
  for (const exercise of existing) {
    const key = getPlanExerciseKey(exercise.name, exercise.category);
    const existingId = resolvedIds.get(key);
    if (existingId == null || exercise.createdByUserId === planData.userId) {
      resolvedIds.set(key, exercise.id);
    }
  }

  for (const exercise of uniqueExercises.values()) {
    const key = getPlanExerciseKey(exercise.name, exercise.category);
    if (resolvedIds.has(key)) continue;

    try {
      const created = await prisma.exercise.create({
        data: {
          name: exercise.name,
          category: exercise.category,
          createdByUserId: planData.userId,
          primaryMuscles: exercise.primaryMuscles,
          secondaryMuscles: exercise.secondaryMuscles,
        },
        select: { id: true },
      });
      resolvedIds.set(key, created.id);
    } catch (error) {
      if (!isPrismaUniqueConstraintError(error) || error.code !== 'P2002') {
        throw error;
      }

      const existingExercise = await prisma.exercise.findFirst({
        where: {
          name: exercise.name,
          category: exercise.category,
          OR: [{ createdByUserId: planData.userId }, { createdByUserId: null }],
        },
        orderBy: { createdByUserId: 'desc' },
        select: { id: true },
      });

      if (!existingExercise) throw error;
      resolvedIds.set(key, existingExercise.id);
    }
  }

  return resolvedIds;
}

export async function saveUserPlan(planData: PlanPrisma): Promise<number> {
  const exerciseIdsByKey = await resolvePlanExerciseIds(planData);

  return prisma.$transaction(async (tx) => {
    const existingPlanCount = await tx.plan.count({
      where: { userId: planData.userId },
    });

    const uploadedPlan = await tx.plan.create({
      data: {
        ...omit(planData, ["weeks", "id", "userId"]),
        user: {connect: {id: planData.userId}}
      }
    });

    if (existingPlanCount === 0) {
      await tx.user.update({
        where: { id: planData.userId },
        data: { activePlanId: uploadedPlan.id },
      });
    }

    for (const week of planData.weeks) {
      const uploadedWeek = await tx.week.create({
        data: {...omit(week, ["workouts", "id"]), planId: uploadedPlan.id}
      });
      for (const workout of week.workouts) {
        const uploadedWorkout = await tx.workout.create({
          data: {...omit(workout, ["exercises", "id"]), weekId: uploadedWeek.id}
        });
        for (const exercise of workout.exercises) {
          const exerciseId = exerciseIdsByKey.get(
            getPlanExerciseKey(exercise.exercise.name, exercise.exercise.category ?? null),
          );
          if (exerciseId == null) {
            throw new Error(`Missing exercise id for ${exercise.exercise.name}`);
          }

          const uploadedWorkoutExercise = await tx.workoutExercise.create({
            data: {
              workoutId: uploadedWorkout.id,
              order: exercise.order,
              restTime: exercise.restTime,
              repRange: exercise.repRange,
              targetRpe: exercise.targetRpe ?? null,
              targetRir: exercise.targetRir ?? null,
              exerciseId,
              isBfr: exercise.isBfr ?? false,
            },
          });
          const idMap = new Map<number, number>();
          const regularSets = exercise.sets.filter(s => !s.isDropSet);
          const dropSets = exercise.sets.filter(s => s.isDropSet);
          for (const set of regularSets) {
            const created = await tx.exerciseSet.create({
              data: {...omit(set, ["id"]), workoutExerciseId: uploadedWorkoutExercise.id}
            });
            idMap.set(set.id, created.id);
          }
          for (const set of dropSets) {
            await tx.exerciseSet.create({
              data: {
                ...omit(set, ["id"]),
                workoutExerciseId: uploadedWorkoutExercise.id,
                parentSetId: set.parentSetId != null ? (idMap.get(set.parentSetId) ?? null) : null,
              }
            });
          }
        }
      }
    }
    return uploadedPlan.id;
  }, { timeout: 15000 });
}

export async function deleteUserEvent(eventId: number, userId: string) {
  return await prisma.event.delete({
    where: {id: eventId, userId},
  });
}

export async function updateUserEvent(eventId: number, data: Partial<EventPrisma>) {
  return await prisma.event.update({
    where: {id: eventId},
    data,
  });
}

export async function findOverlappingBlockEvent(userId: string, startDate: Date, endDate: Date) {
  return await prisma.event.findFirst({
    where: {
      userId,
      eventType: 'BlockEvent',
      startDate: {lte: endDate},
      endDate: {gte: startDate},
    },
  });
}

export async function getAllLinkedPlans(userId: string) {
  const [user, userPlans, clientPlans] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { activePlanId: true },
    }),
    prisma.plan.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        order: true,
        lastActivityDate: true,
        _count: {
          select: {
            weeks: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    }),

    prisma.plan.findMany({
      where: {
        user: { coachId: userId },
      },
      select: {
        id: true,
        name: true,
        order: true,
        userId: true,
        lastActivityDate: true,
        _count: {
          select: {
            weeks: true,
          },
        },
        user: { select: { id: true, name: true } },
      },
      orderBy: [{ userId: 'asc' }, { order: 'asc' }],
    }),
  ])

  return {
    activePlanId: user?.activePlanId ?? null,
    userPlans: userPlans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      order: plan.order,
      weekCount: plan._count.weeks,
      lastActivityDate: plan.lastActivityDate,
      isActive: plan.id === user?.activePlanId,
    })),
    clientPlans,
  }
}

export async function getCoachClients(coachId: string): Promise<{ id: string; name: string | null }[]> {
  return prisma.user.findMany({
    where: { coachId },
    select: { id: true, name: true },
  });
}

export async function getUserFromPlan(planId: string) {
  const plan = await prisma.plan.findUnique({
    where: { id: Number(planId) },
    select: {
      user: {
        select: {
          id: true,
          coachId: true,
        },
      },
    },
  });

  return plan?.user || null;
}

export async function getCoachFromUser(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      coachId: true,
    }
  })
}
