import {Dir, reducer, WorkoutEditorAction} from './useWorkoutEditor';
import {ExerciseBuilder, SetBuilder, UserBuilder, WeekBuilder, WorkoutBuilder, PlanBuilder} from '@/testUtils/builders';
import {describe, expect, it} from "vitest";
import {SetPrisma, UserPrisma} from "@/types/dataTypes";
import {updateUserSets} from "@/utils/userPlanMutators";

// Deterministic UUID generator for testing
let nextId = 1;
const mockUuid = () => nextId++;

beforeEach(() => {
  nextId = 1;
});

describe('reducer', () => {
  it('throws for unknown action', () => {
    const state = new UserBuilder(1)
      .addPlan(new PlanBuilder(1).build())
      .build();
    // @ts-expect-error - Testing invalid action
    expect(() => reducer(state, {type: 'UNKNOWN'}, mockUuid)).toThrow('Unexpected action');
  });

  it('ADD_WEEK adds a new week', () => {
    const state = new UserBuilder(1)
      .addPlan(new PlanBuilder(1).build())
      .build();
    const action: WorkoutEditorAction = {type: 'ADD_WEEK', planId: 1};
    const newState = reducer(state, action, mockUuid);
    expect(newState.plans[0].weeks.length).toBe(1);
    expect(newState.plans[0].weeks[0].id).toBe(1);
    expect(newState.plans[0].weeks[0].workouts).toEqual([]);
  });

  it('REMOVE_WEEK removes the specified week', () => {
    const plan = new PlanBuilder(1)
      .addWeek(new WeekBuilder(42, 1).build())
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    const action: WorkoutEditorAction = {type: 'REMOVE_WEEK', planId: 1, weekId: 42};
    const newState = reducer(state, action, mockUuid);
    expect(newState.plans[0].weeks.length).toBe(0);
  });

  it('DUPLICATE_WEEK duplicates a week with new IDs', () => {
    const week = new WeekBuilder(1001)
      .addWorkout(
        new WorkoutBuilder(1002)
          .addExercise(
            new ExerciseBuilder(1003)
              .addSet(
                new SetBuilder(1004).build()
              )
              .build()
          )
          .build()
      )
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();

    const action: WorkoutEditorAction = {type: 'DUPLICATE_WEEK', planId: 1, weekId: 1001};
    const newState = reducer(state, action, mockUuid);
    expect(newState.plans[0].weeks.length).toBe(2);
    const [original, duplicate] = newState.plans[0].weeks;
    expect(duplicate.id).not.toBe(original.id);
    expect(duplicate.workouts[0].id).not.toBe(original.workouts[0].id);
    expect(duplicate.workouts[0].exercises[0].id).not.toBe(original.workouts[0].exercises[0].id);
    expect(duplicate.workouts[0].exercises[0].sets[0].id).not.toBe(original.workouts[0].exercises[0].sets[0].id);
    // Sets in duplicate should have null weight/reps
    expect(duplicate.workouts[0].exercises[0].sets[0].weight).toBeNull();
    expect(duplicate.workouts[0].exercises[0].sets[0].reps).toBeNull();

    // Deep clone check: mutate duplicate, original should not change
    duplicate.workouts[0].name = 'Changed Name';
    duplicate.workouts[0].exercises[0].sets[0].weight = '999';
    expect(original.workouts[0].name).toBe('Workout');
    expect(original.workouts[0].exercises[0].sets[0].weight).toBe('100');
  });

  it('DUPLICATE_WORKOUT duplicates a workout in a week with new IDs', () => {
    const workout = new WorkoutBuilder(1002)
      .addExercise(
        new ExerciseBuilder(1003)
          .addSet(
            new SetBuilder(1004).build()
          )
          .build()
      )
      .build()
    const week = new WeekBuilder(1001)
      .addWorkout(workout)
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();

    const action: WorkoutEditorAction = {type: 'DUPLICATE_WORKOUT', planId: 1, weekId: 1001, workoutId: 1002};
    const newState = reducer(state, action, mockUuid);
    expect(newState.plans[0].weeks[0].workouts.length).toBe(2);
    const [original, duplicate] = newState.plans[0].weeks[0].workouts;
    expect(duplicate.id).not.toBe(original.id);
    expect(duplicate.exercises[0].id).not.toBe(original.exercises[0].id);
    expect(duplicate.exercises[0].id).not.toBe(original.exercises[0].id);
    expect(duplicate.exercises[0].sets[0].id).not.toBe(original.exercises[0].sets[0].id);
    // Sets in duplicate should have null weight/reps
    expect(duplicate.exercises[0].sets[0].weight).toBeNull();
    expect(duplicate.exercises[0].sets[0].reps).toBeNull();

    // Deep clone check: mutate duplicate, original should not change
    duplicate.name = 'Changed Name';
    duplicate.exercises[0].sets[0].weight = '999';
    expect(original.name).toBe('Workout');
    expect(original.exercises[0].sets[0].weight).toBe('100');
  });

  it('ADD_WORKOUT adds a workout to the specified week', () => {
    const plan = new PlanBuilder(1)
      .addWeek(new WeekBuilder(1).build())
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    const action: WorkoutEditorAction = {type: 'ADD_WORKOUT', planId: 1, weekId: 1};
    const newState = reducer(state, action, mockUuid);
    expect(newState.plans[0].weeks[0].workouts.length).toBe(1);
    expect(newState.plans[0].weeks[0].workouts[0].name).toBe('Workout 1');
  });

  it('REMOVE_WORKOUT removes the specified workout', () => {
    const week = new WeekBuilder(1)
      .addWorkout(new WorkoutBuilder(2).build())
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    const action: WorkoutEditorAction = {type: 'REMOVE_WORKOUT', planId: 1, weekId: 1, workoutId: 2};
    const newState = reducer(state, action, mockUuid);
    expect(newState.plans[0].weeks[0].workouts.length).toBe(0);
  });

  it('MOVE_WORKOUT swaps workouts up and down', () => {
    const week = new WeekBuilder(1)
        .addWorkout(
          new WorkoutBuilder(1, 1).build()
        )
      .addWorkout(new WorkoutBuilder(2, 2).build())
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    let newState = reducer(state, {type: 'MOVE_WORKOUT', planId: 1, weekId: 1, dir: Dir.DOWN, index: 0}, mockUuid);
    expect(newState.plans[0].weeks[0].workouts[0].id).toBe(2);
    expect(newState.plans[0].weeks[0].workouts[1].id).toBe(1);
    newState = reducer(newState, {type: 'MOVE_WORKOUT', planId: 1, weekId: 1, dir: Dir.UP, index: 1}, mockUuid);
    expect(newState.plans[0].weeks[0].workouts[0].id).toBe(1);
    expect(newState.plans[0].weeks[0].workouts[1].id).toBe(2);
  });

  it('ADD_EXERCISE adds an exercise to a workout', () => {
    const week = new WeekBuilder(1)
      .addWorkout(new WorkoutBuilder(2).build())
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    const action: WorkoutEditorAction = {type: 'ADD_EXERCISE', planId: 1, weekId: 1, workoutId: 2};
    const newState = reducer(state, action, mockUuid);
    expect(newState.plans[0].weeks[0].workouts[0].exercises.length).toBe(1);
    expect(newState.plans[0].weeks[0].workouts[0].exercises[0].exercise.name).toBe('');
  });

  it('REMOVE_EXERCISE removes the specified exercise', () => {
    const workout = new WorkoutBuilder(2)
      .addExercise(new ExerciseBuilder(3).build())
      .build();
    const week = new WeekBuilder(1)
      .addWorkout(workout)
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    const action: WorkoutEditorAction = {type: 'REMOVE_EXERCISE', planId: 1, weekId: 1, workoutId: 2, exerciseId: 3};
    const newState = reducer(state, action, mockUuid);
    expect(newState.plans[0].weeks[0].workouts[0].exercises.length).toBe(0);
  });

  it('MOVE_EXERCISE swaps exercises up and down', () => {
    const workout = new WorkoutBuilder(2, 1)
            .addExercise(
              new ExerciseBuilder(1, 1).build()
            )
      .addExercise(new ExerciseBuilder(2, 2).build())
      .build();
    const week = new WeekBuilder(1, 1)
      .addWorkout(workout)
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    let newState = reducer(state, {type: 'MOVE_EXERCISE', planId: 1, weekId: 1, workoutId: 2, dir: Dir.DOWN, index: 0}, mockUuid);
    expect(newState.plans[0].weeks[0].workouts[0].exercises[0].id).toBe(2);
    expect(newState.plans[0].weeks[0].workouts[0].exercises[1].id).toBe(1);
    newState = reducer(newState, {type: 'MOVE_EXERCISE', planId: 1, weekId: 1, workoutId: 2, dir: Dir.UP, index: 1}, mockUuid);
    expect(newState.plans[0].weeks[0].workouts[0].exercises[0].id).toBe(1);
    expect(newState.plans[0].weeks[0].workouts[0].exercises[1].id).toBe(2);
  });

  it('ADD_SET adds a set to an exercise', () => {
    const exercise = new ExerciseBuilder(3).build();
    const workout = new WorkoutBuilder(2)
      .addExercise(exercise)
      .build();
    const week = new WeekBuilder(1)
      .addWorkout(workout)
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    const action: WorkoutEditorAction = {type: 'ADD_SET', planId: 1, weekId: 1, workoutId: 2, exerciseId: 3};
    const newState = reducer(state, action, mockUuid);
    expect(newState.plans[0].weeks[0].workouts[0].exercises[0].sets.length).toBe(1);
    expect(newState.plans[0].weeks[0].workouts[0].exercises[0].sets[0].id).toBe(1);
  });

  it('REMOVE_SET removes the last set from an exercise', () => {
    const exercise = new ExerciseBuilder(3)
                .addSet(new SetBuilder(10, 1).build())
                .addSet(new SetBuilder(11, 2).build())
      .build();
    const workout = new WorkoutBuilder(2)
      .addExercise(exercise)
      .build();
    const week = new WeekBuilder(1)
      .addWorkout(workout)
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    const action: WorkoutEditorAction = {type: 'REMOVE_SET', planId: 1, weekId: 1, workoutId: 2, exerciseId: 3};
    const newState = reducer(state, action, mockUuid);
    expect(newState.plans[0].weeks[0].workouts[0].exercises[0].sets.length).toBe(1);
    expect(newState.plans[0].weeks[0].workouts[0].exercises[0].sets[0].id).toBe(10);
  });

  it('UPDATE_WORKOUT_NAME updates the workout name', () => {
    const workout = new WorkoutBuilder(2).build();
    const week = new WeekBuilder(1)
      .addWorkout(workout)
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    const action: WorkoutEditorAction = {type: 'UPDATE_WORKOUT_NAME', planId: 1, weekId: 1, workoutId: 2, name: 'New Name'};
    const newState = reducer(state, action, mockUuid);
    expect(newState.plans[0].weeks[0].workouts[0].name).toBe('New Name');
  });

  it('UPDATE_SET_WEIGHT updates the set weight', () => {
    const exercise = new ExerciseBuilder(3)
      .addSet(new SetBuilder(10).build())
      .build();
    const workout = new WorkoutBuilder(2)
      .addExercise(exercise)
      .build();
    const week = new WeekBuilder(1)
      .addWorkout(workout)
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    const action: WorkoutEditorAction = {
      type: 'UPDATE_SET_WEIGHT',
      planId: 1,
      exerciseId: 3,
      weekId: 1,
      workoutId: 2,
      setId: 10,
      weight: '200'
    };
    const newState = reducer(state, action, mockUuid);
    expect(newState.plans[0].weeks[0].workouts[0].exercises[0].sets[0].weight).toBe('200');
  });

  it('UPDATE_SET_REPS updates the set reps', () => {
    const exercise = new ExerciseBuilder(3)
      .addSet(new SetBuilder(10).build())
      .build();
    const workout = new WorkoutBuilder(2)
      .addExercise(exercise)
      .build();
    const week = new WeekBuilder(1)
      .addWorkout(workout)
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    const action: WorkoutEditorAction = {
      type: 'UPDATE_SET_REPS',
      planId: 1,
      exerciseId: 3,
      setId: 10,
      weekId: 1,
      workoutId: 2,
      reps: 12
    };
    const newState = reducer(state, action, mockUuid);
    expect(newState.plans[0].weeks[0].workouts[0].exercises[0].sets[0].reps).toBe(12);
  });

  it('UPDATE_REP_RANGE updates the rep range', () => {
    const exercise = new ExerciseBuilder(3).build();
    const workout = new WorkoutBuilder(2)
      .addExercise(exercise)
      .build();
    const week = new WeekBuilder(1)
      .addWorkout(workout)
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    const action: WorkoutEditorAction = {type: 'UPDATE_REP_RANGE', planId: 1, weekId: 1, workoutId: 2, workoutExerciseId: 3, repRange: '10-12'};
    const newState = reducer(state, action, mockUuid);
    expect(newState.plans[0].weeks[0].workouts[0].exercises[0].repRange).toBe('10-12');
  });

  it('UPDATE_REST_TIME updates the rest time', () => {
    const exercise = new ExerciseBuilder(3).build();
    const workout = new WorkoutBuilder(2)
      .addExercise(exercise)
      .build();
    const week = new WeekBuilder(1)
      .addWorkout(workout)
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    const action: WorkoutEditorAction = {type: 'UPDATE_REST_TIME', planId: 1, weekId: 1, workoutId: 2, workoutExerciseId: 3, restTime: '90'};
    const newState = reducer(state, action, mockUuid);
    expect(newState.plans[0].weeks[0].workouts[0].exercises[0].restTime).toBe('90');
  });

  it('UPDATE_CATEGORY updates the exercise category and resets name', () => {
    const exercise = new ExerciseBuilder(3).build();
    const workout = new WorkoutBuilder(2)
      .addExercise(exercise)
      .build();
    const week = new WeekBuilder(1)
      .addWorkout(workout)
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    const action: WorkoutEditorAction = {
      type: 'UPDATE_CATEGORY',
      planId: 1,
      weekId: 1,
      workoutId: 2,
      workoutExerciseId: 3,
      category: 'Back',
    };
    const newState = reducer(state, action, mockUuid);
    expect(newState.plans[0].weeks[0].workouts[0].exercises[0].exercise.category).toBe('Back');
    expect(newState.plans[0].weeks[0].workouts[0].exercises[0].exercise.name).toBe('');
  });

  it('UPDATE_EXERCISE updates the exercise object', () => {
    const exercise = new ExerciseBuilder(3).build();
    const workout = new WorkoutBuilder(2)
      .addExercise(exercise)
      .build();
    const week = new WeekBuilder(1)
      .addWorkout(workout)
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    const exercises = [
      {id: 1, name: 'Bench Press', category: 'Chest', description: null, equipment: [], muscles: []},
      {id: 2, name: 'Pull Up', category: 'Back', description: null, equipment: [], muscles: []},
    ];
    const action: WorkoutEditorAction = {
      type: 'UPDATE_EXERCISE',
      planId: 1,
      weekId: 1,
      workoutId: 2,
      workoutExerciseId: 3,
      exerciseName: 'Pull Up',
      exercises,
      category: 'Back',
    };
    const newState = reducer(state, action, mockUuid);
    expect(newState.plans[0].weeks[0].workouts[0].exercises[0].exercise.name).toBe('Pull Up');
    expect(newState.plans[0].weeks[0].workouts[0].exercises[0].exercise.category).toBe('Back');
  });

  it('MOVE_WORKOUT does not move workout out of bounds', () => {
    const week = new WeekBuilder(1, 1)
      .addWorkout(new WorkoutBuilder(1, 1).build())
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    const newState = reducer(state, {type: 'MOVE_WORKOUT', planId: 1, weekId: 1, dir: Dir.UP, index: 0}, mockUuid);
    expect(newState.plans[0].weeks[0].workouts[0].id).toBe(1);
  });

  it('MOVE_EXERCISE does not move exercise out of bounds', () => {
    const workout = new WorkoutBuilder(2, 1)
      .addExercise(new ExerciseBuilder(1, 2).build())
      .build();
    const week = new WeekBuilder(1, 1)
      .addWorkout(workout)
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    const newState = reducer(state, {type: 'MOVE_EXERCISE', planId: 1, weekId: 1, workoutId: 2, dir: Dir.UP, index: 0}, mockUuid);
    expect(newState.plans[0].weeks[0].workouts[0].exercises[0].id).toBe(1);
  });

  it('REMOVE_WEEK non-existent week is a no op', () => {
    const state = new UserBuilder(1)
      .addPlan(new PlanBuilder(1).build())
      .build();
    // No weeks added, so weekId: 999 does not exist
    const prevState = JSON.parse(JSON.stringify(state));
    const newState = reducer(state, {type: 'REMOVE_WEEK', planId: 1, weekId: 999}, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('REMOVE_WORKOUT non-existent workout is a no op', () => {
    const plan = new PlanBuilder(1)
      .addWeek(new WeekBuilder(1).build())
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    const prevState = JSON.parse(JSON.stringify(state));
    const newState = reducer(state, {type: 'REMOVE_WORKOUT', planId: 1, weekId: 1, workoutId: 999}, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('REMOVE_EXERCISE non-existent exercise is a no op', () => {
    const workout = new WorkoutBuilder(2).build();
    const week = new WeekBuilder(1)
      .addWorkout(workout)
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    const prevState = JSON.parse(JSON.stringify(state));
    const newState = reducer(state, {type: 'REMOVE_EXERCISE', planId: 1, weekId: 1, workoutId: 2, exerciseId: 999}, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('UPDATE_SET_WEIGHT on non-existent set is a no-op', () => {
    const exercise = new ExerciseBuilder(3)
      .addSet(new SetBuilder(10).build())
      .build();
    const workout = new WorkoutBuilder(2)
      .addExercise(exercise)
      .build();
    const week = new WeekBuilder(1)
      .addWorkout(workout)
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    const prevState = JSON.parse(JSON.stringify(state));
    const action: WorkoutEditorAction = {
      type: 'UPDATE_SET_WEIGHT',
      planId: 1,
      exerciseId: 3,
      weekId: 1,
      workoutId: 2,
      setId: 999,
      weight: '200'};
    const newState = reducer(state, action, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('UPDATE_SET_REPS on non-existent set is a no-op', () => {
    const exercise = new ExerciseBuilder(3)
      .addSet(new SetBuilder(10).build())
      .build();
    const workout = new WorkoutBuilder(2)
      .addExercise(exercise)
      .build();
    const week = new WeekBuilder(1)
      .addWorkout(workout)
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    const prevState = JSON.parse(JSON.stringify(state));
    const action: WorkoutEditorAction = {
      type: 'UPDATE_SET_REPS',
      planId: 1,
      exerciseId: 3,
      weekId: 1,
      workoutId: 2,
      setId: 999,
      reps: 12};
    const newState = reducer(state, action, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('UPDATE_REP_RANGE on non-existent exercise is a no-op', () => {
    const exercise = new ExerciseBuilder(3).build();
    const workout = new WorkoutBuilder(2)
      .addExercise(exercise)
      .build();
    const week = new WeekBuilder(1)
      .addWorkout(workout)
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    const prevState = JSON.parse(JSON.stringify(state));
    const action: WorkoutEditorAction = {type: 'UPDATE_REP_RANGE', planId: 1, weekId: 1, workoutId: 2, workoutExerciseId: 999, repRange: '10-12'};
    const newState = reducer(state, action, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('UPDATE_REST_TIME on non-existent exercise is a no-op', () => {
    const exercise = new ExerciseBuilder(3).build();
    const workout = new WorkoutBuilder(2)
      .addExercise(exercise)
      .build();
    const week = new WeekBuilder(1)
      .addWorkout(workout)
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();
    const prevState = JSON.parse(JSON.stringify(state));
    const action: WorkoutEditorAction = {type: 'UPDATE_REST_TIME', planId: 1, weekId: 1, workoutId: 2, workoutExerciseId: 999, restTime: '90'};
    const newState = reducer(state, action, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('REMOVES_WORKOUT, on item in the middle, and updates order properties', () => {
    const week = new WeekBuilder(10, 1)
          .addWorkout(new WorkoutBuilder(100, 1).build())
          .addWorkout(new WorkoutBuilder(101, 2).build())
          .addWorkout(new WorkoutBuilder(102, 3).build())
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();

    const action: WorkoutEditorAction = {type: 'REMOVE_WORKOUT', planId: 1, weekId: 10, workoutId: 101};
    const newState = reducer(state, action, mockUuid);

    expect(newState.plans[0].weeks[0].workouts).toHaveLength(2);
    expect(newState.plans[0].weeks[0].workouts[0].order).toBe(1);
    expect(newState.plans[0].weeks[0].workouts[1].order).toBe(2);
    expect(newState.plans[0].weeks[0].workouts[0].id).toBe(100);
    expect(newState.plans[0].weeks[0].workouts[1].id).toBe(102);
  });

  it('REMOVES_WEEK, on item in the middle, updates order properties', () => {
    const plan = new PlanBuilder(1)
      .addWeek(new WeekBuilder(10, 1).build())
      .addWeek(new WeekBuilder(11, 2).build())
      .addWeek(new WeekBuilder(12, 3).build())
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();

    const action: WorkoutEditorAction = {type: 'REMOVE_WEEK', planId: 1, weekId: 11};
    const newState = reducer(state, action, mockUuid);

    expect(newState.plans[0].weeks).toHaveLength(2);
    expect(newState.plans[0].weeks[0].order).toBe(1);
    expect(newState.plans[0].weeks[1].order).toBe(2);
    expect(newState.plans[0].weeks[0].id).toBe(10);
    expect(newState.plans[0].weeks[1].id).toBe(12);
  });

  it('UPDATE_PLAN_NAME updates the plan name', () => {
    const plan = new PlanBuilder(1).build();
    const state = new UserBuilder(1).addPlan(plan).build();
    const action: WorkoutEditorAction = { type: 'UPDATE_PLAN_NAME', planId: 1, name: 'My New Plan' };
    const newState = reducer(state, action, mockUuid);
    expect(newState.plans[0].name).toBe('My New Plan');
  });

  it('ADD_EXERCISE_WITH_SET adds an exercise with one blank set', () => {
    const week = new WeekBuilder(1).addWorkout(new WorkoutBuilder(2).build()).build();
    const plan = new PlanBuilder(1).addWeek(week).build();
    const state = new UserBuilder(1).addPlan(plan).build();
    const action: WorkoutEditorAction = { type: 'ADD_EXERCISE_WITH_SET', planId: 1, weekId: 1, workoutId: 2 };
    const newState = reducer(state, action, mockUuid);
    const exercises = newState.plans[0].weeks[0].workouts[0].exercises;
    expect(exercises).toHaveLength(1);
    expect(exercises[0].sets).toHaveLength(1);
    expect(exercises[0].sets[0].reps).toBeNull();
    expect(exercises[0].sets[0].weight).toBeNull();
  });

  it('ADD_WORKOUT_WITH_EXERCISE_WITH_SET adds a workout with an exercise and a set', () => {
    const week = new WeekBuilder(1).build();
    const plan = new PlanBuilder(1).addWeek(week).build();
    const state = new UserBuilder(1).addPlan(plan).build();
    const action: WorkoutEditorAction = { type: 'ADD_WORKOUT_WITH_EXERCISE_WITH_SET', planId: 1, weekId: 1 };
    const newState = reducer(state, action, mockUuid);
    const workouts = newState.plans[0].weeks[0].workouts;
    expect(workouts).toHaveLength(1);
    expect(workouts[0].exercises).toHaveLength(1);
    expect(workouts[0].exercises[0].sets).toHaveLength(1);
    expect(workouts[0].name).toBe('Workout 1');
  });

  it('UPDATE_SET_COUNT increases the set count', () => {
    const exercise = new ExerciseBuilder(3).addSet(new SetBuilder(10, 1).build()).build();
    const workout = new WorkoutBuilder(2).addExercise(exercise).build();
    const week = new WeekBuilder(1).addWorkout(workout).build();
    const plan = new PlanBuilder(1).addWeek(week).build();
    const state = new UserBuilder(1).addPlan(plan).build();
    const action: WorkoutEditorAction = { type: 'UPDATE_SET_COUNT', planId: 1, weekId: 1, workoutId: 2, workoutExerciseId: 3, setCount: 3 };
    const newState = reducer(state, action, mockUuid);
    expect(newState.plans[0].weeks[0].workouts[0].exercises[0].sets).toHaveLength(3);
  });

  it('UPDATE_SET_COUNT decreases the set count', () => {
    const exercise = new ExerciseBuilder(3)
      .addSet(new SetBuilder(10, 1).build())
      .addSet(new SetBuilder(11, 2).build())
      .addSet(new SetBuilder(12, 3).build())
      .build();
    const workout = new WorkoutBuilder(2).addExercise(exercise).build();
    const week = new WeekBuilder(1).addWorkout(workout).build();
    const plan = new PlanBuilder(1).addWeek(week).build();
    const state = new UserBuilder(1).addPlan(plan).build();
    const action: WorkoutEditorAction = { type: 'UPDATE_SET_COUNT', planId: 1, weekId: 1, workoutId: 2, workoutExerciseId: 3, setCount: 1 };
    const newState = reducer(state, action, mockUuid);
    const sets = newState.plans[0].weeks[0].workouts[0].exercises[0].sets;
    expect(sets).toHaveLength(1);
    expect(sets[0].id).toBe(10);
  });

  it('REMOVE_EXERCISE, on item in the middle, updates order properties', () => {
    const workout = new WorkoutBuilder(100, 1)
              .addExercise(new ExerciseBuilder(200, 1).build())
              .addExercise(new ExerciseBuilder(201, 2).build())
              .addExercise(new ExerciseBuilder(202, 3).build())
      .build();
    const week = new WeekBuilder(10, 1)
      .addWorkout(workout)
      .build();
    const plan = new PlanBuilder(1)
      .addWeek(week)
      .build();
    const state = new UserBuilder(1)
      .addPlan(plan)
      .build();

    const action: WorkoutEditorAction = {type: 'REMOVE_EXERCISE', planId: 1, weekId: 10, workoutId: 100, exerciseId: 201};
    const newState = reducer(state, action, mockUuid);

    const exercises = newState.plans[0].weeks[0].workouts[0].exercises;
    expect(exercises).toHaveLength(2);
    expect(exercises[0].order).toBe(1);
    expect(exercises[1].order).toBe(2);
    expect(exercises[0].id).toBe(200);
    expect(exercises[1].id).toBe(202);
  });
});

function buildUser(): UserPrisma {
  const week1 = new WeekBuilder(101, 1)
    .addWorkout(new WorkoutBuilder(201, 1)
      .addExercise(new ExerciseBuilder(301, 1)
        .addSet(new SetBuilder(401, 1).build())
        .addSet(new SetBuilder(402, 2).build())
        .build())
      .addExercise(new ExerciseBuilder(302, 2)
        .addSet(new SetBuilder(403, 1).build())
        .build())
      .build())
    .build();


  const week2 = new WeekBuilder(102, 2)
    .addWorkout(new WorkoutBuilder(202, 1)
      .addExercise(new ExerciseBuilder(303, 1)
        .addSet(new SetBuilder(404, 1)
          .build()).build()).build()).build();

  const plan = new PlanBuilder(1)
    .addWeek(week1)
    .addWeek(week2)
    .build();

  return new UserBuilder(1).addPlan(plan).build();
}

describe("updateUserSets", () => {
  it("updates the sets for the correct exercise", () => {
    const user = buildUser();

    const newSets: SetPrisma[] = [
      new SetBuilder(405, 1).build(),
      new SetBuilder(406, 2).build(),
    ];

    const updatedUser = updateUserSets(
      user,
      1,   // planId
      101, // weekId
      201, // workoutId
      301, // exerciseId
      newSets
    );

    // Check that the sets for exercise 301 are updated
    const updatedSets =
      updatedUser.plans[0].weeks[0].workouts[0].exercises[0].sets;
    expect(updatedSets).toEqual(newSets);

    // Other exercises remain unchanged
    expect(
      updatedUser.plans[0].weeks[0].workouts[0].exercises[1].sets
    ).toEqual(user.plans[0].weeks[0].workouts[0].exercises[1].sets);

    // Other weeks remain unchanged
    expect(updatedUser.plans[0].weeks[1]).toEqual(user.plans[0].weeks[1]);
  });

  it("does not modify user if weekId does not match", () => {
    const user = buildUser();
    const newSets: SetPrisma[] = [new SetBuilder(407, 1).build()];

    const updatedUser = updateUserSets(
      user,
      1,   // planId
      999, // non-existent weekId
      201,
      301,
      newSets
    );

    expect(updatedUser).toEqual(user);
  });

  it("does not modify user if workoutId does not match", () => {
    const user = buildUser();
    const newSets: SetPrisma[] = [new SetBuilder(408, 1).build()];

    const updatedUser = updateUserSets(
      user,
      1,   // planId
      101,
      999, // non-existent workoutId
      301,
      newSets
    );

    expect(updatedUser).toEqual(user);
  });

  it("does not modify user if exerciseId does not match", () => {
    const user = buildUser();
    const newSets: SetPrisma[] = [new SetBuilder(409, 1).build()];

    const updatedUser = updateUserSets(
      user,
      1,   // planId
      101,
      201,
      999, // non-existent exerciseId
      newSets
    );

    expect(updatedUser).toEqual(user);
  });
});