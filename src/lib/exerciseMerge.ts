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

type CoachExerciseDescriptionRecord = {
  id: number
  coachId: string
  exerciseId: number
  description: string
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
  coachExerciseDescription: {
    findMany: (args: { where: { exerciseId: { in: number[] } } }) => Promise<CoachExerciseDescriptionRecord[]>
    update: (args: { where: { id: number }; data: { exerciseId?: number; description?: string } }) => Promise<unknown>
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
    movedCoachExerciseDescriptions: number
    mergedCoachExerciseDescriptions: number
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

  const [movedWorkoutExercises, updatedSubstitutionRefs, notes, descriptions] = await Promise.all([
    tx.workoutExercise.count({ where: { exerciseId: sourceExerciseId } }),
    tx.workoutExercise.count({ where: { substitutedForId: sourceExerciseId } }),
    tx.userExerciseNote.findMany({ where: { exerciseId: { in: [sourceExerciseId, targetExerciseId] } } }),
    tx.coachExerciseDescription.findMany({ where: { exerciseId: { in: [sourceExerciseId, targetExerciseId] } } }),
  ])

  const sourceNotes = notes.filter((note) => note.exerciseId === sourceExerciseId)
  const targetNotesByUser = new Map(
    notes
      .filter((note) => note.exerciseId === targetExerciseId)
      .map((note) => [note.userId, note]),
  )
  const mergedUserExerciseNotes = sourceNotes.filter((note) => targetNotesByUser.has(note.userId)).length
  const movedUserExerciseNotes = sourceNotes.length - mergedUserExerciseNotes

  const sourceDescriptions = descriptions.filter((description) => description.exerciseId === sourceExerciseId)
  const targetDescriptionsByCoach = new Map(
    descriptions
      .filter((description) => description.exerciseId === targetExerciseId)
      .map((description) => [description.coachId, description]),
  )
  const mergedCoachExerciseDescriptions = sourceDescriptions.filter((description) => targetDescriptionsByCoach.has(description.coachId)).length
  const movedCoachExerciseDescriptions = sourceDescriptions.length - mergedCoachExerciseDescriptions

  return {
    dryRun: false,
    sourceExercise,
    targetExercise,
    counts: {
      movedWorkoutExercises,
      updatedSubstitutionRefs,
      movedUserExerciseNotes,
      mergedUserExerciseNotes,
      movedCoachExerciseDescriptions,
      mergedCoachExerciseDescriptions,
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

async function mergeCoachExerciseDescriptions(tx: ExerciseMergeTx, sourceExerciseId: number, targetExerciseId: number, sourceName: string) {
  const descriptions = await tx.coachExerciseDescription.findMany({
    where: { exerciseId: { in: [sourceExerciseId, targetExerciseId] } },
  })

  const targetDescriptionsByCoach = new Map(
    descriptions
      .filter((description) => description.exerciseId === targetExerciseId)
      .map((description) => [description.coachId, description]),
  )

  for (const sourceDescription of descriptions.filter((description) => description.exerciseId === sourceExerciseId)) {
    const targetDescription = targetDescriptionsByCoach.get(sourceDescription.coachId)
    if (targetDescription) {
      await tx.coachExerciseDescription.update({
        where: { id: targetDescription.id },
        data: { description: appendMergedText(targetDescription.description, sourceDescription.description, sourceName) },
      })
      await tx.coachExerciseDescription.delete({ where: { id: sourceDescription.id } })
      continue
    }

    await tx.coachExerciseDescription.update({
      where: { id: sourceDescription.id },
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
    await mergeCoachExerciseDescriptions(tx, sourceExerciseId, targetExerciseId, summary.sourceExercise.name)

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
