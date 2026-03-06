import { describe, it, expect, beforeEach } from 'vitest';
import {
  addExercise,
  addExerciseWithSet,
  addSet,
  addWeek,
  addWorkout,
  addWorkoutWithExerciseWithSet,
  duplicateWeek,
  duplicateWorkout,
  moveExercise,
  moveWorkout,
  removeExercise,
  removeLastSet,
  removeWeek,
  removeWorkout,
  updateCategory,
  updateExerciseInUser,
  updatePlanName,
  updateRepRange,
  updateRestTime,
  updateSetCount,
  updateSetReps,
  updateSetWeight,
  updateWorkoutDateCompleted,
  updateWorkoutName,
} from './userPlanMutators';
import { Dir } from '@lib/useWorkoutEditor';
import {
  ExerciseBuilder,
  PlanBuilder,
  SetBuilder,
  UserBuilder,
  WeekBuilder,
  WorkoutBuilder,
} from '@/testUtils/builders';
import { Exercise, ExerciseCategory } from '@prisma/client';

let nextId = 100;
const mockUuid = () => nextId++;

beforeEach(() => {
  nextId = 100;
});

// ─── helpers ───────────────────────────────────────────────────────────────

function buildBaseUser() {
  const set = new SetBuilder(401, 1).build();
  const exercise = new ExerciseBuilder(301, 1).addSet(set).build();
  const workout = new WorkoutBuilder(201, 1).addExercise(exercise).build();
  const week = new WeekBuilder(101, 1).addWorkout(workout).build();
  const plan = new PlanBuilder(1).addWeek(week).build();
  return new UserBuilder(1).addPlan(plan).build();
}

// ─── updatePlanName ─────────────────────────────────────────────────────────

describe('updatePlanName', () => {
  it('renames the target plan', () => {
    const user = buildBaseUser();
    const result = updatePlanName(user, 1, 'New Name');
    expect(result.plans[0].name).toBe('New Name');
  });

  it('does not affect other plans', () => {
    const plan2 = new PlanBuilder(2, 2).build();
    plan2.userId = '1';
    const user = buildBaseUser();
    user.plans.push(plan2);
    const result = updatePlanName(user, 2, 'Changed');
    expect(result.plans[0].name).toBe('Test Plan');
    expect(result.plans[1].name).toBe('Changed');
  });
});

// ─── updateWorkoutName ───────────────────────────────────────────────────────

describe('updateWorkoutName', () => {
  it('renames the target workout', () => {
    const user = buildBaseUser();
    const result = updateWorkoutName(user, 1, 101, 201, 'Leg Day');
    expect(result.plans[0].weeks[0].workouts[0].name).toBe('Leg Day');
  });
});

// ─── addWeek ─────────────────────────────────────────────────────────────────

describe('addWeek', () => {
  it('appends a new empty week', () => {
    const user = buildBaseUser();
    const result = addWeek(user, 1, mockUuid);
    expect(result.plans[0].weeks).toHaveLength(2);
    const newWeek = result.plans[0].weeks[1];
    expect(newWeek.workouts).toEqual([]);
    expect(newWeek.order).toBe(2);
  });

  it('assigns a uuid to the new week id', () => {
    const user = buildBaseUser();
    const result = addWeek(user, 1, mockUuid);
    expect(result.plans[0].weeks[1].id).toBe(100);
  });
});

// ─── removeWeek ──────────────────────────────────────────────────────────────

