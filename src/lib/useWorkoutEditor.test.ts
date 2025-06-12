import {Dir, reducer, WorkoutEditorAction} from './useWorkoutEditor';
import {Exercise} from '@prisma/client';
import {UserPrisma} from '@/types/dataTypes';

// Deterministic UUID generator for testing
let nextId = 1;
const mockUuid = () => nextId++;

// Helper to reset ID counter between tests
beforeEach(() => {
  nextId = 1;
});

// Minimal mock Exercise
const mockExercise: Exercise = {
  id: 1,
  name: 'Bench Press',
  category: 'Chest',
  description: null,
};

function getInitialState(): UserPrisma {
  return {
    id: 1,
    name: 'Test User',
    weeks: [],
  } as any;
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
    state.weeks.push({id: 42, order: 1, workouts: []} as any);
    const action: WorkoutEditorAction = {type: 'REMOVE_WEEK', weekId: 42};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks.length).toBe(0);
  });

  it('DUPLICATE_WEEK duplicates a week with new IDs', () => {
    const state = getInitialState();
    state.weeks.push({
      id: 1001,
      order: 1,
      workouts: [
        {
          id: 1002,
          name: 'Workout',
          order: 1,
          notes: '',
          exercises: [
            {
              id: 1003,
              exerciseId: 1,
              repRange: '8-10',
              restTime: '60',
              order: 1,
              exercise: mockExercise,
              sets: [
                {id: 1004, workoutExerciseId: 1003, order: 1, reps: 8, weight: '100'},
              ],
            },
          ],
        },
      ],
    } as any);
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
    state.weeks.push({id: 1, order: 1, workouts: []} as any);
    const action: WorkoutEditorAction = {type: 'ADD_WORKOUT', weekId: 1};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts.length).toBe(1);
    expect(newState.weeks[0].workouts[0].name).toBe('New Workout');
  });

  it('REMOVE_WORKOUT removes the specified workout', () => {
    const state = getInitialState();
    state.weeks.push({
      id: 1,
      order: 1,
      workouts: [{id: 2, name: 'W', order: 1, notes: '', exercises: []}],
    } as any);
    const action: WorkoutEditorAction = {type: 'REMOVE_WORKOUT', weekId: 1, workoutId: 2};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts.length).toBe(0);
  });

  it('MOVE_WORKOUT swaps workouts up and down', () => {
    const state = getInitialState();
    state.weeks.push({
      id: 1,
      order: 1,
      workouts: [
        {id: 1, name: 'A', order: 1, notes: '', exercises: []},
        {id: 2, name: 'B', order: 2, notes: '', exercises: []},
      ],
    } as any);
    let newState = reducer(state, {type: 'MOVE_WORKOUT', weekId: 1, dir: Dir.DOWN, index: 0}, mockUuid);
    expect(newState.weeks[0].workouts[0].id).toBe(2);
    expect(newState.weeks[0].workouts[1].id).toBe(1);
    newState = reducer(newState, {type: 'MOVE_WORKOUT', weekId: 1, dir: Dir.UP, index: 1}, mockUuid);
    expect(newState.weeks[0].workouts[0].id).toBe(1);
    expect(newState.weeks[0].workouts[1].id).toBe(2);
  });

  it('ADD_EXERCISE adds an exercise to a workout', () => {
    const state = getInitialState();
    state.weeks.push({
      id: 1,
      order: 1,
      workouts: [{id: 2, name: 'W', order: 1, notes: '', exercises: []}],
    } as any);
    const action: WorkoutEditorAction = {type: 'ADD_EXERCISE', weekId: 1, workoutId: 2};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises.length).toBe(1);
    expect(newState.weeks[0].workouts[0].exercises[0].exercise.name).toBe('N/A');
  });

  it('REMOVE_EXERCISE removes the specified exercise', () => {
    const state = getInitialState();
    state.weeks.push({
      id: 1,
      order: 1,
      workouts: [{
        id: 2,
        name: 'W',
        order: 1,
        notes: '',
        exercises: [{id: 3, exerciseId: 1, repRange: '', restTime: '', order: 1, exercise: mockExercise, sets: []}],
      }],
    } as any);
    const action: WorkoutEditorAction = {type: 'REMOVE_EXERCISE', weekId: 1, workoutId: 2, exerciseId: 3};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises.length).toBe(0);
  });

  it('MOVE_EXERCISE swaps exercises up and down', () => {
    const state = getInitialState();
    state.weeks.push({
      id: 1,
      order: 1,
      workouts: [{
        id: 2,
        name: 'W',
        order: 1,
        notes: '',
        exercises: [
          {id: 1, exerciseId: 1, repRange: '', restTime: '', order: 1, exercise: mockExercise, sets: []},
          {id: 2, exerciseId: 2, repRange: '', restTime: '', order: 2, exercise: mockExercise, sets: []},
        ],
      }],
    } as any);
    let newState = reducer(state, {type: 'MOVE_EXERCISE', weekId: 1, workoutId: 2, dir: Dir.DOWN, index: 0}, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].id).toBe(2);
    expect(newState.weeks[0].workouts[0].exercises[1].id).toBe(1);
    newState = reducer(newState, {type: 'MOVE_EXERCISE', weekId: 1, workoutId: 2, dir: Dir.UP, index: 1}, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].id).toBe(1);
    expect(newState.weeks[0].workouts[0].exercises[1].id).toBe(2);
  });

  it('ADD_SET adds a set to an exercise', () => {
    const state = getInitialState();
    state.weeks.push({
      id: 1,
      order: 1,
      workouts: [{
        id: 2,
        name: 'W',
        order: 1,
        notes: '',
        exercises: [{id: 3, exerciseId: 1, repRange: '', restTime: '', order: 1, exercise: mockExercise, sets: []}],
      }],
    } as any);
    const action: WorkoutEditorAction = {type: 'ADD_SET', weekId: 1, workoutId: 2, exerciseId: 3};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].sets.length).toBe(1);
    expect(newState.weeks[0].workouts[0].exercises[0].sets[0].id).toBe(1);
  });

  it('REMOVE_SET removes the last set from an exercise', () => {
    const state = getInitialState();
    state.weeks.push({
      id: 1,
      order: 1,
      workouts: [{
        id: 2,
        name: 'W',
        order: 1,
        notes: '',
        exercises: [{
          id: 3,
          exerciseId: 1,
          repRange: '',
          restTime: '',
          order: 1,
          exercise: mockExercise,
          sets: [
            {id: 10, workoutExerciseId: 3, order: 1, reps: 8, weight: '100'},
            {id: 11, workoutExerciseId: 3, order: 2, reps: 8, weight: '110'},
          ],
        }],
      }],
    } as any);
    const action: WorkoutEditorAction = {type: 'REMOVE_SET', weekId: 1, workoutId: 2, exerciseId: 3};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].sets.length).toBe(1);
    expect(newState.weeks[0].workouts[0].exercises[0].sets[0].id).toBe(10);
  });

  it('UPDATE_WORKOUT_NAME updates the workout name', () => {
    const state = getInitialState();
    state.weeks.push({
      id: 1,
      order: 1,
      workouts: [{id: 2, name: 'Old', order: 1, notes: '', exercises: []}],
    } as any);
    const action: WorkoutEditorAction = {type: 'UPDATE_WORKOUT_NAME', weekId: 1, workoutId: 2, name: 'New Name'};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].name).toBe('New Name');
  });

  it('UPDATE_SET_WEIGHT updates the set weight', () => {
    const state = getInitialState();
    state.weeks.push({
      id: 1,
      order: 1,
      workouts: [{
        id: 2,
        name: 'W',
        order: 1,
        notes: '',
        exercises: [{
          id: 3,
          exerciseId: 1,
          repRange: '',
          restTime: '',
          order: 1,
          exercise: mockExercise,
          sets: [{id: 10, workoutExerciseId: 3, order: 1, reps: 8, weight: '100'}],
        }],
      }],
    } as any);
    const action: WorkoutEditorAction = {type: 'UPDATE_SET_WEIGHT', workoutExerciseId: 3, setId: 10, weight: '200'};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].sets[0].weight).toBe('200');
  });

  it('UPDATE_SET_REPS updates the set reps', () => {
    const state = getInitialState();
    state.weeks.push({
      id: 1,
      order: 1,
      workouts: [{
        id: 2,
        name: 'W',
        order: 1,
        notes: '',
        exercises: [{
          id: 3,
          exerciseId: 1,
          repRange: '',
          restTime: '',
          order: 1,
          exercise: mockExercise,
          sets: [{id: 10, workoutExerciseId: 3, order: 1, reps: 8, weight: '100'}],
        }],
      }],
    } as any);
    const action: WorkoutEditorAction = {type: 'UPDATE_SET_REPS', workoutExerciseId: 3, setId: 10, reps: 12};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].sets[0].reps).toBe(12);
  });

  it('UPDATE_REP_RANGE updates the rep range', () => {
    const state = getInitialState();
    state.weeks.push({
      id: 1,
      order: 1,
      workouts: [{
        id: 2,
        name: 'W',
        order: 1,
        notes: '',
        exercises: [{
          id: 3,
          exerciseId: 1,
          repRange: '',
          restTime: '',
          order: 1,
          exercise: mockExercise,
          sets: [],
        }],
      }],
    } as any);
    const action: WorkoutEditorAction = {type: 'UPDATE_REP_RANGE', workoutExerciseId: 3, repRange: '10-12'};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].repRange).toBe('10-12');
  });

  it('UPDATE_REST_TIME updates the rest time', () => {
    const state = getInitialState();
    state.weeks.push({
      id: 1,
      order: 1,
      workouts: [{
        id: 2,
        name: 'W',
        order: 1,
        notes: '',
        exercises: [{
          id: 3,
          exerciseId: 1,
          repRange: '',
          restTime: '',
          order: 1,
          exercise: mockExercise,
          sets: [],
        }],
      }],
    } as any);
    const action: WorkoutEditorAction = {type: 'UPDATE_REST_TIME', workoutExerciseId: 3, restTime: '90'};
    const newState = reducer(state, action, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].restTime).toBe('90');
  });

  it('UPDATE_CATEGORY updates the exercise category and resets name', () => {
    const state = getInitialState();
    state.weeks.push({
      id: 1,
      order: 1,
      workouts: [{
        id: 2,
        name: 'W',
        order: 1,
        notes: '',
        exercises: [{
          id: 3,
          exerciseId: 1,
          repRange: '',
          restTime: '',
          order: 1,
          exercise: {...mockExercise},
          sets: [],
        }],
      }],
    } as any);
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
    state.weeks.push({
      id: 1,
      order: 1,
      workouts: [{
        id: 2,
        name: 'W',
        order: 1,
        notes: '',
        exercises: [{
          id: 3,
          exerciseId: 1,
          repRange: '',
          restTime: '',
          order: 1,
          exercise: {...mockExercise},
          sets: [],
        }],
      }],
    } as any);
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
    state.weeks.push({
      id: 1,
      order: 1,
      workouts: [
        {id: 1, name: 'A', order: 1, notes: '', exercises: []},
      ],
    } as any);
    const newState = reducer(state, {type: 'MOVE_WORKOUT', weekId: 1, dir: Dir.UP, index: 0}, mockUuid);
    expect(newState.weeks[0].workouts[0].id).toBe(1);
  });

  it('MOVE_EXERCISE does not move exercise out of bounds', () => {
    const state = getInitialState();
    state.weeks.push({
      id: 1,
      order: 1,
      workouts: [{
        id: 2,
        name: 'W',
        order: 1,
        notes: '',
        exercises: [
          {id: 1, exerciseId: 1, repRange: '', restTime: '', order: 1, exercise: mockExercise, sets: []},
        ],
      }],
    } as any);
    const newState = reducer(state, {type: 'MOVE_EXERCISE', weekId: 1, workoutId: 2, dir: Dir.UP, index: 0}, mockUuid);
    expect(newState.weeks[0].workouts[0].exercises[0].id).toBe(1);
  });

  it('REMOVE_WEEK non-existent week is a no op', () => {
    const state = getInitialState();
    const prevState = JSON.parse(JSON.stringify(state));
    const newState = reducer(state, {type: 'REMOVE_WEEK', weekId: 999}, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('REMOVE_WORKOUT non-existent workout is a no op', () => {
    const state = getInitialState();
    state.weeks.push({id: 1, order: 1, workouts: []} as any);
    const prevState = JSON.parse(JSON.stringify(state));
    const newState = reducer(state, {type: 'REMOVE_WORKOUT', weekId: 1, workoutId: 999}, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('REMOVE_EXERCISE non-existent exercise is a no op', () => {
    const state = getInitialState();
    state.weeks.push({
      id: 1,
      order: 1,
      workouts: [{id: 2, name: 'W', order: 1, notes: '', exercises: []}],
    } as any);
    const prevState = JSON.parse(JSON.stringify(state));
    const newState = reducer(state, {type: 'REMOVE_EXERCISE', weekId: 1, workoutId: 2, exerciseId: 999}, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('UPDATE_SET_WEIGHT on non-existent set is a no-op', () => {
    const state = getInitialState();
    state.weeks.push({
      id: 1,
      order: 1,
      workouts: [{
        id: 2,
        name: 'W',
        order: 1,
        notes: '',
        exercises: [{
          id: 3,
          exerciseId: 1,
          repRange: '',
          restTime: '',
          order: 1,
          exercise: mockExercise,
          sets: [{id: 10, workoutExerciseId: 3, order: 1, reps: 8, weight: '100'}],
        }],
      }],
    } as any);
    const prevState = JSON.parse(JSON.stringify(state));
    const action: WorkoutEditorAction = {type: 'UPDATE_SET_WEIGHT', workoutExerciseId: 3, setId: 999, weight: '200'};
    const newState = reducer(state, action, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('UPDATE_SET_REPS on non-existent set is a no-op', () => {
    const state = getInitialState();
    state.weeks.push({
      id: 1,
      order: 1,
      workouts: [{
        id: 2,
        name: 'W',
        order: 1,
        notes: '',
        exercises: [{
          id: 3,
          exerciseId: 1,
          repRange: '',
          restTime: '',
          order: 1,
          exercise: mockExercise,
          sets: [{id: 10, workoutExerciseId: 3, order: 1, reps: 8, weight: '100'}],
        }],
      }],
    } as any);
    const prevState = JSON.parse(JSON.stringify(state));
    const action: WorkoutEditorAction = {type: 'UPDATE_SET_REPS', workoutExerciseId: 3, setId: 999, reps: 12};
    const newState = reducer(state, action, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('UPDATE_REP_RANGE on non-existent exercise is a no-op', () => {
    const state = getInitialState();
    state.weeks.push({
      id: 1,
      order: 1,
      workouts: [{
        id: 2,
        name: 'W',
        order: 1,
        notes: '',
        exercises: [{
          id: 3,
          exerciseId: 1,
          repRange: '',
          restTime: '',
          order: 1,
          exercise: mockExercise,
          sets: [],
        }],
      }],
    } as any);
    const prevState = JSON.parse(JSON.stringify(state));
    const action: WorkoutEditorAction = {type: 'UPDATE_REP_RANGE', workoutExerciseId: 999, repRange: '10-12'};
    const newState = reducer(state, action, mockUuid);
    expect(newState).toEqual(prevState);
  });

  it('UPDATE_REST_TIME on non-existent exercise is a no-op', () => {
    const state = getInitialState();
    state.weeks.push({
      id: 1,
      order: 1,
      workouts: [{
        id: 2,
        name: 'W',
        order: 1,
        notes: '',
        exercises: [{
          id: 3,
          exerciseId: 1,
          repRange: '',
          restTime: '',
          order: 1,
          exercise: mockExercise,
          sets: [],
        }],
      }],
    } as any);
    const prevState = JSON.parse(JSON.stringify(state));
    const action: WorkoutEditorAction = {type: 'UPDATE_REST_TIME', workoutExerciseId: 999, restTime: '90'};
    const newState = reducer(state, action, mockUuid);
    expect(newState).toEqual(prevState);
  });
});