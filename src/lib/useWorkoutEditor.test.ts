import { reducer, WorkoutEditorAction } from './useWorkoutEditor'; // Import the actual reducer
import { EditableUser, EditableWeek, EditableWorkout, EditableExercise, EditableSet } from '@/types/editableData'; // Assuming types are defined

// Mock crypto.randomUUID to ensure deterministic IDs for testing
const mockUuids = [
  'mock-uuid-1', 'mock-uuid-2', 'mock-uuid-3', 'mock-uuid-4', 'mock-uuid-5',
  'mock-uuid-6', 'mock-uuid-7', 'mock-uuid-8', 'mock-uuid-9', 'mock-uuid-10',
  'mock-uuid-11', 'mock-uuid-12', 'mock-uuid-13', 'mock-uuid-14', 'mock-uuid-15',
  'mock-uuid-16', 'mock-uuid-17', 'mock-uuid-18', 'mock-uuid-19', 'mock-uuid-20',
];
let uuidCounter = 0;
// Spy on the global crypto.randomUUID and provide a mock implementation
beforeAll(() => {
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
    const id = mockUuids[uuidCounter % mockUuids.length];
    uuidCounter++;
    return id;
  });
});

// --- Mock Data for Testing ---
const mockInitialUserData: EditableUser = {
  id: 1,
  name: 'Test User',
  weeks: [
    {
      id: 'week1',
      order: 1,
      workouts: [
        {
          id: 'workout1',
          name: 'Upper Body',
          order: 1,
          notes: '',
          exercises: [
            {
              id: 'exercise1',
              order: 1,
              repRange: '8-12',
              restTime: '60s',
              exercise: { id: 'exDb1', name: 'Bench Press', category: 'Chest' },
              sets: [
                { id: 'set1', order: 1, weight: '80', reps: 8 },
                { id: 'set2', order: 2, weight: '85', reps: 6 },
              ],
            },
            {
              id: 'exercise2',
              order: 2,
              repRange: '10-15',
              restTime: '45s',
              exercise: { id: 'exDb2', name: 'Bicep Curl', category: 'Arms' },
              sets: [
                { id: 'set3', order: 1, weight: '20', reps: 12 },
              ],
            },
          ],
        },
        {
          id: 'workout2',
          name: 'Lower Body',
          order: 2,
          notes: '',
          exercises: [
            {
              id: 'exercise3',
              order: 1,
              repRange: '5-8',
              restTime: '90s',
              exercise: { id: 'exDb3', name: 'Squat', category: 'Legs' },
              sets: [
                { id: 'set4', order: 1, weight: '100', reps: 5 },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'week2',
      order: 2,
      workouts: [], // Empty workout for week 2
    },
  ],
};

const emptyInitialState: EditableUser = {
  id: 0,
  name: 'New User',
  weeks: [],
};

describe('reducer (Unit Tests)', () => {
  beforeEach(() => {
    uuidCounter = 0; // Reset UUID counter for each test
  });

  afterAll(() => {
    vi.restoreAllMocks(); // Clean up the spy after all tests
  });

  it('should return the current state for an unknown action', () => {
    const currentState = { ...mockInitialUserData };
    expect(reducer(currentState, { type: 'UNKNOWN_ACTION' as any })).toEqual(currentState);
  });

  // --- ADD_WEEK ---
  it('should add a new week to an empty state', () => {
    const newState = reducer(emptyInitialState, { type: 'ADD_WEEK' });
    expect(newState.weeks).toHaveLength(1);
    expect(newState.weeks[0].id).toBe('tmp-mock-uuid-1');
    expect(newState.weeks[0].order).toBe(1);
    expect(newState.weeks[0].workouts).toEqual([]);
  });

  it('should add a new week to an existing state', () => {
    const newState = reducer(mockInitialUserData, { type: 'ADD_WEEK' });
    expect(newState.weeks).toHaveLength(mockInitialUserData.weeks.length + 1);
    expect(newState.weeks[2].id).toBe('tmp-mock-uuid-1');
    expect(newState.weeks[2].order).toBe(3);
    expect(newState.weeks[2].workouts).toEqual([]);
  });

  // --- REMOVE_WEEK ---
  it('should remove an existing week', () => {
    const newState = reducer(mockInitialUserData, { type: 'REMOVE_WEEK', weekId: 'week1' });
    expect(newState.weeks).toHaveLength(1);
    expect(newState.weeks.find(w => w.id === 'week1')).toBeUndefined();
    expect(newState.weeks[0].id).toBe('week2'); // Ensure other weeks remain
  });

  it('should not remove any week if weekId does not exist', () => {
    const newState = reducer(mockInitialUserData, { type: 'REMOVE_WEEK', weekId: 'nonExistentWeek' });
    expect(newState.weeks).toHaveLength(mockInitialUserData.weeks.length);
    expect(newState).toEqual(mockInitialUserData); // State should be unchanged
  });

  // --- DUPLICATE_WEEK ---
  it('should duplicate an existing week, resetting set weights and reps to 0, and assign new IDs', () => {
    // Ensure the mock UUID is reset for this test to get predictable IDs
    uuidCounter = 0;
    const newState = reducer(mockInitialUserData, { type: 'DUPLICATE_WEEK', weekId: 'week1' });
    expect(newState.weeks).toHaveLength(mockInitialUserData.weeks.length + 1);

    const duplicatedWeek = newState.weeks.find(w => w.id === 'tmp-mock-uuid-1');
    expect(duplicatedWeek).toBeDefined();
    expect(duplicatedWeek?.order).toBe(mockInitialUserData.weeks.length + 1);

    // Verify new IDs for duplicated week and its contents
    expect(duplicatedWeek?.id).toBe('tmp-mock-uuid-1');
    expect(duplicatedWeek?.workouts[0].id).toBe('tmp-mock-uuid-2'); // New ID for workout
    expect(duplicatedWeek?.workouts[0].exercises[0].id).toBe('tmp-mock-uuid-3'); // New ID for exercise
    expect(duplicatedWeek?.workouts[0].exercises[0].sets[0].id).toBe('tmp-mock-uuid-4'); // New ID for set
    expect(duplicatedWeek?.workouts[0].exercises[0].sets[1].id).toBe('tmp-mock-uuid-5'); // New ID for set
    expect(duplicatedWeek?.workouts[0].exercises[1].id).toBe('tmp-mock-uuid-6'); // New ID for exercise
    expect(duplicatedWeek?.workouts[0].exercises[1].sets[0].id).toBe('tmp-mock-uuid-7'); // New ID for set

    // Verify set weights and reps are reset to 0
    expect(duplicatedWeek?.workouts[0].exercises[0].sets[0].weight).toBe(0);
    expect(duplicatedWeek?.workouts[0].exercises[0].sets[0].reps).toBe(0);
    expect(duplicatedWeek?.workouts[0].exercises[0].sets[1].weight).toBe(0);
    expect(duplicatedWeek?.workouts[0].exercises[0].sets[1].reps).toBe(0);
    expect(duplicatedWeek?.workouts[0].exercises[1].sets[0].weight).toBe(0);
    expect(duplicatedWeek?.workouts[0].exercises[1].sets[0].reps).toBe(0);

    // Verify other properties are copied correctly (e.g., names, repRange, restTime)
    expect(duplicatedWeek?.workouts[0].name).toBe('Upper Body');
    expect(duplicatedWeek?.workouts[0].exercises[0].exercise.name).toBe('Bench Press');
    expect(duplicatedWeek?.workouts[0].exercises[0].repRange).toBe('8-12');
  });

  it('should not duplicate if weekId does not exist', () => {
    const newState = reducer(mockInitialUserData, { type: 'DUPLICATE_WEEK', weekId: 'nonExistentWeek' });
    expect(newState.weeks).toHaveLength(mockInitialUserData.weeks.length);
    expect(newState).toEqual(mockInitialUserData);
  });

  // --- ADD_WORKOUT ---
  it('should add a new workout to an existing week', () => {
    const newState = reducer(mockInitialUserData, { type: 'ADD_WORKOUT', weekId: 'week2' });
    const targetWeek = newState.weeks.find(w => w.id === 'week2');
    expect(targetWeek?.workouts).toHaveLength(1);
    expect(targetWeek?.workouts[0].id).toBe('tmp-mock-uuid-1');
    expect(targetWeek?.workouts[0].name).toBe('New Workout');
    expect(targetWeek?.workouts[0].order).toBe(1);
    expect(targetWeek?.workouts[0].exercises).toEqual([]);
  });

  it('should not add workout if weekId does not exist', () => {
    const newState = reducer(mockInitialUserData, { type: 'ADD_WORKOUT', weekId: 'nonExistentWeek' });
    expect(newState).toEqual(mockInitialUserData);
  });

  // --- REMOVE_WORKOUT ---
  it('should remove an existing workout from a week', () => {
    const newState = reducer(mockInitialUserData, { type: 'REMOVE_WORKOUT', weekId: 'week1', workoutId: 'workout1' });
    const targetWeek = newState.weeks.find(w => w.id === 'week1');
    expect(targetWeek?.workouts).toHaveLength(1);
    expect(targetWeek?.workouts.find(w => w.id === 'workout1')).toBeUndefined();
    expect(targetWeek?.workouts[0].id).toBe('workout2');
  });

  it('should not remove workout if weekId or workoutId does not exist', () => {
    let newState = reducer(mockInitialUserData, { type: 'REMOVE_WORKOUT', weekId: 'nonExistentWeek', workoutId: 'workout1' });
    expect(newState).toEqual(mockInitialUserData);
    newState = reducer(mockInitialUserData, { type: 'REMOVE_WORKOUT', weekId: 'week1', workoutId: 'nonExistentWorkout' });
    expect(newState).toEqual(mockInitialUserData);
  });

  // --- MOVE_WORKOUT ---
  it('should move a workout up within a week', () => {
    const stateWithMultipleWorkouts: EditableUser = {
      ...mockInitialUserData,
      weeks: mockInitialUserData.weeks.map(week =>
        week.id === 'week1' ? {
          ...week,
          workouts: [
            { ...week.workouts[0], order: 1 }, // workout1 (Upper Body)
            { ...week.workouts[1], order: 2 }, // workout2 (Lower Body)
          ]
        } : week
      )
    };

    const newState = reducer(stateWithMultipleWorkouts, { type: 'MOVE_WORKOUT', weekId: 'week1', index: 1, dir: 'up' }); // Move workout2 up
    const targetWeek = newState.weeks.find(w => w.id === 'week1');
    expect(targetWeek?.workouts[0].id).toBe('workout2');
    expect(targetWeek?.workouts[0].order).toBe(1);
    expect(targetWeek?.workouts[1].id).toBe('workout1');
    expect(targetWeek?.workouts[1].order).toBe(2);
  });

  it('should move a workout down within a week', () => {
    const stateWithMultipleWorkouts: EditableUser = {
      ...mockInitialUserData,
      weeks: mockInitialUserData.weeks.map(week =>
        week.id === 'week1' ? {
          ...week,
          workouts: [
            { ...week.workouts[0], order: 1 }, // workout1 (Upper Body)
            { ...week.workouts[1], order: 2 }, // workout2 (Lower Body)
          ]
        } : week
      )
    };
    const newState = reducer(stateWithMultipleWorkouts, { type: 'MOVE_WORKOUT', weekId: 'week1', index: 0, dir: 'down' }); // Move workout1 down
    const targetWeek = newState.weeks.find(w => w.id === 'week1');
    expect(targetWeek?.workouts[0].id).toBe('workout2');
    expect(targetWeek?.workouts[0].order).toBe(1);
    expect(targetWeek?.workouts[1].id).toBe('workout1');
    expect(targetWeek?.workouts[1].order).toBe(2);
  });

  it('should not move workout if index is out of bounds', () => {
    const newState = reducer(mockInitialUserData, { type: 'MOVE_WORKOUT', weekId: 'week1', index: 0, dir: 'up' });
    expect(newState).toEqual(mockInitialUserData); // No change for moving first item up
    const newState2 = reducer(mockInitialUserData, { type: 'MOVE_WORKOUT', weekId: 'week1', index: 1, dir: 'down' });
    expect(newState2).toEqual(mockInitialUserData); // No change for moving last item down
  });

  // --- ADD_EXERCISE ---
  it('should add a new exercise to an existing workout', () => {
    const newState = reducer(mockInitialUserData, { type: 'ADD_EXERCISE', weekId: 'week1', workoutId: 'workout1' });
    const targetWorkout = newState.weeks.find(w => w.id === 'week1')?.workouts.find(wo => wo.id === 'workout1');
    expect(targetWorkout?.exercises).toHaveLength(3);
    expect(targetWorkout?.exercises[2].id).toBe('tmp-mock-uuid-1');
    expect(targetWorkout?.exercises[2].order).toBe(3);
    expect(targetWorkout?.exercises[2].exercise.name).toBe('N/A');
    expect(targetWorkout?.exercises[2].sets).toEqual([]);
  });

  it('should not add exercise if weekId or workoutId does not exist', () => {
    let newState = reducer(mockInitialUserData, { type: 'ADD_EXERCISE', weekId: 'nonExistentWeek', workoutId: 'workout1' });
    expect(newState).toEqual(mockInitialUserData);
    newState = reducer(mockInitialUserData, { type: 'ADD_EXERCISE', weekId: 'week1', workoutId: 'nonExistentWorkout' });
    expect(newState).toEqual(mockInitialUserData);
  });

  // --- REMOVE_EXERCISE ---
  it('should remove an existing exercise from a workout', () => {
    const newState = reducer(mockInitialUserData, { type: 'REMOVE_EXERCISE', weekId: 'week1', workoutId: 'workout1', exerciseId: 'exercise1' });
    const targetWorkout = newState.weeks.find(w => w.id === 'week1')?.workouts.find(wo => wo.id === 'workout1');
    expect(targetWorkout?.exercises).toHaveLength(1);
    expect(targetWorkout?.exercises.find(ex => ex.id === 'exercise1')).toBeUndefined();
    expect(targetWorkout?.exercises[0].id).toBe('exercise2');
  });

  it('should not remove exercise if IDs do not exist', () => {
    let newState = reducer(mockInitialUserData, { type: 'REMOVE_EXERCISE', weekId: 'week1', workoutId: 'workout1', exerciseId: 'nonExistentEx' });
    expect(newState).toEqual(mockInitialUserData);
  });

  // --- MOVE_EXERCISE ---
  it('should move an exercise up within a workout', () => {
    const stateWithExercises: EditableUser = {
      ...mockInitialUserData,
      weeks: mockInitialUserData.weeks.map(week =>
        week.id === 'week1' ? {
          ...week,
          workouts: week.workouts.map(workout =>
            workout.id === 'workout1' ? {
              ...workout,
              exercises: [
                { ...workout.exercises[0], order: 1 }, // exercise1 (Bench Press)
                { ...workout.exercises[1], order: 2 }, // exercise2 (Bicep Curl)
              ]
            } : workout
          )
        } : week
      )
    };
    const newState = reducer(stateWithExercises, { type: 'MOVE_EXERCISE', weekId: 'week1', workoutId: 'workout1', index: 1, dir: 'up' }); // Move exercise2 up
    const targetWorkout = newState.weeks.find(w => w.id === 'week1')?.workouts.find(wo => wo.id === 'workout1');
    expect(targetWorkout?.exercises[0].id).toBe('exercise2');
    expect(targetWorkout?.exercises[0].order).toBe(1);
    expect(targetWorkout?.exercises[1].id).toBe('exercise1');
    expect(targetWorkout?.exercises[1].order).toBe(2);
  });

  it('should move an exercise down within a workout', () => {
    const stateWithExercises: EditableUser = {
      ...mockInitialUserData,
      weeks: mockInitialUserData.weeks.map(week =>
        week.id === 'week1' ? {
          ...week,
          workouts: week.workouts.map(workout =>
            workout.id === 'workout1' ? {
              ...workout,
              exercises: [
                { ...workout.exercises[0], order: 1 }, // exercise1 (Bench Press)
                { ...workout.exercises[1], order: 2 }, // exercise2 (Bicep Curl)
              ]
            } : workout
          )
        } : week
      )
    };
    const newState = reducer(stateWithExercises, { type: 'MOVE_EXERCISE', weekId: 'week1', workoutId: 'workout1', index: 0, dir: 'down' }); // Move exercise1 down
    const targetWorkout = newState.weeks.find(w => w.id === 'week1')?.workouts.find(wo => wo.id === 'workout1');
    expect(targetWorkout?.exercises[0].id).toBe('exercise2');
    expect(targetWorkout?.exercises[0].order).toBe(1);
    expect(targetWorkout?.exercises[1].id).toBe('exercise1');
    expect(targetWorkout?.exercises[1].order).toBe(2);
  });

  it('should not move exercise if index is out of bounds', () => {
    const newState = reducer(mockInitialUserData, { type: 'MOVE_EXERCISE', weekId: 'week1', workoutId: 'workout1', index: 0, dir: 'up' });
    expect(newState).toEqual(mockInitialUserData); // No change for moving first item up
    const newState2 = reducer(mockInitialUserData, { type: 'MOVE_EXERCISE', weekId: 'week1', workoutId: 'workout1', index: 1, dir: 'down' });
    expect(newState2).toEqual(mockInitialUserData); // No change for moving last item down
  });

  // --- ADD_SET ---
  it('should add a new set to an existing exercise', () => {
    const newState = reducer(mockInitialUserData, { type: 'ADD_SET', weekId: 'week1', workoutId: 'workout1', exerciseId: 'exercise1' });
    const targetExercise = newState.weeks.find(w => w.id === 'week1')?.workouts.find(wo => wo.id === 'workout1')?.exercises.find(ex => ex.id === 'exercise1');
    expect(targetExercise?.sets).toHaveLength(3);
    expect(targetExercise?.sets[2].id).toBe('tmp-mock-uuid-1');
    expect(targetExercise?.sets[2].order).toBe(3);
    expect(targetExercise?.sets[2].reps).toBeNull();
    expect(targetExercise?.sets[2].weight).toBeNull();
  });

  it('should not add set if IDs do not exist', () => {
    let newState = reducer(mockInitialUserData, { type: 'ADD_SET', weekId: 'nonExistentWeek', workoutId: 'workout1', exerciseId: 'exercise1' });
    expect(newState).toEqual(mockInitialUserData);
  });

  // --- REMOVE_SET ---
  it('should remove the last set from an existing exercise', () => {
    const newState = reducer(mockInitialUserData, { type: 'REMOVE_SET', weekId: 'week1', workoutId: 'workout1', exerciseId: 'exercise1' });
    const targetExercise = newState.weeks.find(w => w.id === 'week1')?.workouts.find(wo => wo.id === 'workout1')?.exercises.find(ex => ex.id === 'exercise1');
    expect(targetExercise?.sets).toHaveLength(1);
    expect(targetExercise?.sets[0].id).toBe('set1');
  });

  it('should do nothing if removing set from exercise with no sets', () => {
    const stateWithEmptySets: EditableUser = {
      ...mockInitialUserData,
      weeks: mockInitialUserData.weeks.map(week =>
        week.id === 'week2' ? {
          ...week,
          workouts: [{
            id: 'workoutEmpty', name: 'Empty Workout', order: 1, notes: '', exercises: [{
              id: 'exerciseEmpty', order: 1, repRange: '', restTime: '', exercise: { name: 'Empty Ex' }, sets: []
            }]
          }]
        } : week
      )
    };
    const newState = reducer(stateWithEmptySets, { type: 'REMOVE_SET', weekId: 'week2', workoutId: 'workoutEmpty', exerciseId: 'exerciseEmpty' });
    expect(newState).toEqual(stateWithEmptySets); // State should be unchanged
  });

  it('should not remove set if IDs do not exist', () => {
    let newState = reducer(mockInitialUserData, { type: 'REMOVE_SET', weekId: 'nonExistentWeek', workoutId: 'workout1', exerciseId: 'exercise1' });
    expect(newState).toEqual(mockInitialUserData);
  });


  // --- UPDATE_WORKOUT_NAME ---
  it('should update the name of an existing workout', () => {
    const newState = reducer(mockInitialUserData, { type: 'UPDATE_WORKOUT_NAME', weekId: 'week1', workoutId: 'workout1', name: 'New Upper Body Name' });
    const targetWorkout = newState.weeks.find(w => w.id === 'week1')?.workouts.find(wo => wo.id === 'workout1');
    expect(targetWorkout?.name).toBe('New Upper Body Name');
  });

  it('should not update workout name if IDs do not exist', () => {
    let newState = reducer(mockInitialUserData, { type: 'UPDATE_WORKOUT_NAME', weekId: 'nonExistentWeek', workoutId: 'workout1', name: 'New Name' });
    expect(newState).toEqual(mockInitialUserData);
  });

  // --- UPDATE_SET_WEIGHT ---
  it('should update the weight of an existing set', () => {
    const newState = reducer(mockInitialUserData, { type: 'UPDATE_SET_WEIGHT', workoutExerciseId: 'exercise1', setId: 'set1', weight: 95 });
    const targetSet = newState.weeks.find(w => w.id === 'week1')?.workouts.find(wo => wo.id === 'workout1')?.exercises.find(ex => ex.id === 'exercise1')?.sets.find(s => s.id === 'set1');
    expect(targetSet?.weight).toBe(95);
  });

  it('should handle UPDATE_SET_WEIGHT with null weight', () => {
    const newState = reducer(mockInitialUserData, { type: 'UPDATE_SET_WEIGHT', workoutExerciseId: 'exercise1', setId: 'set1', weight: null });
    const targetSet = newState.weeks.find(w => w.id === 'week1')?.workouts.find(wo => wo.id === 'workout1')?.exercises.find(ex => ex.id === 'exercise1')?.sets.find(s => s.id === 'set1');
    expect(targetSet?.weight).toBeNull();
  });

  it('should not update set weight if IDs do not exist', () => {
    let newState = reducer(mockInitialUserData, { type: 'UPDATE_SET_WEIGHT', workoutExerciseId: 'nonExistentEx', setId: 'set1', weight: 100 });
    expect(newState).toEqual(mockInitialUserData);
  });

  // --- UPDATE_SET_REPS ---
  it('should update the reps of an existing set', () => {
    const newState = reducer(mockInitialUserData, { type: 'UPDATE_SET_REPS', workoutExerciseId: 'exercise1', setId: 'set2', reps: 7 });
    const targetSet = newState.weeks.find(w => w.id === 'week1')?.workouts.find(wo => wo.id === 'workout1')?.exercises.find(ex => ex.id === 'exercise1')?.sets.find(s => s.id === 'set2');
    expect(targetSet?.reps).toBe(7);
  });

  it('should handle UPDATE_SET_REPS with null reps', () => {
    const newState = reducer(mockInitialUserData, { type: 'UPDATE_SET_REPS', workoutExerciseId: 'exercise1', setId: 'set2', reps: null });
    const targetSet = newState.weeks.find(w => w.id === 'week1')?.workouts.find(wo => wo.id === 'workout1')?.exercises.find(ex => ex.id === 'exercise1')?.sets.find(s => s.id === 'set2');
    expect(targetSet?.reps).toBeNull();
  });

  // --- UPDATE_REP_RANGE ---
  it('should update the rep range of an existing exercise', () => {
    const newState = reducer(mockInitialUserData, { type: 'UPDATE_REP_RANGE', workoutExerciseId: 'exercise1', repRange: '6-10' });
    const targetExercise = newState.weeks.find(w => w.id === 'week1')?.workouts.find(wo => wo.id === 'workout1')?.exercises.find(ex => ex.id === 'exercise1');
    expect(targetExercise?.repRange).toBe('6-10');
  });

  it('should not update rep range if exerciseId does not exist', () => {
    const newState = reducer(mockInitialUserData, { type: 'UPDATE_REP_RANGE', workoutExerciseId: 'nonExistentEx', repRange: '6-10' });
    expect(newState).toEqual(mockInitialUserData);
  });

  // --- UPDATE_REST_TIME ---
  it('should update the rest time of an existing exercise', () => {
    const newState = reducer(mockInitialUserData, { type: 'UPDATE_REST_TIME', workoutExerciseId: 'exercise1', restTime: '90s' });
    const targetExercise = newState.weeks.find(w => w.id === 'week1')?.workouts.find(wo => wo.id === 'workout1')?.exercises.find(ex => ex.id === 'exercise1');
    expect(targetExercise?.restTime).toBe('90s');
  });

  it('should not update rest time if exerciseId does not exist', () => {
    const newState = reducer(mockInitialUserData, { type: 'UPDATE_REST_TIME', workoutExerciseId: 'nonExistentEx', restTime: '90s' });
    expect(newState).toEqual(mockInitialUserData);
  });

  // --- UPDATE_CATEGORY ---
  it('should update the category of an existing exercise and reset name', () => {
    const newState = reducer(mockInitialUserData, { type: 'UPDATE_CATEGORY', weekId: 'week1', workoutId: 'workout1', workoutExerciseId: 'exercise1', category: 'Back' });
    const targetExercise = newState.weeks.find(w => w.id === 'week1')?.workouts.find(wo => wo.id === 'workout1')?.exercises.find(ex => ex.id === 'exercise1');
    expect(targetExercise?.exercise.category).toBe('Back');
    expect(targetExercise?.exercise.name).toBe(''); // Name should be reset as per reducer logic
  });

  it('should not update category if IDs do not exist', () => {
    let newState = reducer(mockInitialUserData, { type: 'UPDATE_CATEGORY', weekId: 'nonExistentWeek', workoutId: 'workout1', workoutExerciseId: 'exercise1', category: 'Back' });
    expect(newState).toEqual(mockInitialUserData);
  });

  // --- UPDATE_EXERCISE ---
  it('should update exercise details with an existing exercise from the provided list', () => {
    const mockExercises: Exercise[] = [
      { id: 'exDb1', name: 'Bench Press', category: 'Chest' },
      { id: 'exDbNew', name: 'New Exercise Name', category: 'Full Body' },
    ];
    const action: WorkoutEditorAction = {
      type: 'UPDATE_EXERCISE',
      weekId: 'week1',
      workoutId: 'workout1',
      workoutExerciseId: 'exercise1',
      exerciseId: 'exDbNew', // ID of the new exercise to apply
      exercises: mockExercises,
      category: 'Ignored', // Category from action is ignored if exerciseId matches
    };
    const newState = reducer(mockInitialUserData, action);
    const targetExercise = newState.weeks.find(w => w.id === 'week1')?.workouts.find(wo => wo.id === 'workout1')?.exercises.find(ex => ex.id === 'exercise1');

    expect(targetExercise?.exercise.id).toBe('exDbNew');
    expect(targetExercise?.exercise.name).toBe('New Exercise Name');
    expect(targetExercise?.exercise.category).toBe('Full Body');
  });

  it('should create a new exercise object if exerciseId not found in provided list', () => {
    const mockExercises: Exercise[] = [
      { id: 'exDb1', name: 'Bench Press', category: 'Chest' },
    ];
    const action: WorkoutEditorAction = {
      type: 'UPDATE_EXERCISE',
      weekId: 'week1',
      workoutId: 'workout1',
      workoutExerciseId: 'exercise1',
      exerciseId: 'nonExistentDbId', // ID not in mockExercises
      exercises: mockExercises,
      category: 'New Category',
    };
    const newState = reducer(mockInitialUserData, action);
    const targetExercise = newState.weeks.find(w => w.id === 'week1')?.workouts.find(wo => wo.id === 'workout1')?.exercises.find(ex => ex.id === 'exercise1');

    expect(targetExercise?.exercise.id).toBeUndefined(); // ID is not set if not found in provided exercises
    expect(targetExercise?.exercise.name).toBe('nonExistentDbId'); // Name defaults to exerciseId
    expect(targetExercise?.exercise.category).toBe('New Category'); // Category comes from action
  });

  it('should not update exercise if IDs do not exist', () => {
    const mockExercises: EditableExercise[] = [{ id: 'exDb1', name: 'Bench Press', category: 'Chest' }];
    let newState = reducer(mockInitialUserData, {
      type: 'UPDATE_EXERCISE',
      weekId: 'nonExistentWeek',
      workoutId: 'workout1',
      workoutExerciseId: 'exercise1',
      exerciseId: 'exDb1',
      exercises: mockExercises,
      category: 'Chest'
    });
    expect(newState).toEqual(mockInitialUserData);
  });
});