import {Prisma, Event, DayMetric} from "@prisma/client";

export type EventPrisma = Event
export type DayMetricPrisma = DayMetric

export type UserPrisma = Prisma.UserGetPayload<{
  include: {
    plans: {
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
    },
    userExerciseNotes: true,
  },
}>;


export type PlanPrisma = UserPrisma['plans'][number];
export type WeekPrisma = PlanPrisma['weeks'][number];
export type WorkoutPrisma = WeekPrisma['workouts'][number];
export type WorkoutExercisePrisma = WorkoutPrisma['exercises'][number];
export type SetPrisma = WorkoutExercisePrisma['sets'][number];


export type SetUpdatePayload =
  | { weight: string }
  | { reps: number };

export const EXERCISE_EQUIPMENT = [
  'cable',
  'barbell',
  'bodyweight',
  'kettlebell',
  'dumbbell',
  'machine',
  'ez bar',
  'speciality bar',
  'smith machine',
  'squat rack',
  'bench press',
  'adjustable bench',
  'dip station',
  'pullup bar',
  'preacher bench',
] as const;

export type ExerciseEquipment = typeof EXERCISE_EQUIPMENT[number];