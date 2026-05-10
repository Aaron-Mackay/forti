import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFindOrCreateExercise } = vi.hoisted(() => ({
  mockFindOrCreateExercise: vi.fn(),
}));

vi.mock('@lib/exerciseQueries', () => ({
  findOrCreateExercise: mockFindOrCreateExercise,
}));

import { syncPlanTree } from './savePlanTreeDiff';
import type { z } from 'zod';
import type { PlanInputSchema } from '@/lib/planSchemas';

type PlanInput = z.infer<typeof PlanInputSchema>;
type ExerciseInput = PlanInput['weeks'][number]['workouts'][number]['exercises'][number];
type SetInput = ExerciseInput['sets'][number];
type Tx = Parameters<typeof syncPlanTree>[0];

interface ExistingPlan {
  id: number;
  clientCanEdit?: boolean;
  weeks: Array<{
    id: number;
    planId: number;
    workouts: Array<{
      id: number;
      weekId: number;
      exercises: Array<{
        id: number;
        workoutId: number;
        sets: Array<{ id: number; isDropSet: boolean }>;
      }>;
    }>;
  }>;
}

let nextId = 1;
function newId(): number {
  return 1000 + nextId++;
}

interface TxMocks {
  plan: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  week: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  workout: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  workoutExercise: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  exerciseSet: {
    update: ReturnType<typeof vi.fn>;
    createManyAndReturn: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
}

function createTx(existingPlans: ExistingPlan[]): { tx: Tx; mocks: TxMocks } {
  const mocks: TxMocks = {
    plan: {
      findMany: vi.fn().mockResolvedValue(existingPlans),
      create: vi.fn().mockImplementation(async () => ({ id: newId() })),
      update: vi.fn().mockImplementation(async ({ where }: { where: { id: number } }) => ({ id: where.id })),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    week: {
      create: vi.fn().mockImplementation(async () => ({ id: newId() })),
      update: vi.fn().mockImplementation(async ({ where }: { where: { id: number } }) => ({ id: where.id })),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    workout: {
      create: vi.fn().mockImplementation(async () => ({ id: newId() })),
      update: vi.fn().mockImplementation(async ({ where }: { where: { id: number } }) => ({ id: where.id })),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    workoutExercise: {
      create: vi.fn().mockImplementation(async () => ({ id: newId() })),
      update: vi.fn().mockImplementation(async ({ where }: { where: { id: number } }) => ({ id: where.id })),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    exerciseSet: {
      update: vi.fn().mockImplementation(async ({ where }: { where: { id: number } }) => ({ id: where.id })),
      createManyAndReturn: vi.fn().mockImplementation(async ({ data }: { data: unknown[] }) =>
        data.map(() => ({ id: newId() })),
      ),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
  return { tx: mocks as unknown as Tx, mocks };
}

function buildSet(overrides: Partial<SetInput> = {}): SetInput {
  return {
    order: 0,
    isDropSet: false,
    ...overrides,
  };
}

function buildExercise(overrides: Partial<ExerciseInput> = {}): ExerciseInput {
  return {
    id: overrides.id,
    exercise: {
      name: 'Squat',
      category: 'resistance',
      primaryMuscles: [],
      secondaryMuscles: [],
    },
    order: 0,
    repRange: '8-12',
    isBfr: false,
    requiresRecording: false,
    sets: [],
    ...overrides,
  };
}

beforeEach(() => {
  nextId = 1;
  mockFindOrCreateExercise.mockResolvedValue({ id: 100 });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('syncPlanTree', () => {
  it('creates the full tree from scratch when no plans exist', async () => {
    const { tx, mocks } = createTx([]);

    await syncPlanTree(
      tx,
      'user-1',
      [
        {
          order: 0,
          name: 'Plan A',
          weeks: [
            {
              order: 0,
              workouts: [
                {
                  name: 'Push Day',
                  order: 0,
                  exercises: [buildExercise({ sets: [buildSet()] })],
                },
              ],
            },
          ],
        },
      ],
      { actorIsAssignedCoach: false },
    );

    expect(mocks.plan.create).toHaveBeenCalledTimes(1);
    expect(mocks.week.create).toHaveBeenCalledTimes(1);
    expect(mocks.workout.create).toHaveBeenCalledTimes(1);
    expect(mocks.workoutExercise.create).toHaveBeenCalledTimes(1);
    expect(mocks.exerciseSet.createManyAndReturn).toHaveBeenCalledTimes(1);
    expect(mocks.plan.update).not.toHaveBeenCalled();
  });

  it('updates an existing plan in place when ids match (no recreation)', async () => {
    const existing: ExistingPlan = {
      id: 42,
      clientCanEdit: true,
      weeks: [
        {
          id: 7,
          planId: 42,
          workouts: [
            {
              id: 11,
              weekId: 7,
              exercises: [
                {
                  id: 21,
                  workoutId: 11,
                  sets: [{ id: 31, isDropSet: false }],
                },
              ],
            },
          ],
        },
      ],
    };
    const { tx, mocks } = createTx([existing]);

    await syncPlanTree(
      tx,
      'user-1',
      [
        {
          id: 42,
          order: 0,
          name: 'Renamed',
          weeks: [
            {
              id: 7,
              order: 0,
              workouts: [
                {
                  id: 11,
                  name: 'Push Day',
                  order: 0,
                  exercises: [
                    buildExercise({
                      id: 21,
                      sets: [buildSet({ id: 31 })],
                    }),
                  ],
                },
              ],
            },
          ],
        },
      ],
      { actorIsAssignedCoach: false },
    );

    expect(mocks.plan.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 42 },
      data: expect.objectContaining({ name: 'Renamed' }),
    }));
    expect(mocks.plan.create).not.toHaveBeenCalled();
    expect(mocks.week.create).not.toHaveBeenCalled();
    expect(mocks.workout.create).not.toHaveBeenCalled();
    expect(mocks.workoutExercise.create).not.toHaveBeenCalled();
    expect(mocks.exerciseSet.createManyAndReturn).not.toHaveBeenCalled();

    expect(mocks.exerciseSet.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 31 },
    }));
  });

  it('skips locked plans for client saves but keeps their existing tree', async () => {
    const existing: ExistingPlan = {
      id: 42,
      clientCanEdit: false,
      weeks: [
        {
          id: 7,
          planId: 42,
          workouts: [
            {
              id: 11,
              weekId: 7,
              exercises: [
                {
                  id: 21,
                  workoutId: 11,
                  sets: [{ id: 31, isDropSet: false }],
                },
              ],
            },
          ],
        },
      ],
    };
    const { tx, mocks } = createTx([existing]);

    await syncPlanTree(
      tx,
      'user-1',
      [
        {
          id: 42,
          order: 0,
          name: 'Changed',
          weeks: [],
        },
      ],
      { actorIsAssignedCoach: false },
    );

    expect(mocks.plan.update).not.toHaveBeenCalled();
    expect(mocks.plan.create).not.toHaveBeenCalled();
    expect(mocks.week.create).not.toHaveBeenCalled();
    expect(mocks.week.update).not.toHaveBeenCalled();
    expect(mocks.workout.create).not.toHaveBeenCalled();
    expect(mocks.workout.update).not.toHaveBeenCalled();
    expect(mocks.workoutExercise.create).not.toHaveBeenCalled();
    expect(mocks.workoutExercise.update).not.toHaveBeenCalled();
  });

  it('inserts only the new set when one is added to an existing exercise', async () => {
    const existing: ExistingPlan = {
      id: 42,
      weeks: [
        {
          id: 7,
          planId: 42,
          workouts: [
            {
              id: 11,
              weekId: 7,
              exercises: [
                {
                  id: 21,
                  workoutId: 11,
                  sets: [{ id: 31, isDropSet: false }],
                },
              ],
            },
          ],
        },
      ],
    };
    const { tx, mocks } = createTx([existing]);

    await syncPlanTree(
      tx,
      'user-1',
      [
        {
          id: 42,
          order: 0,
          name: 'Plan A',
          weeks: [
            {
              id: 7,
              order: 0,
              workouts: [
                {
                  id: 11,
                  name: 'Push Day',
                  order: 0,
                  exercises: [
                    buildExercise({
                      id: 21,
                      sets: [
                        buildSet({ id: 31 }),
                        buildSet({ order: 1 }), // new set, no id
                      ],
                    }),
                  ],
                },
              ],
            },
          ],
        },
      ],
      { actorIsAssignedCoach: false },
    );

    expect(mocks.exerciseSet.update).toHaveBeenCalledTimes(1);
    expect(mocks.exerciseSet.createManyAndReturn).toHaveBeenCalledTimes(1);
    const createManyCall = mocks.exerciseSet.createManyAndReturn.mock.calls[0][0];
    expect(createManyCall.data).toHaveLength(1);
    expect(createManyCall.data[0]).toMatchObject({ order: 1 });
  });

  it('deletes only entities not present in the incoming tree', async () => {
    const existing: ExistingPlan = {
      id: 42,
      weeks: [
        {
          id: 7,
          planId: 42,
          workouts: [
            { id: 11, weekId: 7, exercises: [] }, // kept
            { id: 12, weekId: 7, exercises: [] }, // dropped
          ],
        },
      ],
    };
    const { tx, mocks } = createTx([existing]);

    await syncPlanTree(
      tx,
      'user-1',
      [
        {
          id: 42,
          order: 0,
          name: 'Plan A',
          weeks: [
            {
              id: 7,
              order: 0,
              workouts: [
                { id: 11, name: 'Keep Me', order: 0, exercises: [] },
                // workout id 12 omitted
              ],
            },
          ],
        },
      ],
      { actorIsAssignedCoach: false },
    );

    const workoutDelete = mocks.workout.deleteMany.mock.calls[0][0];
    expect(workoutDelete.where.id).toEqual({ notIn: [11] });
  });

  it('clears the entire tree when incoming plans are empty', async () => {
    const existing: ExistingPlan = {
      id: 42,
      weeks: [{ id: 7, planId: 42, workouts: [] }],
    };
    const { tx, mocks } = createTx([existing]);

    await syncPlanTree(tx, 'user-1', [], { actorIsAssignedCoach: false });

    // No notIn filter when nothing is kept — delete-everything-for-this-user.
    const planDelete = mocks.plan.deleteMany.mock.calls[0][0];
    expect(planDelete.where).toEqual({ userId: 'user-1' });
    expect(planDelete.where.id).toBeUndefined();
  });

  it('remaps drop-set parentSetId to the resolved regular-set id in the same save', async () => {
    const { tx, mocks } = createTx([]);

    await syncPlanTree(
      tx,
      'user-1',
      [
        {
          order: 0,
          name: 'Plan A',
          weeks: [
            {
              order: 0,
              workouts: [
                {
                  name: 'Push',
                  order: 0,
                  exercises: [
                    buildExercise({
                      sets: [
                        buildSet({ id: 999, order: 0, isDropSet: false }),
                        buildSet({ order: 1, isDropSet: true, parentSetId: 999 }),
                      ],
                    }),
                  ],
                },
              ],
            },
          ],
        },
      ],
      { actorIsAssignedCoach: false },
    );

    // Both phases of createManyAndReturn fire (regular, drop)
    expect(mocks.exerciseSet.createManyAndReturn).toHaveBeenCalledTimes(2);
    const dropCall = mocks.exerciseSet.createManyAndReturn.mock.calls[1][0];
    expect(dropCall.data[0].isDropSet).toBe(true);
    // The drop set's parentSetId should be the new regular set's id
    // (not the request-side 999). Mock assigns ids starting at 1001.
    expect(dropCall.data[0].parentSetId).toBeGreaterThan(1000);
    expect(dropCall.data[0].parentSetId).not.toBe(999);
  });

  it('does not propagate requiresRecording when actor is not the assigned coach', async () => {
    const { tx, mocks } = createTx([]);

    await syncPlanTree(
      tx,
      'user-1',
      [
        {
          order: 0,
          name: 'Plan A',
          weeks: [
            {
              order: 0,
              workouts: [
                {
                  name: 'Push',
                  order: 0,
                  exercises: [buildExercise({ requiresRecording: true })],
                },
              ],
            },
          ],
        },
      ],
      { actorIsAssignedCoach: false }, // not the coach → must be coerced to false
    );

    const createCall = mocks.workoutExercise.create.mock.calls[0][0];
    expect(createCall.data.requiresRecording).toBe(false);
  });
});
