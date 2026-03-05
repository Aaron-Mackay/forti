import {Exercise} from '@prisma/client';
import prisma from '@/lib/prisma';
import {DayMetricPrisma, EventPrisma, PlanPrisma, UserPrisma} from "@/types/dataTypes";

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

export async function getUserDayMetrics(userId: string) {
  return prisma.dayMetric.findMany({
    where: {userId: userId},
    orderBy: {date: 'asc'}
  })
}

export async function updateUserDayMetric(dayMetric: Omit<DayMetricPrisma, 'id'>) {
  return await prisma.dayMetric.upsert({
    where: {
      userId_date: {
        userId: dayMetric.userId,
        date: dayMetric.date,
      }
    },
    update: dayMetric,
    create: dayMetric
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

export async function saveUserPlan(planData: PlanPrisma): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const uploadedPlan = await tx.plan.create({
      data: {
        ...omit(planData, ["weeks", "id", "userId"]),
        user: {connect: {id: planData.userId}}
      }
    });
    for (const week of planData.weeks) {
      const uploadedWeek = await tx.week.create({
        data: {...omit(week, ["workouts", "id"]), planId: uploadedPlan.id}
      });
      for (const workout of week.workouts) {
        const uploadedWorkout = await tx.workout.create({
          data: {...omit(workout, ["exercises", "id"]), weekId: uploadedWeek.id}
        });
        for (const exercise of workout.exercises) {
          const exerciseRecord = await tx.exercise.upsert({
            where: {
              name_category: {
                name: exercise.exercise.name,
                category: exercise.exercise.category!,
              },
            },
            update: {},
            create: {
              name: exercise.exercise.name,
              category: exercise.exercise.category!,
            },
          });

          const uploadedWorkoutExercise = await tx.workoutExercise.create({
            data: {
              workoutId: uploadedWorkout.id,
              order: exercise.order,
              restTime: exercise.restTime,
              repRange: exercise.repRange,
              exerciseId: exerciseRecord.id,
            },
          });
          for (const set of exercise.sets) {
            await tx.exerciseSet.create({
              data: {...omit(set, ["id"]), workoutExerciseId: uploadedWorkoutExercise.id}
            });
          }
        }
      }
    }
    return uploadedPlan.id;
  });
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
  const [userPlans, clientPlans] = await Promise.all([
    prisma.plan.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
      },
    }),

    prisma.plan.findMany({
      where: {
        user: { coachId: userId },
      },
      select: {
        id: true,
        name: true,
        user: { select: { id: true, name: true } },
      },
    }),
  ])

  return {
    userPlans,
    clientPlans,
  }
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