describe('removeWeek', () => {
  it('removes the target week', () => {
    const user = buildBaseUser();
    const result = removeWeek(user, 1, 101);
    expect(result.plans[0].weeks).toHaveLength(0);
  });

  it('reorders remaining weeks after removal from the middle', () => {
    const plan = new PlanBuilder(1)
      .addWeek(new WeekBuilder(10, 1).build())
      .addWeek(new WeekBuilder(11, 2).build())
      .addWeek(new WeekBuilder(12, 3).build())
      .build();
    const user = new UserBuilder(1).addPlan(plan).build();
    const result = removeWeek(user, 1, 11);
    expect(result.plans[0].weeks).toHaveLength(2);
    expect(result.plans[0].weeks[0].order).toBe(1);
    expect(result.plans[0].weeks[1].order).toBe(2);
    expect(result.plans[0].weeks[1].id).toBe(12);
  });

  it('is a no-op for a non-existent weekId', () => {
    const user = buildBaseUser();
    const result = removeWeek(user, 1, 999);
    expect(result.plans[0].weeks).toHaveLength(1);
  });
});

// ─── addWorkout ──────────────────────────────────────────────────────────────

describe('addWorkout', () => {
  it('appends a workout to the target week', () => {
    const user = buildBaseUser();
    const result = addWorkout(user, 1, 101, mockUuid);
    expect(result.plans[0].weeks[0].workouts).toHaveLength(2);
    const newWorkout = result.plans[0].weeks[0].workouts[1];
    expect(newWorkout.name).toBe('Workout 2');
    expect(newWorkout.exercises).toEqual([]);
    expect(newWorkout.order).toBe(2);
  });
});

// ─── removeWorkout ───────────────────────────────────────────────────────────

describe('removeWorkout', () => {
  it('removes the target workout', () => {
    const user = buildBaseUser();
    const result = removeWorkout(user, 1, 101, 201);
    expect(result.plans[0].weeks[0].workouts).toHaveLength(0);
  });

  it('reorders remaining workouts after middle removal', () => {
    const week = new WeekBuilder(101, 1)
      .addWorkout(new WorkoutBuilder(200, 1).build())
      .addWorkout(new WorkoutBuilder(201, 2).build())
      .addWorkout(new WorkoutBuilder(202, 3).build())
      .build();
    const plan = new PlanBuilder(1).addWeek(week).build();
    const user = new UserBuilder(1).addPlan(plan).build();
    const result = removeWorkout(user, 1, 101, 201);
    expect(result.plans[0].weeks[0].workouts).toHaveLength(2);
    expect(result.plans[0].weeks[0].workouts[0].order).toBe(1);
    expect(result.plans[0].weeks[0].workouts[1].order).toBe(2);
    expect(result.plans[0].weeks[0].workouts[1].id).toBe(202);
  });
});

// ─── moveWorkout ─────────────────────────────────────────────────────────────

describe('moveWorkout', () => {
  it('swaps workouts downward', () => {
    const week = new WeekBuilder(101, 1)
      .addWorkout(new WorkoutBuilder(200, 1).build())
      .addWorkout(new WorkoutBuilder(201, 2).build())
      .build();
    const plan = new PlanBuilder(1).addWeek(week).build();
    const user = new UserBuilder(1).addPlan(plan).build();
    const result = moveWorkout(user, 1, 101, 0, Dir.DOWN);
    expect(result.plans[0].weeks[0].workouts[0].id).toBe(201);
    expect(result.plans[0].weeks[0].workouts[1].id).toBe(200);
  });

  it('swaps workouts upward', () => {
    const week = new WeekBuilder(101, 1)
      .addWorkout(new WorkoutBuilder(200, 1).build())
      .addWorkout(new WorkoutBuilder(201, 2).build())
      .build();
    const plan = new PlanBuilder(1).addWeek(week).build();
    const user = new UserBuilder(1).addPlan(plan).build();
    const result = moveWorkout(user, 1, 101, 1, Dir.UP);
    expect(result.plans[0].weeks[0].workouts[0].id).toBe(201);
    expect(result.plans[0].weeks[0].workouts[1].id).toBe(200);
  });

  it('is a no-op at the first index moving up', () => {
    const week = new WeekBuilder(101, 1)
      .addWorkout(new WorkoutBuilder(200, 1).build())
      .build();
    const plan = new PlanBuilder(1).addWeek(week).build();
    const user = new UserBuilder(1).addPlan(plan).build();
    const result = moveWorkout(user, 1, 101, 0, Dir.UP);
    expect(result.plans[0].weeks[0].workouts[0].id).toBe(200);
  });

  it('is a no-op at the last index moving down', () => {
    const week = new WeekBuilder(101, 1)
      .addWorkout(new WorkoutBuilder(200, 1).build())
      .build();
    const plan = new PlanBuilder(1).addWeek(week).build();
    const user = new UserBuilder(1).addPlan(plan).build();
    const result = moveWorkout(user, 1, 101, 0, Dir.DOWN);
    expect(result.plans[0].weeks[0].workouts[0].id).toBe(200);
  });

  it('updates order properties after move', () => {
    const week = new WeekBuilder(101, 1)
      .addWorkout(new WorkoutBuilder(200, 1).build())
      .addWorkout(new WorkoutBuilder(201, 2).build())
      .build();
    const plan = new PlanBuilder(1).addWeek(week).build();
    const user = new UserBuilder(1).addPlan(plan).build();
    const result = moveWorkout(user, 1, 101, 0, Dir.DOWN);
    expect(result.plans[0].weeks[0].workouts[0].order).toBe(1);
    expect(result.plans[0].weeks[0].workouts[1].order).toBe(2);
  });
});

