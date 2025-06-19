import {Dir, reducer, WorkoutEditorAction} from './useWorkoutEditor';
import {ExerciseBuilder, SetBuilder, UserBuilder, WeekBuilder, WorkoutBuilder} from '@/testUtils/builders';
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
    const state = new UserBuilder(1).build();
    // @ts-expect-error - Testing invalid action
    expect(() => reducer(state, {type: 'UNKNOWN'}, mockUuid)).toThrow('Unexpected action');
  });

  it('ADD_WEEK adds a new week', () => {
    const state = new UserBuilder(1).build();
    const action: WorkoutEditorAction = {type: 'ADD_WEEK'};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks.length).toBe(1);
    expect(newState.weeks[0].id).toBe(1);
    expect(newState.weeks[0].workouts).toEqual([]);
  });

  it('REMOVE_WEEK removes the specified week', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(42, 1).build()
    );
    const action: WorkoutEditorAction = {type: 'REMOVE_WEEK', weekId: 42};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks.length).toBe(0);
  });

  it('DUPLICATE_WEEK duplicates a week with new IDs', () => {
    const state = new UserBuilder(1).build();
    // Use builders for mock data
    const week = new WeekBuilder(1001,)
      .addWorkout(
        new WorkoutBuilder(1002,)
          .addExercise(
            new ExerciseBuilder(1003,)
              .addSet(
                new SetBuilder(1004,).build()
              )
              .build()
          )
          .build()
      )
      .build();
    state.weeks.push(week);

    const action: WorkoutEditorAction = {type: 'DUPLICATE_WEEK', weekId: 1001};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks.length).toBe(2);
    const [original, duplicate] = newState.weeks;
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

  it('ADD_WORKOUT adds a workout to the specified week', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(1,).build()
    );
    const action: WorkoutEditorAction = {type: 'ADD_WORKOUT', weekId: 1};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts.length).toBe(1);
    expect(newState.weeks[0].workouts[0].name).toBe('New Workout');
  });

  it('REMOVE_WORKOUT removes the specified workout', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(1,)
        .addWorkout(
          new WorkoutBuilder(2,)
            .build()
        )
        .build()
    );
    const action: WorkoutEditorAction = {type: 'REMOVE_WORKOUT', weekId: 1, workoutId: 2};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts.length).toBe(0);
  });

  it('MOVE_WORKOUT swaps workouts up and down', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(1,)
        .addWorkout(
          new WorkoutBuilder(1, 1).build()
        )
        .addWorkout(
          new WorkoutBuilder(2, 2).build()
        )
        .build()
    );
    let newState = reducer(state, {type: 'MOVE_WORKOUT', weekId: 1, dir: Dir.DOWN, index: 0}, mockUuid);
    expect(newState.weeks[0].workouts[0].id).toBe(2);
    expect(newState.weeks[0].workouts[1].id).toBe(1);
    newState = reducer(newState, {type: 'MOVE_WORKOUT', weekId: 1, dir: Dir.UP, index: 1}, mockUuid);
    expect(newState.weeks[0].workouts[0].id).toBe(1);
    expect(newState.weeks[0].workouts[1].id).toBe(2);
  });

  it('ADD_EXERCISE adds an exercise to a workout', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(1,)
        .addWorkout(
          new WorkoutBuilder(2,).build()
        )
        .build()
    );
    const action: WorkoutEditorAction = {type: 'ADD_EXERCISE', weekId: 1, workoutId: 2};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises.length).toBe(1);
    expect(newState.weeks[0].workouts[0].exercises[0].exercise.name).toBe('N/A');
  });

  it('REMOVE_EXERCISE removes the specified exercise', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(1,)
        .addWorkout(
          new WorkoutBuilder(2,)
            .addExercise(
              new ExerciseBuilder(3,)
                .build()
            )
            .build()
        )
        .build()
    );
    const action: WorkoutEditorAction = {type: 'REMOVE_EXERCISE', weekId: 1, workoutId: 2, exerciseId: 3};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises.length).toBe(0);
  });

  it('MOVE_EXERCISE swaps exercises up and down', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(1, 1)
        .addWorkout(
          new WorkoutBuilder(2, 1)
            .addExercise(
              new ExerciseBuilder(1, 1).build()
            )
            .addExercise(
              new ExerciseBuilder(2, 2)
                .build()
            )
            .build()
        )
        .build()
    );
    let newState = reducer(state, {type: 'MOVE_EXERCISE', weekId: 1, workoutId: 2, dir: Dir.DOWN, index: 0}, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].id).toBe(2);
    expect(newState.weeks[0].workouts[0].exercises[1].id).toBe(1);
    newState = reducer(newState, {type: 'MOVE_EXERCISE', weekId: 1, workoutId: 2, dir: Dir.UP, index: 1}, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].id).toBe(1);
    expect(newState.weeks[0].workouts[0].exercises[1].id).toBe(2);
  });

  it('ADD_SET adds a set to an exercise', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(1,)
        .addWorkout(
          new WorkoutBuilder(2,)
            .addExercise(
              new ExerciseBuilder(3,)
                .build()
            )
            .build()
        )
        .build()
    );
    const action: WorkoutEditorAction = {type: 'ADD_SET', weekId: 1, workoutId: 2, exerciseId: 3};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].sets.length).toBe(1);
    expect(newState.weeks[0].workouts[0].exercises[0].sets[0].id).toBe(1);
  });

  it('REMOVE_SET removes the last set from an exercise', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(1,)
        .addWorkout(
          new WorkoutBuilder(2,)
            .addExercise(
              new ExerciseBuilder(3,)
                .addSet(new SetBuilder(10, 1).build())
                .addSet(new SetBuilder(11, 2).build())
                .build()
            )
            .build()
        )
        .build()
    );
    const action: WorkoutEditorAction = {type: 'REMOVE_SET', weekId: 1, workoutId: 2, exerciseId: 3};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].sets.length).toBe(1);
    expect(newState.weeks[0].workouts[0].exercises[0].sets[0].id).toBe(10);
  });

  it('UPDATE_WORKOUT_NAME updates the workout name', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(1,)
        .addWorkout(
          new WorkoutBuilder(2,).build()
        )
        .build()
    );
    const action: WorkoutEditorAction = {type: 'UPDATE_WORKOUT_NAME', weekId: 1, workoutId: 2, name: 'New Name'};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].name).toBe('New Name');
  });

  it('UPDATE_SET_WEIGHT updates the set weight', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(1,)
        .addWorkout(
          new WorkoutBuilder(2,)
            .addExercise(
              new ExerciseBuilder(3,)
                .addSet(new SetBuilder(10,).build())
                .build()
            )
            .build()
        )
        .build()
    );
    const action: WorkoutEditorAction = {
      type: 'UPDATE_SET_WEIGHT',
      exerciseId: 3,
      weekId: 1,
      workoutId: 2,
      setId: 10,
      weight: '200'
    };
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].sets[0].weight).toBe('200');
  });

  it('UPDATE_SET_REPS updates the set reps', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(1,)
        .addWorkout(
          new WorkoutBuilder(2,)
            .addExercise(
              new ExerciseBuilder(3,)
                .addSet(new SetBuilder(10,).build())
                .build()
            )
            .build()
        )
        .build()
    );
    const action: WorkoutEditorAction = {
      type: 'UPDATE_SET_REPS',
      exerciseId: 3,
      setId: 10,
      weekId: 1,
      workoutId: 2,
      reps: 12
    };
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].sets[0].reps).toBe(12);
  });

  it('UPDATE_REP_RANGE updates the rep range', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(1,)
        .addWorkout(
          new WorkoutBuilder(2,)
            .addExercise(
              new ExerciseBuilder(3,)
                .build()
            )
            .build()
        )
        .build()
    );
    const action: WorkoutEditorAction = {type: 'UPDATE_REP_RANGE', weekId: 1, workoutId: 2,workoutExerciseId: 3, repRange: '10-12'};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].repRange).toBe('10-12');
  });

  it('UPDATE_REST_TIME updates the rest time', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(1,)
        .addWorkout(
          new WorkoutBuilder(2,)
            .addExercise(
              new ExerciseBuilder(3,)
                .build()
            )
            .build()
        )
        .build()
    );
    const action: WorkoutEditorAction = {type: 'UPDATE_REST_TIME', weekId: 1, workoutId: 2,workoutExerciseId: 3, restTime: '90'};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].restTime).toBe('90');
  });

  it('UPDATE_CATEGORY updates the exercise category and resets name', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(1,)
        .addWorkout(
          new WorkoutBuilder(2,)
            .addExercise(
              new ExerciseBuilder(3,)
                .build()
            )
            .build()
        )
        .build()
    );
    const action: WorkoutEditorAction = {
      type: 'UPDATE_CATEGORY',
      weekId: 1,
      workoutId: 2,
      workoutExerciseId: 3,
      category: 'Back',
    };
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].exercise.category).toBe('Back');
    expect(newState.weeks[0].workouts[0].exercises[0].exercise.name).toBe('');
  });

  it('UPDATE_EXERCISE updates the exercise object', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(1,)
        .addWorkout(
          new WorkoutBuilder(2,)
            .addExercise(
              new ExerciseBuilder(3,)
                .build()
            )
            .build()
        )
        .build()
    );
    const exercises = [
      {id: 1, name: 'Bench Press', category: 'Chest', description: null},
      {id: 2, name: 'Pull Up', category: 'Back', description: null},
    ];
    const action: WorkoutEditorAction = {
      type: 'UPDATE_EXERCISE',
      weekId: 1,
      workoutId: 2,
      workoutExerciseId: 3,
      exerciseName: 'Pull Up',
      exercises,
      category: 'Back',
    };
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].exercise.name).toBe('Pull Up');
    expect(newState.weeks[0].workouts[0].exercises[0].exercise.category).toBe('Back');
  });

  it('MOVE_WORKOUT does not move workout out of bounds', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(1, 1)
        .addWorkout(
          new WorkoutBuilder(1, 1).build()
        )
        .build()
    );
    const newState = reducer(state, {type: 'MOVE_WORKOUT', weekId: 1, dir: Dir.UP, index: 0}, mockUuid);
    expect(newState.weeks[0].workouts[0].id).toBe(1);
  });

  it('MOVE_EXERCISE does not move exercise out of bounds', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(1, 1)
        .addWorkout(
          new WorkoutBuilder(2, 1)
            .addExercise(
              new ExerciseBuilder(1, 2,)
                .build()
            )
            .build()
        )
        .build()
    );
    const newState = reducer(state, {type: 'MOVE_EXERCISE', weekId: 1, workoutId: 2, dir: Dir.UP, index: 0}, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].id).toBe(1);
  });

  it('REMOVE_WEEK non-existent week is a no op', () => {
    const state = new UserBuilder(1).build();
    // No weeks added, so weekId: 999 does not exist
    const prevState = JSON.parse(JSON.stringify(state));
    const newState = reducer(state, {type: 'REMOVE_WEEK', weekId: 999}, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('REMOVE_WORKOUT non-existent workout is a no op', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(1,).build()
    );
    const prevState = JSON.parse(JSON.stringify(state));
    const newState = reducer(state, {type: 'REMOVE_WORKOUT', weekId: 1, workoutId: 999}, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('REMOVE_EXERCISE non-existent exercise is a no op', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(1,)
        .addWorkout(
          new WorkoutBuilder(2,).build()
        )
        .build()
    );
    const prevState = JSON.parse(JSON.stringify(state));
    const newState = reducer(state, {type: 'REMOVE_EXERCISE', weekId: 1, workoutId: 2, exerciseId: 999}, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('UPDATE_SET_WEIGHT on non-existent set is a no-op', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(1,)
        .addWorkout(
          new WorkoutBuilder(2,)
            .addExercise(
              new ExerciseBuilder(3,)
                .addSet(new SetBuilder(10,).build())
                .build()
            )
            .build()
        )
        .build()
    );
    const prevState = JSON.parse(JSON.stringify(state));
    const action: WorkoutEditorAction = {
      type: 'UPDATE_SET_WEIGHT',
      exerciseId: 3,
      weekId: 1,
      workoutId: 2,
      setId: 999,
      weight: '200'};
    const newState = reducer(state, action, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('UPDATE_SET_REPS on non-existent set is a no-op', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(1,)
        .addWorkout(
          new WorkoutBuilder(2,)
            .addExercise(
              new ExerciseBuilder(3,)
                .addSet(new SetBuilder(10,).build())
                .build()
            )
            .build()
        )
        .build()
    );
    const prevState = JSON.parse(JSON.stringify(state));
    const action: WorkoutEditorAction = {
      type: 'UPDATE_SET_REPS',
      exerciseId: 3,
      weekId: 1,
      workoutId: 2,
      setId: 999,
      reps: 12};
    const newState = reducer(state, action, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('UPDATE_REP_RANGE on non-existent exercise is a no-op', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(1,)
        .addWorkout(
          new WorkoutBuilder(2,)
            .addExercise(
              new ExerciseBuilder(3,)
                .build()
            )
            .build()
        )
        .build()
    );
    const prevState = JSON.parse(JSON.stringify(state));
    const action: WorkoutEditorAction = {type: 'UPDATE_REP_RANGE', weekId: 1, workoutId: 2,workoutExerciseId: 999, repRange: '10-12'};
    const newState = reducer(state, action, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('UPDATE_REST_TIME on non-existent exercise is a no-op', () => {
    const state = new UserBuilder(1).build();
    state.weeks.push(
      new WeekBuilder(1,)
        .addWorkout(
          new WorkoutBuilder(2,)
            .addExercise(
              new ExerciseBuilder(3,)
                .build()
            )
            .build()
        )
        .build()
    );
    const prevState = JSON.parse(JSON.stringify(state));
    const action: WorkoutEditorAction = {type: 'UPDATE_REST_TIME', weekId: 1, workoutId: 2,workoutExerciseId: 999, restTime: '90'};
    const newState = reducer(state, action, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('REMOVES_WORKOUT, on item in the middle, and updates order properties', () => {
    const state = new UserBuilder(1)
      .addWeek(
        new WeekBuilder(10, 1)
          .addWorkout(new WorkoutBuilder(100, 1).build())
          .addWorkout(new WorkoutBuilder(101, 2).build())
          .addWorkout(new WorkoutBuilder(102, 3).build())
          .build()
      )
      .build();

    const action: WorkoutEditorAction = {type: 'REMOVE_WORKOUT', weekId: 10, workoutId: 101};
    const newState = reducer(state, action, mockUuid);

    expect(newState.weeks[0].workouts).toHaveLength(2);
    expect(newState.weeks[0].workouts[0].order).toBe(1);
    expect(newState.weeks[0].workouts[1].order).toBe(2);
    expect(newState.weeks[0].workouts[0].id).toBe(100);
    expect(newState.weeks[0].workouts[1].id).toBe(102);
  });

  it('REMOVES_WEEK, on item in the middle, updates order properties', () => {
    const state = new UserBuilder(1)
      .addWeek(new WeekBuilder(10, 1).build())
      .addWeek(new WeekBuilder(11, 2).build())
      .addWeek(new WeekBuilder(12, 3).build())
      .build();

    const action: WorkoutEditorAction = {type: 'REMOVE_WEEK', weekId: 11};
    const newState = reducer(state, action, mockUuid);

    expect(newState.weeks).toHaveLength(2);
    expect(newState.weeks[0].order).toBe(1);
    expect(newState.weeks[1].order).toBe(2);
    expect(newState.weeks[0].id).toBe(10);
    expect(newState.weeks[1].id).toBe(12);
  });

  it('REMOVE_EXERCISE, on item in the middle, updates order properties', () => {
    const state = new UserBuilder(1)
      .addWeek(
        new WeekBuilder(10, 1)
          .addWorkout(
            new WorkoutBuilder(100, 1)
              .addExercise(new ExerciseBuilder(200, 1).build())
              .addExercise(new ExerciseBuilder(201, 2).build())
              .addExercise(new ExerciseBuilder(202, 3).build())
              .build()
          )
          .build()
      )
      .build();

    const action: WorkoutEditorAction = {type: 'REMOVE_EXERCISE', weekId: 10, workoutId: 100, exerciseId: 201};
    const newState = reducer(state, action, mockUuid);

    const exercises = newState.weeks[0].workouts[0].exercises;
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


  return new UserBuilder(1).addWeek(week1).addWeek(week2).build()
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
      101, // weekId
      201, // workoutId
      301, // exerciseId
      newSets
    );

    // Check that the sets for exercise 301 are updated
    const updatedSets =
      updatedUser.weeks[0].workouts[0].exercises[0].sets;
    expect(updatedSets).toEqual(newSets);

    // Other exercises remain unchanged
    expect(
      updatedUser.weeks[0].workouts[0].exercises[1].sets
    ).toEqual(user.weeks[0].workouts[0].exercises[1].sets);

    // Other weeks remain unchanged
    expect(updatedUser.weeks[1]).toEqual(user.weeks[1]);
  });

  it("does not modify user if weekId does not match", () => {
    const user = buildUser();
    const newSets: SetPrisma[] = [new SetBuilder(407, 1).build()];

    const updatedUser = updateUserSets(
      user,
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
      101,
      201,
      999, // non-existent exerciseId
      newSets
    );

    expect(updatedUser).toEqual(user);
  });
});