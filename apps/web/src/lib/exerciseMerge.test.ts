import { describe, expect, it, vi } from 'vitest'
import { mergeExercises } from '@/lib/exerciseMerge'

function makeDb() {
  const exercise = {
    findMany: vi.fn(),
    delete: vi.fn(),
  }
  const workoutExercise = {
    count: vi.fn(),
    updateMany: vi.fn(),
  }
  const userExerciseNote = {
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  const coachExerciseNote = {
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }

  const tx = {
    exercise,
    workoutExercise,
    userExerciseNote,
    coachExerciseNote,
  }

  return {
    ...tx,
    // Cast needed: vi.fn() wrapper loses the generic, but the runtime behaviour is correct
    $transaction: vi.fn(async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx)) as unknown as <T>(fn: (arg: typeof tx) => Promise<T>) => Promise<T>,
  }
}

describe('mergeExercises', () => {
  it('returns a dry-run summary without mutating data', async () => {
    const db = makeDb()
    db.exercise.findMany.mockResolvedValue([
      { id: 1, name: 'OHP', category: 'resistance' },
      { id: 2, name: 'Overhead Press', category: 'resistance' },
    ])
    db.workoutExercise.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1)
    db.userExerciseNote.findMany.mockResolvedValue([
      { id: 10, userId: 'u1', exerciseId: 1, note: 'old' },
      { id: 11, userId: 'u1', exerciseId: 2, note: 'new' },
      { id: 12, userId: 'u2', exerciseId: 1, note: 'solo' },
    ])
    db.coachExerciseNote.findMany.mockResolvedValue([
      { id: 20, coachId: 'c1', exerciseId: 1, note: 'source', url: null },
      { id: 21, coachId: 'c1', exerciseId: 2, note: 'target', url: null },
      { id: 22, coachId: 'c2', exerciseId: 1, note: 'solo', url: null },
    ])

    const result = await mergeExercises(db, 1, 2, { dryRun: true })

    expect(result).toEqual({
      dryRun: true,
      sourceExercise: { id: 1, name: 'OHP', category: 'resistance' },
      targetExercise: { id: 2, name: 'Overhead Press', category: 'resistance' },
      counts: {
        movedWorkoutExercises: 4,
        updatedSubstitutionRefs: 1,
        movedUserExerciseNotes: 1,
        mergedUserExerciseNotes: 1,
        movedCoachExerciseNotes: 1,
        mergedCoachExerciseNotes: 1,
      },
    })
    expect(db.$transaction).not.toHaveBeenCalled()
    expect(db.userExerciseNote.update).not.toHaveBeenCalled()
  })

  it('moves workout references and appends colliding note text on apply', async () => {
    const db = makeDb()
    db.exercise.findMany.mockResolvedValue([
      { id: 1, name: 'OHP', category: 'resistance' },
      { id: 2, name: 'Overhead Press', category: 'resistance' },
    ])
    db.workoutExercise.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
    db.userExerciseNote.findMany
      .mockResolvedValueOnce([
        { id: 10, userId: 'u1', exerciseId: 1, note: 'Source note' },
        { id: 11, userId: 'u1', exerciseId: 2, note: 'Target note' },
        { id: 12, userId: 'u2', exerciseId: 1, note: 'Only source note' },
      ])
      .mockResolvedValueOnce([
        { id: 10, userId: 'u1', exerciseId: 1, note: 'Source note' },
        { id: 11, userId: 'u1', exerciseId: 2, note: 'Target note' },
        { id: 12, userId: 'u2', exerciseId: 1, note: 'Only source note' },
      ])
    db.coachExerciseNote.findMany
      .mockResolvedValueOnce([
        { id: 20, coachId: 'c1', exerciseId: 1, note: 'Source description', url: 'https://source.example' },
        { id: 21, coachId: 'c1', exerciseId: 2, note: 'Target description', url: null },
      ])
      .mockResolvedValueOnce([
        { id: 20, coachId: 'c1', exerciseId: 1, note: 'Source description', url: 'https://source.example' },
        { id: 21, coachId: 'c1', exerciseId: 2, note: 'Target description', url: null },
      ])

    await mergeExercises(db, 1, 2)

    expect(db.$transaction).toHaveBeenCalledTimes(1)
    expect(db.userExerciseNote.update).toHaveBeenCalledWith({
      where: { id: 11 },
      data: { note: 'Target note\n\n--- merged from duplicate exercise: OHP ---\n\nSource note' },
    })
    expect(db.userExerciseNote.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: { exerciseId: 2 },
    })
    expect(db.userExerciseNote.delete).toHaveBeenCalledWith({ where: { id: 10 } })

    expect(db.coachExerciseNote.update).toHaveBeenCalledWith({
      where: { id: 21 },
      data: {
        note: 'Target description\n\n--- merged from duplicate exercise: OHP ---\n\nSource description',
        url: 'https://source.example',
      },
    })
    expect(db.coachExerciseNote.delete).toHaveBeenCalledWith({ where: { id: 20 } })

    expect(db.workoutExercise.updateMany).toHaveBeenCalledWith({
      where: { exerciseId: 1 },
      data: { exerciseId: 2 },
    })
    expect(db.workoutExercise.updateMany).toHaveBeenCalledWith({
      where: { substitutedForId: 1 },
      data: { substitutedForId: 2 },
    })
    expect(db.workoutExercise.updateMany).toHaveBeenCalledWith({
      where: { exerciseId: 2, substitutedForId: 2 },
      data: { substitutedForId: null },
    })
    expect(db.exercise.delete).toHaveBeenCalledWith({ where: { id: 1 } })
  })

  it('rejects category mismatches unless explicitly allowed', async () => {
    const db = makeDb()
    db.exercise.findMany.mockResolvedValue([
      { id: 1, name: 'Jogging', category: 'cardio' },
      { id: 2, name: 'Overhead Press', category: 'resistance' },
    ])
    db.workoutExercise.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
    db.userExerciseNote.findMany.mockResolvedValue([])
    db.coachExerciseNote.findMany.mockResolvedValue([])

    await expect(mergeExercises(db, 1, 2)).rejects.toThrow(
      'Category mismatch: cardio -> resistance',
    )
  })
})