// ─── addExercise ─────────────────────────────────────────────────────────────

describe('addExercise', () => {
  it('appends a blank exercise to a workout', () => {
    const user = buildBaseUser();
    const result = addExercise(user, 1, 101, 201, mockUuid);
    expect(result.plans[0].weeks[0].workouts[0].exercises).toHaveLength(2);
    const newEx = result.plans[0].weeks[0].workouts[0].exercises[1];
    expect(newEx.exercise.name).toBe('');
    expect(newEx.sets).toEqual([]);
    expect(newEx.order).toBe(2);
  });
});

// ─── addExerciseWithSet ──────────────────────────────────────────────────────

describe('addExerciseWithSet', () => {
  it('appends an exercise with one blank set', () => {
    const user = buildBaseUser();
    const result = addExerciseWithSet(user, 1, 101, 201, mockUuid);
    const exercises = result.plans[0].weeks[0].workouts[0].exercises;
    expect(exercises).toHaveLength(2);
    const newEx = exercises[1];
    expect(newEx.sets).toHaveLength(1);
    expect(newEx.sets[0].reps).toBeNull();
    expect(newEx.sets[0].weight).toBeNull();
  });
});

// ─── addWorkoutWithExerciseWithSet ───────────────────────────────────────────

describe('addWorkoutWithExerciseWithSet', () => {
  it('appends a workout containing one exercise with one set', () => {
    const user = buildBaseUser();
    const result = addWorkoutWithExerciseWithSet(user, 1, 101, mockUuid);
    const workouts = result.plans[0].weeks[0].workouts;
    expect(workouts).toHaveLength(2);
    const newWorkout = workouts[1];
    expect(newWorkout.exercises).toHaveLength(1);
    expect(newWorkout.exercises[0].sets).toHaveLength(1);
    expect(newWorkout.exercises[0].sets[0].reps).toBeNull();
  });

  it('numbers the new workout correctly', () => {
    const user = buildBaseUser();
    const result = addWorkoutWithExerciseWithSet(user, 1, 101, mockUuid);
    expect(result.plans[0].weeks[0].workouts[1].name).toBe('Workout 2');
    expect(result.plans[0].weeks[0].workouts[1].order).toBe(2);
  });
});

// ─── removeExercise ──────────────────────────────────────────────────────────

