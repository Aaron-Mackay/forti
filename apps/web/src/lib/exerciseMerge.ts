import type { ExerciseCategory } from '@/generated/prisma/browser'

type ExerciseRecord = {
  id: number
  name: string
  category: ExerciseCategory | null
}

type UserExerciseNoteRecord = {
  id: number
  userId: string
  exerciseId: number
  note: string
}

type CoachExerciseNoteRecord = {
  id: number
  coachId: string
  exerciseId: number
  note: string
  url: string | null
}

type ExerciseMergeTx = {
  exercise: {
    findMany: (args: {
      where: { id: { in: number[] } }
      select: { id: true; name: true; category: true }
    }) => Promise<ExerciseRecord[]>
    delete: (args: { where: { id: number } }) => Promise<unknown>
  }
  workoutExercise: {
    count: (args: { where: { exerciseId?: number; substitutedForId?: number } }) => Promise<number>
    updateMany: (args: {
      where: { exerciseId?: number; substitutedForId?: number }
      data: { exerciseId?: number; substitutedForId?: number | null }
    }) => Promise<{ count: number }>
  }
  userExerciseNote: {
    findMany: (args: { where: { exerciseId: { in: number[] } } }) => Promise<UserExerciseNoteRecord[]>
    update: (args: { where: { id: number }; data: { exerciseId?: number; note?: string } }) => Promise<unknown>
    delete: (args: { where: { id: number } }) => Promise<unknown>
  }
  coachExerciseNote: {
    findMany: (args: { where: { exerciseId: { in: number[] } } }) => Promise<CoachExerciseNoteRecord[]>
    update: (args: { where: { id: number }; data: { exerciseId?: number; note?: string; url?: string | null } }) => Promise<unknown>
    delete: (args: { where: { id: number } }) => Promise<unknown>
  }
}

type ExerciseMergeDb = ExerciseMergeTx & {
  $transaction: <T>(fn: (tx: ExerciseMergeTx) => Promise<T>) => Promise<T>
}

export type MergeExercisesOptions = {
  dryRun?: boolean
  allowCategoryMismatch?: boolean
}

export type MergeExercisesSummary = {
  dryRun: boolean
  sourceExercise: ExerciseRecord
  targetExercise: ExerciseRecord
  counts: {
    movedWorkoutExercises: number
    updatedSubstitutionRefs: number
    movedUserExerciseNotes: number
    mergedUserExerciseNotes: number
    movedCoachExerciseNotes: number
    mergedCoachExerciseNotes: number
  }
}

function appendMergedText(targetText: string, sourceText: string, sourceName: string) {
  const trimmedTarget = targetText.trim()
  const trimmedSource = sourceText.trim()

  if (trimmedSource.length === 0) return targetText
  if (trimmedTarget.length === 0) return sourceText
  if (trimmedTarget === trimmedSource) return targetText

  return `${trimmedTarget}\n\n--- merged from duplicate exercise: ${sourceName} ---\n\n${trimmedSource}`
}

async function getMergeSummary(tx: ExerciseMergeTx, sourceExerciseId: number, targetExerciseId: number): Promise<MergeExercisesSummary> {
  const exercises = await tx.exercise.findMany({
    where: { id: { in: [sourceExerciseId, targetExerciseId] } },
    select: { id: true, name: true, category: true },
  })

  const sourceExercise = exercises.find((exercise) => exercise.id === sourceExerciseId)
  const targetExercise = exercises.find((exercise) => exercise.id === targetExerciseId)

  if (!sourceExercise) throw new Error(`Source exercise ${sourceExerciseId} not found`)
  if (!targetExercise) throw new Error(`Target exercise ${targetExerciseId} not found`)

  const [movedWorkoutExercises, updatedSubstitutionRefs, notes, coachNotes] = await Promise.all([
    tx.workoutExercise.count({ where: { exerciseId: sourceExerciseId } }),
    tx.workoutExercise.count({ where: { substitutedForId: sourceExerciseId } }),
    tx.userExerciseNote.findMany({ where: { exerciseId: { in: [sourceExerciseId, targetExerciseId] } } }),
    tx.coachExerciseNote.findMany({ where: { exerciseId: { in: [sourceExerciseId, targetExerciseId] } } }),
  ])

  const sourceNotes = notes.filter((note) => note.exerciseId === sourceExerciseId)
  const targetNotesByUser = new Map(
    notes
      .filter((note) => note.exerciseId === targetExerciseId)
      .map((note) => [note.userId, note]),
  )
  const mergedUserExerciseNotes = sourceNotes.filter((note) => targetNotesByUser.has(note.userId)).length
  const movedUserExerciseNotes = sourceNotes.length - mergedUserExerciseNotes

  const sourceCoachNotes = coachNotes.filter((note) => note.exerciseId === sourceExerciseId)
  const targetCoachNotesByCoach = new Map(
    coachNotes
      .filter((note) => note.exerciseId === targetExerciseId)
      .map((note) => [note.coachId, note]),
  )
  const mergedCoachExerciseNotes = sourceCoachNotes.filter((note) => targetCoachNotesByCoach.has(note.coachId)).length
  const movedCoachExerciseNotes = sourceCoachNotes.length - mergedCoachExerciseNotes

  return {
    dryRun: false,
    sourceExercise,
    targetExercise,
    counts: {
      movedWorkoutExercises,
      updatedSubstitutionRefs,
      movedUserExerciseNotes,
      mergedUserExerciseNotes,
      movedCoachExerciseNotes,
      mergedCoachExerciseNotes,
    },
  }
}

