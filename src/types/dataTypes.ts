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

export const EXERCISE_MUSCLES = [
  'upper-traps',
  'ant-delts',
  'lat-delts',
  'post-delts',
  'clav-pec',
  'sternal-pec',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'obliques',
  'mid-traps',
  'lower-traps',
  'lower-back',
  'lats',
  'adductors',
  'quads',
  'glutes',
  'hamstrings',
  'calves',
] as const;

export type ExerciseMuscle = typeof EXERCISE_MUSCLES[number];

// Used for structural validation of exercises.json.
// Equipment/muscle values are validated at runtime against the typed constants.
export type SeedExercise = {
  name: string;
  category: string;
  description: string;
  equipment: string[];
  muscles?: string[];
};