describe('removeExercise', () => {
  it('removes the target exercise', () => {
    const user = buildBaseUser();
    const result = removeExercise(user, 1, 101, 201, 301);
    expect(result.plans[0].weeks[0].workouts[0].exercises).toHaveLength(0);
  });

  it('reorders remaining exercises after middle removal', () => {
    const workout = new WorkoutBuilder(201, 1)
      .addExercise(new ExerciseBuilder(300, 1).build())
      .addExercise(new ExerciseBuilder(301, 2).build())
      .addExercise(new ExerciseBuilder(302, 3).build())
      .build();
    const week = new WeekBuilder(101, 1).addWorkout(workout).build();
    const plan = new PlanBuilder(1).addWeek(week).build();
    const user = new UserBuilder(1).addPlan(plan).build();
    const result = removeExercise(user, 1, 101, 201, 301);
    const exercises = result.plans[0].weeks[0].workouts[0].exercises;
    expect(exercises).toHaveLength(2);
    expect(exercises[0].order).toBe(1);
    expect(exercises[1].order).toBe(2);
    expect(exercises[1].id).toBe(302);
  });
});

// ─── moveExercise ─────────────────────────────────────────────────────────────

describe('moveExercise', () => {
  function buildTwoExerciseUser() {
    const workout = new WorkoutBuilder(201, 1)
      .addExercise(new ExerciseBuilder(300, 1).build())
      .addExercise(new ExerciseBuilder(301, 2).build())
      .build();
    const week = new WeekBuilder(101, 1).addWorkout(workout).build();
    const plan = new PlanBuilder(1).addWeek(week).build();
    return new UserBuilder(1).addPlan(plan).build();
  }

  it('moves an exercise down', () => {
    const user = buildTwoExerciseUser();
    const result = moveExercise(user, 1, 101, 201, 0, Dir.DOWN);
    expect(result.plans[0].weeks[0].workouts[0].exercises[0].id).toBe(301);
    expect(result.plans[0].weeks[0].workouts[0].exercises[1].id).toBe(300);
  });

  it('moves an exercise up', () => {
    const user = buildTwoExerciseUser();
    const result = moveExercise(user, 1, 101, 201, 1, Dir.UP);
    expect(result.plans[0].weeks[0].workouts[0].exercises[0].id).toBe(301);
    expect(result.plans[0].weeks[0].workouts[0].exercises[1].id).toBe(300);
  });

  it('is a no-op moving first exercise up', () => {
    const user = buildTwoExerciseUser();
    const result = moveExercise(user, 1, 101, 201, 0, Dir.UP);
    expect(result.plans[0].weeks[0].workouts[0].exercises[0].id).toBe(300);
  });

  it('is a no-op moving last exercise down', () => {
    const user = buildTwoExerciseUser();
    const result = moveExercise(user, 1, 101, 201, 1, Dir.DOWN);
    expect(result.plans[0].weeks[0].workouts[0].exercises[1].id).toBe(301);
  });
});

// ─── addSet ──────────────────────────────────────────────────────────────────

describe('addSet', () => {
  it('appends a blank set to an exercise', () => {
    const user = buildBaseUser();
    const result = addSet(user, 1, 101, 201, 301, mockUuid);
    const sets = result.plans[0].weeks[0].workouts[0].exercises[0].sets;
    expect(sets).toHaveLength(2);
    expect(sets[1].reps).toBeNull();
    expect(sets[1].weight).toBeNull();
    expect(sets[1].order).toBe(2);
  });
});

// ─── removeLastSet ───────────────────────────────────────────────────────────

