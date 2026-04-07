import {Prisma, Event, DayMetric, ExerciseCategory} from "@/generated/prisma/browser";

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
}>;


export type PlanPrisma = UserPrisma['plans'][number];
export type WeekPrisma = PlanPrisma['weeks'][number];
export type WorkoutPrisma = WeekPrisma['workouts'][number];
export type WorkoutExercisePrisma = WorkoutPrisma['exercises'][number];
export type SetPrisma = WorkoutExercisePrisma['sets'][number];


export type SetUpdatePayload =
  | { weight: number }
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

export const EQUIPMENT_NAMES: Record<ExerciseEquipment, string> = {
  cable: 'Cable',
  barbell: 'Barbell',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  'ez bar': 'EZ Bar',
  'speciality bar': 'Speciality Bar',
  'smith machine': 'Smith Machine',
  'squat rack': 'Squat Rack',
  'bench press': 'Bench Press',
  'adjustable bench': 'Adjustable Bench',
  'dip station': 'Dip Station',
  'pullup bar': 'Pull-Up Bar',
  'preacher bench': 'Preacher Bench',
};

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

export const MUSCLE_NAMES: Record<ExerciseMuscle, string> = {
  'upper-traps': 'Upper Traps',
  'ant-delts': 'Front Delt',
  'lat-delts': 'Side Delt',
  'post-delts': 'Rear Delt',
  'clav-pec': 'Upper Chest',
  'sternal-pec': 'Chest',
  'biceps': 'Biceps',
  'triceps': 'Triceps',
  'forearms': 'Forearms',
  'abs': 'Abs',
  'obliques': 'Obliques',
  'mid-traps': 'Mid Traps',
  'lower-traps': 'Lower Traps',
  'lower-back': 'Lower Back',
  'lats': 'Lats',
  'adductors': 'Adductors',
  'quads': 'Quads',
  'glutes': 'Glutes',
  'hamstrings': 'Hamstrings',
  'calves': 'Calves',
};

export { ExerciseCategory };

// Used for structural validation of exercises.json.
// Equipment/muscle values are validated at runtime against the typed constants.
export type SeedExercise = {
  name: string;
  category: ExerciseCategory;
  description: string;
  equipment: string[];
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
};
