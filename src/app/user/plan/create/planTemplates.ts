import type { ParsedPlan } from '@/utils/aiPlanParser'

// ── Types ─────────────────────────────────────────────────────────────────────

export type FilterCategory = 'All' | 'Strength' | 'Hypertrophy' | 'Beginner' | 'General'

export const FILTER_CATEGORIES: FilterCategory[] = [
  'All',
  'Strength',
  'Hypertrophy',
  'Beginner',
  'General',
]

export type PlanTemplate = {
  meta: {
    name: string
    daysPerWeek: number
    durationWeeks: number
    level: string
    goal: string
  }
  categories: Exclude<FilterCategory, 'All'>[]
  plan: ParsedPlan
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type ExerciseEntry = ParsedPlan['weeks'][0]['workouts'][0]['exercises'][0]
type WorkoutEntry = ParsedPlan['weeks'][0]['workouts'][0]

function makeSets(count: number, reps = 8): ExerciseEntry['sets'] {
  return Array.from({ length: count }, (_, i) => ({ order: i + 1, weight: null, reps }))
}

function ex(
  name: string,
  order: number,
  setCount: number,
  repRange: string,
  restTime: string,
): ExerciseEntry {
  const firstRep = parseInt(repRange.split('-')[0]) || 8
  return {
    exercise: { name, category: 'resistance' },
    order,
    repRange,
    restTime,
    notes: null,
    sets: makeSets(setCount, firstRep),
  }
}

function workout(name: string, order: number, exercises: ExerciseEntry[]): WorkoutEntry {
  return { name, order, notes: null, dateCompleted: null, exercises }
}

function singleWeekPlan(name: string, description: string, workouts: WorkoutEntry[]): ParsedPlan {
  return {
    name,
    description,
    order: 1,
    weeks: [{ order: 1, workouts }],
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────

const PPL: PlanTemplate = {
  meta: { name: 'Push / Pull / Legs', daysPerWeek: 3, durationWeeks: 6, level: 'Intermediate', goal: 'Hypertrophy' },
  categories: ['Hypertrophy'],
  plan: singleWeekPlan('Push / Pull / Legs', '3 days/wk · 6 weeks · Intermediate · Hypertrophy', [
    workout('Push Day', 1, [
      ex('Bench Press', 1, 4, '8-10', '120'),
      ex('Overhead Press', 2, 3, '10-12', '90'),
      ex('Incline Dumbbell Press', 3, 3, '10-12', '90'),
      ex('Tricep Pushdown', 4, 3, '12-15', '60'),
    ]),
    workout('Pull Day', 2, [
      ex('Barbell Row', 1, 4, '6-8', '180'),
      ex('Lat Pulldown', 2, 3, '10-12', '90'),
      ex('Face Pull', 3, 3, '15-20', '60'),
      ex('Bicep Curl', 4, 3, '12-15', '60'),
    ]),
    workout('Leg Day', 3, [
      ex('Squat', 1, 4, '6-8', '180'),
      ex('Romanian Deadlift', 2, 3, '8-10', '120'),
      ex('Leg Press', 3, 3, '10-12', '90'),
      ex('Leg Curl', 4, 3, '12-15', '60'),
    ]),
  ]),
}

const FULL_BODY_3X: PlanTemplate = {
  meta: { name: 'Full Body 3×Week', daysPerWeek: 3, durationWeeks: 4, level: 'Beginner', goal: 'General' },
  categories: ['Beginner', 'General'],
  plan: singleWeekPlan('Full Body 3×Week', '3 days/wk · 4 weeks · Beginner · General', [
    workout('Full Body A', 1, [
      ex('Squat', 1, 3, '5', '180'),
      ex('Bench Press', 2, 3, '5', '180'),
      ex('Barbell Row', 3, 3, '5', '180'),
      ex('Overhead Press', 4, 3, '5', '120'),
      ex('Deadlift', 5, 1, '5', '180'),
    ]),
    workout('Full Body B', 2, [
      ex('Squat', 1, 3, '5', '180'),
      ex('Overhead Press', 2, 3, '5', '180'),
      ex('Deadlift', 3, 1, '5', '180'),
      ex('Barbell Row', 4, 3, '5', '180'),
      ex('Bench Press', 5, 3, '5', '180'),
    ]),
    workout('Full Body C', 3, [
      ex('Squat', 1, 3, '5', '180'),
      ex('Bench Press', 2, 3, '5', '180'),
      ex('Barbell Row', 3, 3, '5', '180'),
      ex('Overhead Press', 4, 3, '5', '120'),
      ex('Deadlift', 5, 1, '5', '180'),
    ]),
  ]),
}

const UPPER_LOWER: PlanTemplate = {
  meta: { name: 'Upper / Lower', daysPerWeek: 4, durationWeeks: 8, level: 'Intermediate', goal: 'Strength' },
  categories: ['Strength'],
  plan: singleWeekPlan('Upper / Lower', '4 days/wk · 8 weeks · Intermediate · Strength', [
    workout('Upper A', 1, [
      ex('Bench Press', 1, 4, '4-6', '180'),
      ex('Barbell Row', 2, 4, '4-6', '180'),
      ex('Overhead Press', 3, 3, '8-10', '90'),
      ex('Lat Pulldown', 4, 3, '8-10', '90'),
      ex('Tricep Pushdown', 5, 3, '10-12', '60'),
    ]),
    workout('Lower A', 2, [
      ex('Squat', 1, 4, '4-6', '180'),
      ex('Romanian Deadlift', 2, 3, '8-10', '120'),
      ex('Leg Press', 3, 3, '10-12', '90'),
      ex('Leg Curl', 4, 3, '10-12', '60'),
    ]),
    workout('Upper B', 3, [
      ex('Incline Dumbbell Press', 1, 4, '8-10', '90'),
      ex('Cable Row', 2, 4, '8-10', '90'),
      ex('Dumbbell Shoulder Press', 3, 3, '10-12', '90'),
      ex('Bicep Curl', 4, 3, '10-12', '60'),
      ex('Face Pull', 5, 3, '15-20', '60'),
    ]),
    workout('Lower B', 4, [
      ex('Deadlift', 1, 4, '4-6', '180'),
      ex('Leg Press', 2, 4, '8-10', '90'),
      ex('Leg Curl', 3, 3, '10-12', '60'),
      ex('Calf Raise', 4, 4, '12-15', '60'),
    ]),
  ]),
}

const WENDLER_531: PlanTemplate = {
  meta: { name: '5/3/1 Wendler', daysPerWeek: 4, durationWeeks: 4, level: 'Intermediate', goal: 'Strength' },
  categories: ['Strength'],
  plan: singleWeekPlan('5/3/1 Wendler', '4 days/wk · 4 weeks · Intermediate · Strength', [
    workout('Squat Day', 1, [
      ex('Squat', 1, 3, '5', '180'),
      ex('Leg Press', 2, 5, '10', '90'),
      ex('Leg Curl', 3, 3, '10', '60'),
    ]),
    workout('Bench Day', 2, [
      ex('Bench Press', 1, 3, '5', '180'),
      ex('Dumbbell Row', 2, 5, '10', '90'),
      ex('Tricep Pushdown', 3, 3, '10', '60'),
    ]),
    workout('Deadlift Day', 3, [
      ex('Deadlift', 1, 3, '5', '180'),
      ex('Romanian Deadlift', 2, 5, '10', '90'),
      ex('Leg Curl', 3, 3, '10', '60'),
    ]),
    workout('Press Day', 4, [
      ex('Overhead Press', 1, 3, '5', '180'),
      ex('Lat Pulldown', 2, 5, '10', '90'),
      ex('Bicep Curl', 3, 3, '10', '60'),
    ]),
  ]),
}

const BEGINNER_STRENGTH: PlanTemplate = {
  meta: { name: 'Beginner Strength', daysPerWeek: 3, durationWeeks: 8, level: 'Beginner', goal: 'Strength' },
  categories: ['Beginner', 'Strength'],
  plan: singleWeekPlan('Beginner Strength', '3 days/wk · 8 weeks · Beginner · Strength', [
    workout('Workout A', 1, [
      ex('Squat', 1, 3, '5', '180'),
      ex('Bench Press', 2, 3, '5', '180'),
      ex('Barbell Row', 3, 3, '5', '180'),
    ]),
    workout('Workout B', 2, [
      ex('Squat', 1, 3, '5', '180'),
      ex('Overhead Press', 2, 3, '5', '180'),
      ex('Deadlift', 3, 1, '5', '180'),
    ]),
  ]),
}

export const PLAN_TEMPLATES: PlanTemplate[] = [
  PPL,
  FULL_BODY_3X,
  UPPER_LOWER,
  WENDLER_531,
  BEGINNER_STRENGTH,
]