describe('removeLastSet', () => {
  it('removes the last set from an exercise', () => {
    const exercise = new ExerciseBuilder(301, 1)
      .addSet(new SetBuilder(401, 1).build())
      .addSet(new SetBuilder(402, 2).build())
      .build();
    const workout = new WorkoutBuilder(201, 1).addExercise(exercise).build();
    const week = new WeekBuilder(101, 1).addWorkout(workout).build();
    const plan = new PlanBuilder(1).addWeek(week).build();
    const user = new UserBuilder(1).addPlan(plan).build();
    const result = removeLastSet(user, 1, 101, 201, 301);
    const sets = result.plans[0].weeks[0].workouts[0].exercises[0].sets;
    expect(sets).toHaveLength(1);
    expect(sets[0].id).toBe(401);
  });

  it('leaves an empty sets array when removing the only set', () => {
    const user = buildBaseUser();
    const result = removeLastSet(user, 1, 101, 201, 301);
    expect(result.plans[0].weeks[0].workouts[0].exercises[0].sets).toHaveLength(0);
  });

  it('reorders remaining sets correctly', () => {
    const exercise = new ExerciseBuilder(301, 1)
      .addSet(new SetBuilder(401, 1).build())
      .addSet(new SetBuilder(402, 2).build())
      .addSet(new SetBuilder(403, 3).build())
      .build();
    const workout = new WorkoutBuilder(201, 1).addExercise(exercise).build();
    const week = new WeekBuilder(101, 1).addWorkout(workout).build();
    const plan = new PlanBuilder(1).addWeek(week).build();
    const user = new UserBuilder(1).addPlan(plan).build();
    const result = removeLastSet(user, 1, 101, 201, 301);
    const sets = result.plans[0].weeks[0].workouts[0].exercises[0].sets;
    expect(sets[0].order).toBe(1);
    expect(sets[1].order).toBe(2);
  });
});

// ─── updateSetCount ──────────────────────────────────────────────────────────

describe('updateSetCount', () => {
  it('trims sets when count is reduced', () => {
    const exercise = new ExerciseBuilder(301, 1)
      .addSet(new SetBuilder(401, 1).build())
      .addSet(new SetBuilder(402, 2).build())
      .addSet(new SetBuilder(403, 3).build())
      .build();
    const workout = new WorkoutBuilder(201, 1).addExercise(exercise).build();
    const week = new WeekBuilder(101, 1).addWorkout(workout).build();
    const plan = new PlanBuilder(1).addWeek(week).build();
    const user = new UserBuilder(1).addPlan(plan).build();
    const result = updateSetCount(user, 1, 101, 201, 301, 1, mockUuid);
    const sets = result.plans[0].weeks[0].workouts[0].exercises[0].sets;
    expect(sets).toHaveLength(1);
    expect(sets[0].id).toBe(401);
  });

  it('adds new blank sets when count is increased', () => {
    const user = buildBaseUser();
    const result = updateSetCount(user, 1, 101, 201, 301, 3, mockUuid);
    const sets = result.plans[0].weeks[0].workouts[0].exercises[0].sets;
    expect(sets).toHaveLength(3);
    expect(sets[1].reps).toBeNull();
    expect(sets[2].reps).toBeNull();
  });

  it('is a no-op when count equals current length', () => {
    const user = buildBaseUser();
    const before = JSON.parse(JSON.stringify(user));
    const result = updateSetCount(user, 1, 101, 201, 301, 1, mockUuid);
    expect(result).toEqual(before);
  });
});

// ─── updateSetWeight ─────────────────────────────────────────────────────────

describe('updateSetWeight', () => {
  it('updates the weight of the target set', () => {
    const user = buildBaseUser();
    const result = updateSetWeight(user, 1, 101, 201, 301, 401, '250');
    expect(result.plans[0].weeks[0].workouts[0].exercises[0].sets[0].weight).toBe('250');
  });

  it('does not affect other sets', () => {
    const exercise = new ExerciseBuilder(301, 1)
      .addSet(new SetBuilder(401, 1).build())
      .addSet(new SetBuilder(402, 2).build())
      .build();
    const workout = new WorkoutBuilder(201, 1).addExercise(exercise).build();
    const week = new WeekBuilder(101, 1).addWorkout(workout).build();
    const plan = new PlanBuilder(1).addWeek(week).build();
    const user = new UserBuilder(1).addPlan(plan).build();
    const result = updateSetWeight(user, 1, 101, 201, 301, 401, '999');
    expect(result.plans[0].weeks[0].workouts[0].exercises[0].sets[1].weight).toBe('100');
  });
});

// ─── updateSetReps ───────────────────────────────────────────────────────────