async function mergeUserExerciseNotes(tx: ExerciseMergeTx, sourceExerciseId: number, targetExerciseId: number, sourceName: string) {
  const notes = await tx.userExerciseNote.findMany({
    where: { exerciseId: { in: [sourceExerciseId, targetExerciseId] } },
  })

  const targetNotesByUser = new Map(
    notes
      .filter((note) => note.exerciseId === targetExerciseId)
      .map((note) => [note.userId, note]),
  )

  for (const sourceNote of notes.filter((note) => note.exerciseId === sourceExerciseId)) {
    const targetNote = targetNotesByUser.get(sourceNote.userId)
    if (targetNote) {
      await tx.userExerciseNote.update({
        where: { id: targetNote.id },
        data: { note: appendMergedText(targetNote.note, sourceNote.note, sourceName) },
      })
      await tx.userExerciseNote.delete({ where: { id: sourceNote.id } })
      continue
    }

    await tx.userExerciseNote.update({
      where: { id: sourceNote.id },
      data: { exerciseId: targetExerciseId },
    })
  }
}

async function mergeCoachExerciseNotes(tx: ExerciseMergeTx, sourceExerciseId: number, targetExerciseId: number, sourceName: string) {
  const coachNotes = await tx.coachExerciseNote.findMany({
    where: { exerciseId: { in: [sourceExerciseId, targetExerciseId] } },
  })

  const targetCoachNotesByCoach = new Map(
    coachNotes
      .filter((note) => note.exerciseId === targetExerciseId)
      .map((note) => [note.coachId, note]),
  )

  for (const sourceCoachNote of coachNotes.filter((note) => note.exerciseId === sourceExerciseId)) {
    const targetCoachNote = targetCoachNotesByCoach.get(sourceCoachNote.coachId)
    if (targetCoachNote) {
      await tx.coachExerciseNote.update({
        where: { id: targetCoachNote.id },
        data: {
          note: appendMergedText(targetCoachNote.note, sourceCoachNote.note, sourceName),
          url: targetCoachNote.url ?? sourceCoachNote.url,
        },
      })
      await tx.coachExerciseNote.delete({ where: { id: sourceCoachNote.id } })
      continue
    }

    await tx.coachExerciseNote.update({
      where: { id: sourceCoachNote.id },
      data: { exerciseId: targetExerciseId },
    })
  }
}

export async function mergeExercises(
  db: ExerciseMergeDb,
  sourceExerciseId: number,
  targetExerciseId: number,
  options: MergeExercisesOptions = {},
): Promise<MergeExercisesSummary> {
  if (sourceExerciseId === targetExerciseId) {
    throw new Error('Source and target exercises must be different')
  }

  const summary = await getMergeSummary(db, sourceExerciseId, targetExerciseId)

  if (
    !options.allowCategoryMismatch &&
    summary.sourceExercise.category !== summary.targetExercise.category
  ) {
    throw new Error(
      `Category mismatch: ${summary.sourceExercise.category ?? 'null'} -> ${summary.targetExercise.category ?? 'null'}`,
    )
  }

  if (options.dryRun ?? false) {
    return { ...summary, dryRun: true }
  }

  await db.$transaction(async (tx) => {
    await mergeUserExerciseNotes(tx, sourceExerciseId, targetExerciseId, summary.sourceExercise.name)
    await mergeCoachExerciseNotes(tx, sourceExerciseId, targetExerciseId, summary.sourceExercise.name)

    await tx.workoutExercise.updateMany({
      where: { exerciseId: sourceExerciseId },
      data: { exerciseId: targetExerciseId },
    })

    await tx.workoutExercise.updateMany({
      where: { substitutedForId: sourceExerciseId },
      data: { substitutedForId: targetExerciseId },
    })

    await tx.workoutExercise.updateMany({
      where: { exerciseId: targetExerciseId, substitutedForId: targetExerciseId },
      data: { substitutedForId: null },
    })

    await tx.exercise.delete({ where: { id: sourceExerciseId } })
  })

  return summary
}
