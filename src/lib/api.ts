import {Exercise} from '@prisma/client';
import prisma from '@/lib/prisma';
import {fetchJson} from './fetchWrapper';
import {DayMetricPrisma, EventPrisma, PlanPrisma, UserPrisma} from "@/types/dataTypes";
import {PlanUploadResponse} from "@/app/api/plan/route";

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

export async function saveUserWorkoutData(userData: UserPrisma) {
  // todo validation (zod?)
  return fetchJson('/api/saveUserWorkoutData', {
    method: 'POST',
    body: JSON.stringify(userData),
    headers: {'Content-Type': 'application/json'},
  });
}

export async function savePlan(plan: PlanPrisma): Promise<PlanUploadResponse> {
  // todo validation (zod?)
  return fetchJson('/api/plan', {
    method: 'POST',
    body: JSON.stringify(plan),
    headers: {'Content-Type': 'application/json'},
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
  const uploadedPlan = await prisma.plan.create({
    data: {
      ...omit(planData, ["weeks", "id", "userId"]),
      user: {connect: {id: planData.userId}}
    }
  })
  for (const week of planData.weeks) {
    const uploadedWeek = await prisma.week.create({
      data: {...omit(week, ["workouts", "id"]), planId: uploadedPlan.id}
    })
    for (const workout of week.workouts) {
      const uploadedWorkout = await prisma.workout.create({
        data: {...omit(workout, ["exercises", "id"]), weekId: uploadedWeek.id}
      })
      for (const exercise of workout.exercises) {
        const exerciseRecord = await prisma.exercise.upsert({
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

        const uploadedWorkoutExercise = await prisma.workoutExercise.create({
          data: {
            workoutId: uploadedWorkout.id,
            order: exercise.order,
            restTime: exercise.restTime,
            repRange: exercise.repRange,
            exerciseId: exerciseRecord.id,
          },
        });
        for (const set of exercise.sets) {
          await prisma.exerciseSet.create({
            data: {...omit(set, ["id"]), workoutExerciseId: uploadedWorkoutExercise.id}
          })
        }
      }
    }
  }
  return uploadedPlan.id
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