describe('updateSetReps', () => {
  it('updates the reps of the target set', () => {
    const user = buildBaseUser();
    const result = updateSetReps(user, 1, 101, 201, 301, 401, 20);
    expect(result.plans[0].weeks[0].workouts[0].exercises[0].sets[0].reps).toBe(20);
  });
});

// ─── updateRepRange ──────────────────────────────────────────────────────────

describe('updateRepRange', () => {
  it('updates the rep range of the target exercise', () => {
    const user = buildBaseUser();
    const result = updateRepRange(user, 1, 101, 201, 301, '8-12');
    expect(result.plans[0].weeks[0].workouts[0].exercises[0].repRange).toBe('8-12');
  });
});

// ─── updateRestTime ──────────────────────────────────────────────────────────

describe('updateRestTime', () => {
  it('updates the rest time of the target exercise', () => {
    const user = buildBaseUser();
    const result = updateRestTime(user, 1, 101, 201, 301, '120');
    expect(result.plans[0].weeks[0].workouts[0].exercises[0].restTime).toBe('120');
  });
});

// ─── updateCategory ──────────────────────────────────────────────────────────

describe('updateCategory', () => {
  it('updates category and resets exercise name', () => {
    const user = buildBaseUser();
    const result = updateCategory(user, 1, 101, 201, 301, 'resistance');
    const ex = result.plans[0].weeks[0].workouts[0].exercises[0].exercise;
    expect(ex.category).toBe('resistance');
    expect(ex.name).toBe('');
  });
});

// ─── updateExerciseInUser ────────────────────────────────────────────────────

describe('updateExerciseInUser', () => {
  const allExercises: Exercise[] = [
    { id: 1, name: 'Squat', category: ExerciseCategory.resistance, description: null, equipment: [], primaryMuscles: [], secondaryMuscles: [] },
    { id: 2, name: 'Bench Press', category: ExerciseCategory.resistance, description: null, equipment: [], primaryMuscles: [], secondaryMuscles: [] },
  ];

  it('sets exercise to an existing one from the list', () => {
    const user = buildBaseUser();
    const result = updateExerciseInUser(user, 1, 101, 201, 301, 'Squat', allExercises, 'resistance', mockUuid);
    const ex = result.plans[0].weeks[0].workouts[0].exercises[0].exercise;
    expect(ex.name).toBe('Squat');
    expect(ex.id).toBe(1);
  });

  it('creates a new exercise object when name is not in the list', () => {
    const user = buildBaseUser();
    const result = updateExerciseInUser(user, 1, 101, 201, 301, 'New Move', [], 'resistance', mockUuid);
    const ex = result.plans[0].weeks[0].workouts[0].exercises[0].exercise;
    expect(ex.name).toBe('New Move');
    expect(ex.category).toBe('resistance');
    expect(ex.id).toBe(100); // assigned via mockUuid
  });
});

// ─── duplicateWeek ───────────────────────────────────────────────────────────

describe('duplicateWeek', () => {
  it('appends a copy of the week with new ids', () => {
    const user = buildBaseUser();
    const result = duplicateWeek(user, 1, 101, mockUuid);
    expect(result.plans[0].weeks).toHaveLength(2);
    const [original, copy] = result.plans[0].weeks;
    expect(copy.id).not.toBe(original.id);
    expect(copy.workouts[0].id).not.toBe(original.workouts[0].id);
    expect(copy.workouts[0].exercises[0].id).not.toBe(original.workouts[0].exercises[0].id);
    expect(copy.workouts[0].exercises[0].sets[0].id).not.toBe(original.workouts[0].exercises[0].sets[0].id);
  });

  it('resets weight and reps in duplicated sets', () => {
    const user = buildBaseUser();
    const result = duplicateWeek(user, 1, 101, mockUuid);
    const copiedSet = result.plans[0].weeks[1].workouts[0].exercises[0].sets[0];
    expect(copiedSet.weight).toBeNull();
    expect(copiedSet.reps).toBeNull();
  });

  it('assigns a sequential order to the duplicated week', () => {
    const user = buildBaseUser();
    const result = duplicateWeek(user, 1, 101, mockUuid);
    expect(result.plans[0].weeks[1].order).toBe(2);
  });

  it('does not mutate the original week', () => {
    const user = buildBaseUser();
    const result = duplicateWeek(user, 1, 101, mockUuid);
    result.plans[0].weeks[1].workouts[0].name = 'Mutated';
    expect(result.plans[0].weeks[0].workouts[0].name).toBe('Workout');
  });
});

