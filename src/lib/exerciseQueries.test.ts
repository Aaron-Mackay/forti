import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExerciseCategory } from '@/generated/prisma/browser';

vi.mock('@/lib/prisma', () => ({ default: {} }));

vi.mock('@lib/exerciseQueries', async (importOriginal) => {
  return importOriginal();
});

import { findOrCreateExercise } from '@lib/exerciseQueries';

// Minimal Prisma transaction client mock
function makeTx(overrides: {
  findFirst?: ReturnType<typeof vi.fn>;
  create?: ReturnType<typeof vi.fn>;
}) {
  return {
    exercise: {
      findFirst: overrides.findFirst ?? vi.fn().mockResolvedValue(null),
      create: overrides.create ?? vi.fn().mockResolvedValue({ id: 99 }),
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const CATEGORY: ExerciseCategory = 'resistance';
const USER_ID = 'user-1';
const NAME = 'Pin-Loaded Seated Chest Press';

describe('findOrCreateExercise', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user-private exercise when found, without calling create', async () => {
    const findFirst = vi.fn().mockResolvedValueOnce({ id: 1 }); // user-owned found
    const create = vi.fn();
    const tx = makeTx({ findFirst, create });

    const result = await findOrCreateExercise(tx, NAME, CATEGORY, USER_ID);

    expect(result).toEqual({ id: 1 });
    expect(create).not.toHaveBeenCalled();
  });

  it('returns global exercise when no user-private match exists', async () => {
    const findFirst = vi.fn()
      .mockResolvedValueOnce(null)       // user-owned: not found
      .mockResolvedValueOnce({ id: 42 }); // global: found
    const create = vi.fn();
    const tx = makeTx({ findFirst, create });

    const result = await findOrCreateExercise(tx, NAME, CATEGORY, USER_ID);

    expect(result).toEqual({ id: 42 });
    expect(create).not.toHaveBeenCalled();
  });

  it('creates a user-private exercise when neither user-owned nor global exists', async () => {
    const findFirst = vi.fn().mockResolvedValue(null); // both lookups miss
    const create = vi.fn().mockResolvedValue({ id: 99 });
    const tx = makeTx({ findFirst, create });

    const result = await findOrCreateExercise(tx, NAME, CATEGORY, USER_ID);

    expect(result).toEqual({ id: 99 });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: NAME, createdByUserId: USER_ID }),
      }),
    );
  });

  it('stores enrichment data when creating a new exercise', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue({ id: 99 });
    const tx = makeTx({ findFirst, create });

    await findOrCreateExercise(tx, NAME, CATEGORY, USER_ID, {
      primaryMuscles: ['Pectoralis Major'],
      secondaryMuscles: ['Anterior Deltoid'],
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          primaryMuscles: ['Pectoralis Major'],
          secondaryMuscles: ['Anterior Deltoid'],
        }),
      }),
    );
  });

  it('prefers user-private over global when both have the same name+category', async () => {
    // First call (user-owned) returns a result — global should never be queried
    const findFirst = vi.fn().mockResolvedValueOnce({ id: 7 });
    const tx = makeTx({ findFirst });

    const result = await findOrCreateExercise(tx, NAME, CATEGORY, USER_ID);

    expect(result).toEqual({ id: 7 });
    // findFirst was called exactly once (user-owned check only)
    expect(findFirst).toHaveBeenCalledTimes(1);
  });
});
