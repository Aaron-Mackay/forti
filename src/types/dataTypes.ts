import {Prisma, Event, DayMetric} from "@prisma/client";

export type EventPrisma = Event
export type DayMetricPrisma = DayMetric

export type UserPrisma = Prisma.UserGetPayload<{
  include: {
    weeks: {
      include: {
        workouts: {
          include: {
            exercises: {
              include: {
                exercise: true,
                sets: true,
              },
            },
          },
        },
      },
    },
  },
}>;

export type WeekPrisma = UserPrisma['weeks'][number];
export type WorkoutPrisma = WeekPrisma['workouts'][number];
export type WorkoutExercisePrisma = WorkoutPrisma['exercises'][number];
export type SetPrisma = WorkoutExercisePrisma['sets'][number];


export type SetUpdatePayload =
  | { weight: string }
  | { reps: number };