// ─── duplicateWorkout ────────────────────────────────────────────────────────

describe('duplicateWorkout', () => {
  it('appends a copy of the workout with new ids', () => {
    const user = buildBaseUser();
    const result = duplicateWorkout(user, 1, 101, 201, mockUuid);
    const workouts = result.plans[0].weeks[0].workouts;
    expect(workouts).toHaveLength(2);
    expect(workouts[1].id).not.toBe(workouts[0].id);
    expect(workouts[1].exercises[0].id).not.toBe(workouts[0].exercises[0].id);
    expect(workouts[1].exercises[0].sets[0].id).not.toBe(workouts[0].exercises[0].sets[0].id);
  });

  it('resets weight and reps in duplicated sets', () => {
    const user = buildBaseUser();
    const result = duplicateWorkout(user, 1, 101, 201, mockUuid);
    const copiedSet = result.plans[0].weeks[0].workouts[1].exercises[0].sets[0];
    expect(copiedSet.weight).toBeNull();
    expect(copiedSet.reps).toBeNull();
  });

  it('assigns a sequential order to the duplicated workout', () => {
    const user = buildBaseUser();
    const result = duplicateWorkout(user, 1, 101, 201, mockUuid);
    expect(result.plans[0].weeks[0].workouts[1].order).toBe(2);
  });
});

// ─── updateWorkoutDateCompleted ───────────────────────────────────────────────

describe('updateWorkoutDateCompleted', () => {
  it('sets dateCompleted on the target workout', () => {
    const user = buildBaseUser();
    const date = new Date('2024-06-15T10:00:00.000Z');
    const result = updateWorkoutDateCompleted(user, 1, 101, 201, date);
    expect(result.plans[0].weeks[0].workouts[0].dateCompleted).toEqual(date);
  });

  it('clears dateCompleted when passed null', () => {
    const set = new SetBuilder(401, 1).build();
    const exercise = new ExerciseBuilder(301, 1).addSet(set).build();
    const workout = new WorkoutBuilder(201, 1).addExercise(exercise).build();
    workout.dateCompleted = new Date('2024-01-01');
    const week = new WeekBuilder(101, 1).addWorkout(workout).build();
    const plan = new PlanBuilder(1).addWeek(week).build();
    const user = new UserBuilder(1).addPlan(plan).build();

    const result = updateWorkoutDateCompleted(user, 1, 101, 201, null);
    expect(result.plans[0].weeks[0].workouts[0].dateCompleted).toBeNull();
  });

  it('does not affect other workouts in the same week', () => {
    const set = new SetBuilder(401, 1).build();
    const exercise = new ExerciseBuilder(301, 1).addSet(set).build();
    const workout1 = new WorkoutBuilder(201, 1).addExercise(exercise).build();
    const workout2 = new WorkoutBuilder(202, 2).build();
    const week = new WeekBuilder(101, 1).addWorkout(workout1).addWorkout(workout2).build();
    const plan = new PlanBuilder(1).addWeek(week).build();
    const user = new UserBuilder(1).addPlan(plan).build();

    const date = new Date('2024-06-15');
    const result = updateWorkoutDateCompleted(user, 1, 101, 201, date);
    expect(result.plans[0].weeks[0].workouts[0].dateCompleted).toEqual(date);
    expect(result.plans[0].weeks[0].workouts[1].dateCompleted).toBeNull();
  });
});
