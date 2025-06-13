import {Dir, reducer, WorkoutEditorAction} from './useWorkoutEditor';
import {UserPrisma} from '@/types/dataTypes';
import {ExerciseBuilder, SetBuilder, WeekBuilder, WorkoutBuilder} from '@/testUtils/builders';

// Deterministic UUID generator for testing
let nextId = 1;
const mockUuid = () => nextId++;

beforeEach(() => {
  nextId = 1;
});

function getInitialState(): UserPrisma {
  return {
    email: "testEmail",
    id: 1,
    name: 'Test User',
    weeks: []
  };
}

describe('reducer', () => {
  it('throws for unknown action', () => {
    const state = getInitialState();
    // @ts-expect-error - Testing invalid action
    expect(() => reducer(state, {type: 'UNKNOWN'}, mockUuid)).toThrow('Unexpected action');
  });

  it('ADD_WEEK adds a new week', () => {
    const state = getInitialState();
    const action: WorkoutEditorAction = {type: 'ADD_WEEK'};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks.length).toBe(1);
    expect(newState.weeks[0].id).toBe(1);
    expect(newState.weeks[0].workouts).toEqual([]);
  });

  it('REMOVE_WEEK removes the specified week', () => {
    const state = getInitialState();
    state.weeks.push(
      new WeekBuilder(42, 1).build()
    );
    const action: WorkoutEditorAction = {type: 'REMOVE_WEEK', weekId: 42};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks.length).toBe(0);
  });

  it('DUPLICATE_WEEK duplicates a week with new IDs', () => {
    const state = getInitialState();
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
    const state = getInitialState();
    state.weeks.push(
      new WeekBuilder(1,).build()
    );
    const action: WorkoutEditorAction = {type: 'ADD_WORKOUT', weekId: 1};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts.length).toBe(1);
    expect(newState.weeks[0].workouts[0].name).toBe('New Workout');
  });

  it('REMOVE_WORKOUT removes the specified workout', () => {
    const state = getInitialState();
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
    const state = getInitialState();
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
    const state = getInitialState();
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
    const state = getInitialState();
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
    const state = getInitialState();
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
    const state = getInitialState();
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
    const state = getInitialState();
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
    const state = getInitialState();
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
    const state = getInitialState();
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
    const action: WorkoutEditorAction = {type: 'UPDATE_SET_WEIGHT', workoutExerciseId: 3, setId: 10, weight: '200'};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].sets[0].weight).toBe('200');
  });

  it('UPDATE_SET_REPS updates the set reps', () => {
    const state = getInitialState();
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
    const action: WorkoutEditorAction = {type: 'UPDATE_SET_REPS', workoutExerciseId: 3, setId: 10, reps: 12};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].sets[0].reps).toBe(12);
  });

  it('UPDATE_REP_RANGE updates the rep range', () => {
    const state = getInitialState();
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
    const action: WorkoutEditorAction = {type: 'UPDATE_REP_RANGE', workoutExerciseId: 3, repRange: '10-12'};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].repRange).toBe('10-12');
  });

  it('UPDATE_REST_TIME updates the rest time', () => {
    const state = getInitialState();
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
    const action: WorkoutEditorAction = {type: 'UPDATE_REST_TIME', workoutExerciseId: 3, restTime: '90'};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].restTime).toBe('90');
  });

  it('UPDATE_CATEGORY updates the exercise category and resets name', () => {
    const state = getInitialState();
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
    const state = getInitialState();
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
    const state = getInitialState();
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
    const state = getInitialState();
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
    const state = getInitialState();
    // No weeks added, so weekId: 999 does not exist
    const prevState = JSON.parse(JSON.stringify(state));
    const newState = reducer(state, {type: 'REMOVE_WEEK', weekId: 999}, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('REMOVE_WORKOUT non-existent workout is a no op', () => {
    const state = getInitialState();
    state.weeks.push(
      new WeekBuilder(1,).build()
    );
    const prevState = JSON.parse(JSON.stringify(state));
    const newState = reducer(state, {type: 'REMOVE_WORKOUT', weekId: 1, workoutId: 999}, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('REMOVE_EXERCISE non-existent exercise is a no op', () => {
    const state = getInitialState();
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
    const state = getInitialState();
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
    const action: WorkoutEditorAction = {type: 'UPDATE_SET_WEIGHT', workoutExerciseId: 3, setId: 999, weight: '200'};
    const newState = reducer(state, action, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('UPDATE_SET_REPS on non-existent set is a no-op', () => {
    const state = getInitialState();
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
    const action: WorkoutEditorAction = {type: 'UPDATE_SET_REPS', workoutExerciseId: 3, setId: 999, reps: 12};
    const newState = reducer(state, action, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('UPDATE_REP_RANGE on non-existent exercise is a no-op', () => {
    const state = getInitialState();
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
    const action: WorkoutEditorAction = {type: 'UPDATE_REP_RANGE', workoutExerciseId: 999, repRange: '10-12'};
    const newState = reducer(state, action, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('UPDATE_REST_TIME on non-existent exercise is a no-op', () => {
    const state = getInitialState();
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
    const action: WorkoutEditorAction = {type: 'UPDATE_REST_TIME', workoutExerciseId: 999, restTime: '90'};
    const newState = reducer(state, action, mockUuid);
    expect(newState).toEqual(prevState);
  });
});